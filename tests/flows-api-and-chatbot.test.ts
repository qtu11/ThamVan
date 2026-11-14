import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mockEnv = vi.hoisted(() => ({
  viewer: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
  insertReport: vi.fn(),
  updateProgress: vi.fn(),
  upsertChallenge: vi.fn(),
  ownsExperience: vi.fn(),
}));
vi.mock('@/lib/data', async () => {
  const { catalog } = await import('@/data/catalog');
  return {
    getCatalog: async () => catalog,
    getHcmPlacesData: async () => catalog,
    getViewer: mockEnv.viewer,
  };
});
vi.mock('@/lib/supabase/server', () => ({
  supabase: async () => ({ rpc: mockEnv.userRpc }),
  supabaseAdmin: () => ({
    rpc: mockEnv.adminRpc,
    from: (table: string) => {
      if (table === 'content_reports') {
        return { insert: mockEnv.insertReport };
      }
      if (table === 'challenges') {
        return { upsert: mockEnv.upsertChallenge };
      }
      if (table === 'challenge_progress') {
        const chain = {
          eq: () => chain,
          is: () => mockEnv.updateProgress(),
        };
        return { update: () => chain };
      }
      return {};
    },
  }),
}));
vi.mock('@/lib/commerce', () => ({
  ownsExperience: mockEnv.ownsExperience,
}));
import { parseJsonResponse, providerThinkingOptions } from '@/lib/vision';
import { validateItinerary } from '@/lib/itinerary';
import { answerAssistantQuery } from '@/lib/chatbot-knowledge';
import { GET as routeGet } from '@/app/api/route/route';
import { GET as tilesGet } from '@/app/api/tiles/route';
import { GET as assistantGet } from '@/app/api/assistant/route';
import { POST as reportsPost } from '@/app/api/reports/route';
import { POST as challengesPost } from '@/app/api/challenges/route';
import { GET as downloadGet } from '@/app/api/experiences/[slug]/download/route';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  mockEnv.viewer.mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000099',
    acceptedTerms: true,
    admin: false,
  });
  mockEnv.userRpc.mockReset();
  mockEnv.adminRpc.mockReset();
  mockEnv.insertReport.mockReset();
  mockEnv.updateProgress.mockReset();
  mockEnv.upsertChallenge.mockReset();
  mockEnv.ownsExperience.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('vision helpers', () => {
  it('enables non-thinking mode only for TheHive or DeepSeek models', () => {
    expect(
      providerThinkingOptions(
        new URL('https://api.thehive.ai/api/v3/chat/completions'),
        'deepseek-ai/deepseek-v4.1-flash-1017',
      ),
    ).toEqual({ chat_template_kwargs: { thinking: false } });

    expect(
      providerThinkingOptions(new URL('https://api.openai.com/v1/chat/completions'), 'gpt-4o-mini'),
    ).toEqual({});
  });

  it('parses fenced or prose-wrapped JSON cleanly', () => {
    expect(parseJsonResponse('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(parseJsonResponse('Here is the JSON:\n{"title":"Saigon","count":2}\nDone.')).toEqual({
      title: 'Saigon',
      count: 2,
    });
    expect(() => parseJsonResponse('no json at all')).toThrow();
  });
});

describe('itinerary validation contract', () => {
  it('enforces day elapsed span against hours limit', () => {
    const slugs = new Set(['a', 'b', 'c']);
    expect(() =>
      validateItinerary(
        {
          title: 'Too long day',
          days: [
            {
              day: 1,
              stops: [
                { slug: 'a', time: '09:00', minutes: 60, reason: 'First heritage stop' },
                { slug: 'b', time: '14:30', minutes: 60, reason: 'Afternoon stop past 6h' },
              ],
            },
          ],
        },
        slugs,
        1,
        6,
      ),
    ).toThrow('DAY_TOO_LONG');

    const valid = validateItinerary(
      {
        title: 'Balanced 6h day',
        days: [
          {
            day: 1,
            stops: [
              { slug: 'a', time: '09:00', minutes: 90, reason: 'Morning heritage stop' },
              { slug: 'b', time: '11:00', minutes: 90, reason: 'Late morning stop' },
              { slug: 'c', time: '13:30', minutes: 90, reason: 'Finishes at 15:00 within 6h' },
            ],
          },
        ],
      },
      slugs,
      1,
      6,
    );
    expect(valid.days[0].stops).toHaveLength(3);
  });
});

describe('route & tiles API hardening', () => {
  it('rejects out-of-range coordinates and calculates real Haversine fallback when OSRM fails', async () => {
    const bad = await routeGet(
      new Request('http://localhost:3000/api/route?fromLat=999&fromLon=106.7&toLat=10.78&toLon=106.7'),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'INVALID_COORDINATES' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const fallback = await routeGet(
      new Request(
        'http://localhost:3000/api/route?fromLat=10.7798&fromLon=106.6990&toLat=10.7530&toLon=106.6611',
      ),
    );
    expect(fallback.status).toBe(200);
    const data = await fallback.json();
    expect(data.source).toBe('direct_fallback');
    expect(data.distanceKm).toBeGreaterThan(4);
    expect(data.durationMinutes).toBeGreaterThan(5);
    expect(data.coordinates).toHaveLength(2);
  });

  it('rejects invalid tile layers, traversal params, and HTML upstream error payloads', async () => {
    const traversal = await tilesGet(
      new Request('http://localhost:3000/api/tiles?layer=esriStreet&z=12/..&x=1&y=1'),
    );
    expect(traversal.status).toBe(400);

    const badLayer = await tilesGet(
      new Request('http://localhost:3000/api/tiles?layer=arbitrary&z=12&x=1&y=1'),
    );
    expect(badLayer.status).toBe(400);

    const outOfRange = await tilesGet(
      new Request('http://localhost:3000/api/tiles?layer=esriStreet&z=2&x=99&y=1'),
    );
    expect(outOfRange.status).toBe(400);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>bad upstream</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );
    const htmlTile = await tilesGet(
      new Request('http://localhost:3000/api/tiles?layer=esriStreet&z=14&x=13049&y=7703'),
    );
    expect(htmlTile.status).toBe(200);
    expect(htmlTile.headers.get('Content-Type')).toBe('image/png');
    expect(htmlTile.headers.get('X-Tile-Cache')).toBeNull();
  });
});

