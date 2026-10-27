import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { inside } from './lib/place-images.ts';

// Input is a curated list of source pages and image URLs found during web research.
// This command only stages candidates; it never writes into public/images.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = inside(root, 'asset/place-photo-research');
const manifest = process.argv[2];
if (!manifest)
  throw new Error(
    'Usage: node --experimental-strip-types scripts/stage-web-photos.mjs relative-manifest.json',
  );
const rows = JSON.parse(await fs.readFile(inside(root, manifest), 'utf8'));
const places = JSON.parse(
  await fs.readFile(inside(root, 'src/data/THAMVAN_HCM_V3/thamvan-places.json'), 'utf8'),
).places;
const file = inside(research, 'web-discovery.json');
const state = await fs.readFile(file, 'utf8').then(JSON.parse, () => ({ candidates: [] }));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function publicURL(value) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    !u.hostname.includes('.') ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)
  )
    throw new Error('Expected a public HTTPS image source');
  return u;
}
await fs.mkdir(inside(research, 'web-photos'), { recursive: true });
for (const row of rows) {
  const place = places.find((p) => p.id === row.id);
  if (!place) throw new Error(`Unknown place ID: ${row.id}`);
  publicURL(row.source);
  if (state.candidates.some((c) => c.id === row.id && c.url === row.url && c.image)) continue;
  const candidate = { ...row, name: place.name, checkedAt: new Date().toISOString() };
  try {
    let u = publicURL(row.url),
      response;
    for (let i = 0; i < 4; i++) {
      response = await fetch(u, {
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': 'ThamVanPhotoResearch/1.0 (local image review)',
          Accept: 'image/*',
        },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      u = publicURL(new URL(response.headers.get('location'), u).href);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 15000000) throw new Error('Image exceeds 15 MB');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    const meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    if (
      !['jpeg', 'png', 'webp', 'avif'].includes(meta.format) ||
      meta.width < 360 ||
      meta.height < 240
    )
      throw new Error('Image is too small or not a supported photo');
    const jpg = await sharp(bytes, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 87 })
      .toBuffer();
    candidate.sha256 = hash(jpg);
    candidate.image = `asset/place-photo-research/web-photos/${row.id.toLowerCase()}-${candidate.sha256.slice(0, 12)}.jpg`;
    await fs.writeFile(inside(root, candidate.image), jpg);
    candidate.status = 'STAGED_AWAITING_VISUAL_REVIEW';
  } catch (error) {
    candidate.status = 'SOURCE_UNAVAILABLE';
    candidate.error = error.message;
  }
  state.candidates = state.candidates.filter((c) => !(c.id === row.id && c.url === row.url));
  state.candidates.push(candidate);
  await fs.writeFile(file, JSON.stringify(state, null, 2) + '\n');
  console.log(`${row.id}: ${candidate.status}${candidate.error ? ` (${candidate.error})` : ''}`);
}
