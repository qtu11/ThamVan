import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({ viewer: vi.fn(), rpc: vi.fn(), catalog: vi.fn() }));
vi.mock('@/lib/data', () => ({ getViewer: fake.viewer, getCatalog: fake.catalog }));
vi.mock('@/lib/supabase/server', () => ({ supabase: async () => ({ rpc: fake.rpc }) }));
import { catalog } from '@/data/catalog';
import { POST } from '@/app/api/recognize/route';
import { GET as locate } from '@/app/api/locate/route';
const target = { ...catalog[0], id: 'HCM-TARGET', name: 'Bảo tàng Hoa Văn', latitude: 10.78, longitude: 106.7 };
const clues = { observation: 'Biển tên', visibleText: ['Bao tang Hoa Van'], searchHints: [] };
const grounded = { observation: 'Cổng có mái ngói', candidates: [{ id: target.id, reason: 'Đọc được biển', evidence: ['Biển Hoa Văn'] }],
  objects: [{ name: 'Cổng', description: 'Mái ngói đỏ', culturalContext: null, placeId: target.id }], limitations: ['Chưa xác minh cổng vào'] };
const provider = (result: unknown) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
let image: Buffer;
const fetchMock = vi.fn();
async function request(options: { location?: unknown; locationConsent?: boolean; consent?: boolean; origin?: string; bytes?: Uint8Array } = {}) {
  const form = new FormData();
  form.set('image', new File([new Uint8Array(options.bytes || image)], 'ignored-name.jpg', { type: 'image/jpeg' }));
  form.set('locale', 'vi'); form.set('consent', String(options.consent ?? true));
  if (options.location !== undefined) form.set('location', JSON.stringify(options.location));
  if (options.locationConsent) form.set('locationConsent', 'true');
  return new Request('http://localhost:3000/api/recognize', { method: 'POST', headers: { Origin: options.origin || 'http://localhost:3000' }, body: form });
}
beforeEach(async () => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test', VISION_API_KEY: 'private-vision-key', VISION_MODEL: 'vision-test',
    VISION_API_URL: 'https://provider.test/v1/chat/completions', VISION_PROMPT_FILE: 'prompts/recognition.md', VISION_SYSTEM_PROMPT: 'Operator-specific instruction',
    VISION_TOKEN_PARAMETER: 'max_completion_tokens', VISION_MAX_OUTPUT_TOKENS: '3000' })) vi.stubEnv(key, value);
  fake.viewer.mockResolvedValue({ id: 'user', acceptedTerms: true });
  fake.catalog.mockResolvedValue([...Array.from({ length: 150 }, (_, index) => ({ ...catalog[0], id: `other-${index}`, name: `Other ${index}` })), target]);
  fake.rpc.mockResolvedValue({ data: true, error: null });
  fetchMock.mockReset().mockResolvedValueOnce(provider(clues)).mockResolvedValueOnce(provider(grounded));
  vi.stubGlobal('fetch', fetchMock);
  image = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).jpeg().toBuffer();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('runs normalization, quota, visual retrieval and grounded analysis, returning sources and distance', async () => {
  const response = await POST(await request({ location: { source: 'device', latitude: 10.78, longitude: 106.7, accuracy: 15, timestamp: Date.now() }, locationConsent: true }));
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const data = await response.json();
  expect(data.assessment).toBe('nearby_match');
  expect(data.candidates[0].entry.sources).toEqual(target.sources);
  expect(data.candidates[0].distanceMeters).toBe(0);
  expect(fake.rpc).toHaveBeenCalledExactlyOnceWith('consume_recognition_quota');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const second = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(second.messages[0].content).toContain('Operator-specific instruction');
  expect(second.messages[1].content[0].text).toContain(target.id);
  expect(second.messages[1].content[0].text).not.toContain('106.7');
  expect(second).toHaveProperty('max_completion_tokens', 3000);
});
it('works without location and never falls back to IP coordinates', async () => {
  const response = await POST(await request());
  expect((await response.json()).assessment).toBe('visual_only');
  const legacy = locate();
  expect(legacy.status).toBe(410);
  expect((await legacy.json()).latitude).toBeNull();
});
it('blocks unauthenticated, cross-site, missing consent, stale GPS and malformed images before paid calls', async () => {
  expect((await POST(await request({ origin: 'https://evil.test' }))).status).toBe(403);
  fake.viewer.mockResolvedValueOnce(null);
  expect((await POST(await request())).status).toBe(401);
  expect((await POST(await request({ consent: false }))).status).toBe(422);
  expect((await POST(await request({ location: { source: 'device', latitude: 10, longitude: 106, accuracy: 10, timestamp: Date.now() } }))).status).toBe(422);
  expect((await POST(await request({ locationConsent: true, location: { source: 'device', latitude: 10, longitude: 106, accuracy: 10, timestamp: 1 } }))).status).toBe(422);
  expect((await POST(await request({ bytes: new Uint8Array([255, 216, 255, 0]) }))).status).toBe(422);
  expect(fake.rpc).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
});
it('rejects missing/invalid configuration and exhausted quota without invoking the provider', async () => {
  vi.stubEnv('VISION_API_URL', 'http://provider.test');
  expect((await POST(await request())).status).toBe(503);
  vi.stubEnv('VISION_API_URL', 'https://provider.test');
  vi.stubEnv('VISION_PROMPT_FILE', 'prompts/missing.md');
  expect((await POST(await request())).status).toBe(503);
  vi.stubEnv('VISION_PROMPT_FILE', 'prompts/recognition.md');
  fake.rpc.mockResolvedValue({ data: false, error: null });
  expect((await POST(await request())).status).toBe(429);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('returns safe provider failures and rejects invalid/truncated output', async () => {
  fetchMock.mockReset().mockResolvedValueOnce(new Response('private-vision-key', { status: 401 }));
  let response = await POST(await request());
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'visionProviderError' });
  fetchMock.mockResolvedValueOnce(provider({ observation: 'missing fields' }));
  response = await POST(await request());
  expect(await response.json()).toEqual({ error: 'visionInvalidResponse' });
  fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(clues) } }] }));
  expect((await POST(await request())).status).toBe(502);
});