describe('heritage chatbot knowledge & assistant endpoint', () => {
  it('matches Vietnamese queries without diacritics and returns clickable links', () => {
    const placeReply = answerAssistantQuery('chua ba thien hau o dau?', 'vi');
    expect(placeReply.places[0]?.slug).toBe('hcm-0002');
    expect(placeReply.places[0]?.href).toBe('/vi/explore/hcm-0002');
    expect(placeReply.places[0]?.mapHref).toBe('/vi/map?focus=hcm-0002');
    expect(placeReply.followUps.length).toBeGreaterThan(0);

    const topicReply = answerAssistantQuery('gioi han 5 thu thach moi ngay', 'vi');
    expect(topicReply.topicId).toBe('challenges-passport');
    expect(topicReply.links.some((l) => l.href === '/vi/challenges')).toBe(true);

    const enReply = answerAssistantQuery('How does Story Walk work?', 'en');
    expect(enReply.topicId).toBe('story-walks');
    expect(enReply.links.some((l) => l.href.includes('/en/experiences/'))).toBe(true);

    const zhReply = answerAssistantQuery('天后宫在哪里', 'zh');
    expect(zhReply.places[0]?.slug).toBe('hcm-0002');
  });

  it('serves live catalog search from /api/assistant and validates empty input', async () => {
    const empty = await assistantGet(new Request('http://localhost:3000/api/assistant?locale=vi'));
    expect(empty.status).toBe(400);

    const res = await assistantGet(
      new Request(
        `http://localhost:3000/api/assistant?locale=vi&q=${encodeURIComponent('Bưu điện Trung tâm')}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places.some((p: { slug: string }) => p.slug === 'hcm-0051')).toBe(true);
  });
});

describe('reports & challenges security hardening', () => {
  it('accepts HCM-* catalog IDs in /api/reports with quota check and stores null entry_id safely', async () => {
    mockEnv.adminRpc.mockResolvedValue({ data: true, error: null });
    mockEnv.insertReport.mockResolvedValue({ error: null });

    const hcmRes = await reportsPost(
      new Request('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          entry_id: 'HCM-0002',
          reason: 'Cập nhật lại giờ mở cửa cuối tuần của Hội quán.',
        }),
      }),
    );
    expect(hcmRes.status).toBe(200);
    expect(mockEnv.adminRpc).toHaveBeenCalledWith('consume_workspace_quota', {
      p_user: '00000000-0000-4000-8000-000000000099',
      p_bucket: 'report',
      p_limit: 5,
      p_seconds: 3600,
    });
    expect(mockEnv.insertReport).toHaveBeenCalledWith(
      expect.objectContaining({
        entry_id: null,
        reason: expect.stringContaining('[HCM-0002 · hcm-0002]'),
      }),
    );

    const missingHcm = await reportsPost(
      new Request('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          entry_id: 'HCM-DOES-NOT-EXIST',
          reason: 'Địa điểm không tồn tại trong danh bạ.',
        }),
      }),
    );
    expect(missingHcm.status).toBe(404);
  });

  it('rejects wrong answer=0 on starter challenge and verifies non-zero answer server-side', async () => {
    mockEnv.userRpc.mockResolvedValue({ data: { correct: false }, error: null });
    const wrongRes = await challengesPost(
      new Request('http://localhost:3000/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          challenge_id: '10000000-0000-4000-8000-000000000001',
          answer: 0,
        }),
      }),
    );
    expect(wrongRes.status).toBe(200);
    expect(await wrongRes.json()).toEqual({ correct: false });
    expect(mockEnv.userRpc).toHaveBeenCalledWith('complete_challenge', {
      p_challenge_id: '10000000-0000-4000-8000-000000000001',
      p_answer: -1,
    });
    expect(mockEnv.updateProgress).not.toHaveBeenCalled();

    mockEnv.updateProgress.mockResolvedValue({ error: null });
    const rightRes = await challengesPost(
      new Request('http://localhost:3000/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({
          challenge_id: '10000000-0000-4000-8000-000000000001',
          answer: 1,
        }),
      }),
    );
    expect(rightRes.status).toBe(200);
    expect(await rightRes.json()).toEqual({ correct: true, points: 20, already_completed: false });
    expect(mockEnv.updateProgress).toHaveBeenCalledTimes(1);
  });

  it('serves localized Vietnamese disclaimer on story walk download', async () => {
    mockEnv.ownsExperience.mockResolvedValue(true);
    const res = await downloadGet(
      new Request('http://localhost:3000/api/experiences/sai-gon-ben-song/download?locale=vi'),
      { params: Promise.resolve({ slug: 'sai-gon-ben-song' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Hướng dẫn số tự khám phá.');
    expect(body).not.toContain('Self-guided digital guide.');
  });
});
