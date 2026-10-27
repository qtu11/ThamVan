import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { inside, imageFile } from './lib/place-images.ts';
import {
  normalize,
  aliases,
  plain,
  matchPhoto,
  eligibleLicense,
  sourceFileTitle,
} from './lib/photo-discovery.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = inside(root, 'asset/place-photo-research');
const cacheDir = inside(research, 'cache');
const indexPath = inside(root, 'public/images/thamvan-image-index.json');
const imagesDir = inside(root, 'public/images');
const originals = inside(root, 'asset/places');
const args = process.argv.slice(2);
const maxArg = args.find((x) => x.startsWith('--limit='));
if (
  args.some(
    (x) =>
      x !== '--apply' &&
      x !== '--all' &&
      x !== '--retry-errors' &&
      x !== '--wikipedia-only' &&
      x !== '--wikidata-only' &&
      x !== '--sources-only' &&
      x !== '--refresh' &&
      !/^--sources-file=.+/.test(x) &&
      !/^--limit=\d+$/.test(x),
  )
)
  throw new Error('Use --all [--apply] or --limit=N [--apply]');
const apply = args.includes('--apply');
const limit = maxArg ? Number(maxArg.slice(8)) : 1505;
const checkpointPath = inside(research, 'discovery-state.json');
const userAgent = 'ThamVanHeritagePhotoImporter/4.0 (https://github.com/qtu11)';
const digest = (data) => createHash('sha256').update(data).digest('hex');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
await fs.mkdir(cacheDir, { recursive: true });
await fs.mkdir(originals, { recursive: true });
const { places } = JSON.parse(
  await fs.readFile(inside(root, 'src/data/THAMVAN_HCM_V3/thamvan-places.json'), 'utf8'),
);
const state = (await exists(checkpointPath))
  ? JSON.parse(await fs.readFile(checkpointPath, 'utf8'))
  : { version: 1, places: {}, providers: {} };
const exclusions = await fs
  .readFile(inside(research, 'photo-exclusions.json'), 'utf8')
  .then(JSON.parse, () => []);
const started = new Date().toISOString();
const runDir = inside(research, `runs/${started.replaceAll(/[:.]/g, '-')}`);
await fs.mkdir(runDir, { recursive: true });
await fs.copyFile(indexPath, inside(runDir, 'index-before.json'));
let currentIndex = JSON.parse(await fs.readFile(indexPath, 'utf8'));
const usedSources = new Set(
  currentIndex.filter((e) => e.image).map((e) => e.attribution?.source || e.source),
);
const usedHashes = new Set(currentIndex.filter((e) => e.image && e.sha256).map((e) => e.sha256));
const updates = new Map();
let requests = 0,
  downloaded = 0,
  discovered = 0;
let nextRequest = 0;
const blockedHosts = new Set();

async function replaceFile(temp, target) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await fs.rename(temp, target);
      return;
    } catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error;
      if (attempt === 1) {
        // Windows file watchers can hold a read handle without rename sharing.
        // Keep the complete .tmp journal for recovery if the process is interrupted.
        await fs.copyFile(temp, target);
        return;
      }
      await sleep(50);
    }
  }
}

async function checkpoint() {
  state.updatedAt = new Date().toISOString();
  state.lastRun = { started, requests, downloaded, discovered, apply };
  await fs.writeFile(checkpointPath + '.tmp', JSON.stringify(state, null, 2) + '\n');
  await replaceFile(checkpointPath + '.tmp', checkpointPath);
  if (apply && updates.size) {
    // Reload before committing so unrelated concurrent edits aren't replaced by an old snapshot.
    currentIndex = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    currentIndex = currentIndex.map((entry) => {
      const update = updates.get(entry.id);
      if (!update || (entry.image && update.image !== entry.image)) return entry;
      return { ...entry, ...update };
    });
    await fs.writeFile(indexPath + '.tmp', JSON.stringify(currentIndex, null, 2) + '\n');
    await replaceFile(indexPath + '.tmp', indexPath);
    updates.clear();
  }
}

async function request(url, { binary = false } = {}) {
  const u = new URL(url);
  if (
    u.protocol !== 'https:' ||
    ![
      'commons.wikimedia.org',
      'vi.wikipedia.org',
      'en.wikipedia.org',
      'upload.wikimedia.org',
      'thumb.wikimedia.org',
    ].includes(u.hostname) ||
    u.username ||
    u.password
  )
    throw new Error('Unapproved source host');
  if (blockedHosts.has(u.hostname)) throw new Error(`Provider suspended: ${u.hostname}`);
  const file = inside(cacheDir, digest(url) + (binary ? '.image' : '.json'));
  if (await exists(file))
    return binary ? fs.readFile(file) : JSON.parse(await fs.readFile(file, 'utf8'));
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(Math.max(0, nextRequest - Date.now()));
    nextRequest = Date.now() + 750;
    requests++;
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: binary ? 'image/*' : 'application/json' },
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if ([429, 503].includes(response.status)) {
      const retry = response.headers.get('retry-after');
      const delay = retry
        ? /^\d+$/.test(retry)
          ? Number(retry) * 1000
          : Math.max(0, Date.parse(retry) - Date.now())
        : 5000 * (attempt + 1);
      if (attempt === 2 || delay > 30000) {
        blockedHosts.add(u.hostname);
        state.providers[u.hostname] = {
          status: 'RATE_LIMITED',
          retryAfter: retry,
          at: new Date().toISOString(),
        };
        throw new Error(`Provider rate limited: ${u.hostname}`);
      }
      await sleep(Math.max(1500, delay));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} ${u.hostname}`);
    const length = Number(response.headers.get('content-length') || 0),
      max = binary ? 20000000 : 12000000;
    if (length > max) {
      await response.body.cancel();
      throw new Error('Source exceeds size limit');
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > max) throw new Error('Source exceeds size limit');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (binary) {
      await fs.writeFile(file, bytes);
      return bytes;
    }
    const data = JSON.parse(bytes.toString('utf8'));
    if (data.error) {
      if (data.error.code === 'maxlag') {
        await sleep(5000);
        continue;
      }
      throw new Error(`API ${data.error.code}`);
    }
    await fs.writeFile(file, JSON.stringify(data));
    return data;
  }
  throw new Error('Provider temporarily unavailable');
}

async function commons(params) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    ...params,
  });
  const data = await request(url.href);
  return { pages: data.query?.pages || [], more: !!data.continue };
}
const imageParams = {
  prop: 'imageinfo|coordinates',
  iiprop: 'url|size|mime|extmetadata',
  iiurlwidth: '1280',
  iiextmetadatafilter:
    'Artist|LicenseShortName|LicenseUrl|ImageDescription|ObjectName|GPSLatitude|GPSLongitude|Restrictions',
};

function candidate(place, page, method = 'COMMONS_NAME_SEARCH', trustedTitle = false) {
  const ii = page.imageinfo?.[0];
  if (
    /\b(logo|logotype|symbol|map|icon|flag|poster|banner|diagram|render|coat.of.arms)\b/i.test(
      normalize(page.title),
    )
  )
    return null;
  if (exclusions.some((item) => item.id === place.id && item.source === (ii?.descriptionurl || '')))
    return null;
  if (
    !ii ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(ii.mime) ||
    ii.width < 480 ||
    ii.height < 300
  )
    return null;
  const m = ii.extmetadata || {};
  const license = plain(m.LicenseShortName?.value),
    licenseUrl = (m.LicenseUrl?.value || '').replace(/^http:/, 'https:');
  const author = plain(m.Artist?.value);
  if (!eligibleLicense(license, licenseUrl) || !author || plain(m.Restrictions?.value)) return null;
  let geo;
  if (m.GPSLatitude?.value && m.GPSLongitude?.value)
    geo = { lat: Number(m.GPSLatitude.value), lon: Number(m.GPSLongitude.value) };
  const evidence = matchPhoto(place, page.title, m.ImageDescription?.value || '', geo);
  if (!evidence && !trustedTitle) return null;
  const source =
    ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;
  return {
    title: page.title,
    url: ii.thumburl || ii.url,
    source,
    author,
    license,
    licenseUrl,
    evidence: evidence || { method, sourceTitle: page.title, score: 90 },
    method,
    width: ii.width,
    height: ii.height,
  };
}

async function commitPhoto(place, found, { existing = false } = {}) {
  const entry = currentIndex.find((e) => e.id === place.id);
  const list = [...new Map(found.map((p) => [p.source, p])).values()].sort(
    (a, b) => b.evidence.score - a.evidence.score || b.width * b.height - a.width * a.height,
  );
  state.places[place.id] = {
    ...state.places[place.id],
    id: place.id,
    name: place.name,
    candidates: list,
    checkedAt: new Date().toISOString(),
    status: list.length ? 'MATCHED' : 'NO_MATCH',
  };
  if (!list.length) return;
  discovered++;
  for (const c of list) {
    if (usedSources.has(c.source) && !existing) continue;
    try {
      let bytes, filename;
      if (existing) {
        filename = path.basename(entry.image);
        bytes = await fs.readFile(imageFile(imagesDir, entry.image, place.id));
      } else {
        const original = await request(c.url, { binary: true });
        const meta = await sharp(original, { limitInputPixels: 40000000 }).metadata();
        if ((meta.width || 0) < 480 || (meta.height || 0) < 300) continue;
        bytes = await sharp(original, { limitInputPixels: 40000000 })
          .rotate()
          .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        filename = `${place.id.toLowerCase()}-${normalize(place.name).replaceAll(' ', '-').slice(0, 72).replace(/-$/, '')}.jpg`;
      }
      const sha256 = digest(bytes);
      if (!existing && usedHashes.has(sha256)) continue;
      const provenance = {
        source: c.source,
        sourceImage: c.url,
        title: c.title,
        author: c.author,
        license: c.license,
        licenseUrl: c.licenseUrl,
        retrievedAt: new Date().toISOString(),
        evidence: { ...c.evidence, provider: c.method },
      };
      if (apply) {
        if (!existing) {
          const staged = inside(research, `commons-photos/${filename}`);
          await fs.mkdir(path.dirname(staged), { recursive: true });
          await fs.writeFile(staged, bytes);
          Object.assign(state.places[place.id], {
            stagedImage: path.relative(root, staged).replaceAll('\\', '/'),
            sha256,
            selected: provenance,
          });
          downloaded++;
        } else {
          await fs.writeFile(
            inside(originals, `${place.id.toLowerCase()}.source.json`),
            JSON.stringify(provenance, null, 2) + '\n',
          );
          updates.set(place.id, {
            image: `/images/${filename}`,
            type: 'LOCATION_PHOTO',
            status: 'PENDING_REVIEW',
            source: c.source,
            attribution: {
              author: c.author,
              license: c.license,
              licenseUrl: c.licenseUrl,
              source: c.source,
            },
            review: { ...entry.review, identity: 'pending', license: 'documented' },
            evidence: provenance.evidence,
            sha256,
          });
        }
      }
      usedHashes.add(sha256);
      usedSources.add(c.source);
      state.places[place.id].status = apply
        ? existing
          ? 'ATTRIBUTION_UPDATED'
          : 'STAGED_AWAITING_VISUAL_REVIEW'
        : 'READY_TO_DOWNLOAD';
      state.places[place.id].selected = provenance;
      return;
    } catch (error) {
      state.places[place.id].downloadError = error.message;
      if (blockedHosts.has('upload.wikimedia.org')) break;
    }
  }
  if (!existing) state.places[place.id].status = 'NEEDS_ALTERNATIVE_PHOTO';
}

// First recover attribution for current photos and explicit source links in the input.
const direct = new Map();
for (const place of places) {
  const entry = currentIndex.find((e) => e.id === place.id);
  const sourceTitles = entry?.image
    ? [sourceFileTitle(entry.source)]
    : [sourceFileTitle(place.sourceImagePage), sourceFileTitle(place.sourceImageUrl)];
  for (const title of [...new Set(sourceTitles.filter(Boolean))]) {
    if (!direct.has(title)) direct.set(title, []);
    direct.get(title).push(place);
  }
}
const sourcesArg = args.find((arg) => arg.startsWith('--sources-file='));
if (sourcesArg) {
  const rows = JSON.parse(await fs.readFile(inside(root, sourcesArg.slice(15)), 'utf8'));
  for (const row of rows) {
    const place = places.find((p) => p.id === row.id);
    const title = sourceFileTitle(row.url);
    if (!place || !title)
      throw new Error('Source list must contain known place IDs and Commons files');
    if (currentIndex.find((e) => e.id === place.id)?.image) continue;
    if (!direct.has(title)) direct.set(title, []);
    direct.get(title).push(place);
  }
}
const titles = [...direct.keys()];
for (let i = 0; i < titles.length; i += 40) {
  try {
    const result = await commons({ ...imageParams, titles: titles.slice(i, i + 40).join('|') });
    for (const page of result.pages) {
      const mapped =
        direct.get(page.title) ||
        [...direct].find(([title]) => normalize(title) === normalize(page.title))?.[1] ||
        [];
      for (const place of mapped) {
        const c = candidate(place, page, 'PROVIDED_SOURCE_LINK', true);
        if (c)
          await commitPhoto(place, [c], {
            existing: !!currentIndex.find((e) => e.id === place.id)?.image,
          });
      }
    }
  } catch (error) {
    console.log(`Direct source: ${error.message}`);
  }
  await checkpoint();
}

if (args.includes('--wikipedia-only')) {
  const titlesByName = new Map();
  for (const place of places.filter((p) => !currentIndex.find((e) => e.id === p.id)?.image)) {
    for (const name of [...new Set([...aliases(place), `${place.name} (Thành phố Hồ Chí Minh)`])]) {
      if (!titlesByName.has(name)) titlesByName.set(name, []);
      titlesByName.get(name).push(place);
    }
  }
  const names = [...titlesByName.keys()];
  for (let start = 0; start < names.length; start += 40) {
    const batch = names.slice(start, start + 40);
    try {
      const url = new URL('https://vi.wikipedia.org/w/api.php');
      url.search = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        maxlag: '5',
        redirects: '1',
        titles: batch.join('|'),
        prop: 'pageimages|coordinates|extracts',
        piprop: 'original',
        explaintext: '1',
        exchars: '600',
        exintro: '1',
      });
      const data = await request(url.href);
      const redirected = new Map(
        [...(data.query?.normalized || []), ...(data.query?.redirects || [])].map((r) => [
          normalize(r.from),
          normalize(r.to),
        ]),
      );
      const resolve = (name) => {
        let key = normalize(name);
        for (let i = 0; i < 10 && redirected.has(key); i++) key = redirected.get(key);
        return key;
      };
      const found = [];
      for (const article of data.query?.pages || []) {
        if (article.missing || !article.original) continue;
        const fileTitle = sourceFileTitle(article.original.source);
        if (!fileTitle) continue;
        for (const name of batch.filter((name) => resolve(name) === normalize(article.title))) {
          for (const place of titlesByName.get(name)) {
            if (currentIndex.find((e) => e.id === place.id)?.image) continue;
            const coordinate = article.coordinates?.[0];
            const geo = coordinate ? { lat: coordinate.lat, lon: coordinate.lon } : undefined;
            const evidence = matchPhoto(place, `File:${article.title}`, article.extract || '', geo);
            if (!evidence) continue;
            found.push({
              place,
              fileTitle,
              evidence: {
                ...evidence,
                method: 'WIKIPEDIA_PLACE_ARTICLE',
                article: `https://vi.wikipedia.org/wiki/${encodeURIComponent(article.title.replaceAll(' ', '_'))}`,
              },
            });
          }
        }
      }
      if (found.length) {
        const metadata = await commons({
          ...imageParams,
          titles: [...new Set(found.map((item) => item.fileTitle))].slice(0, 40).join('|'),
        });
        for (const page of metadata.pages) {
          for (const item of found.filter(
            (item) => normalize(item.fileTitle) === normalize(page.title),
          )) {
            const c = candidate(item.place, page, 'WIKIPEDIA_PLACE_ARTICLE', true);
            if (c) {
              c.evidence = item.evidence;
              await commitPhoto(item.place, [c]);
            }
          }
        }
      }
      for (const name of batch)
        for (const place of titlesByName.get(name)) {
          state.places[place.id] ||= { id: place.id, name: place.name, status: 'NO_MATCH' };
          state.places[place.id].wikipediaChecked = true;
        }
    } catch (error) {
      console.log(`Wikipedia batch ${start}: ${error.message}`);
    }
    await checkpoint();
    if (start % 200 === 0)
      console.log(
        `Wikipedia ${Math.min(start + 40, names.length)}/${names.length}; added=${downloaded}`,
      );
    if (blockedHosts.has('vi.wikipedia.org') || blockedHosts.has('commons.wikimedia.org')) break;
  }
}

if (args.includes('--wikidata-only')) {
  const region = JSON.parse(await fs.readFile(inside(research, 'wikidata-region.json'), 'utf8'));
  const matches = [];
  for (const place of places.filter((p) => !currentIndex.find((e) => e.id === p.id)?.image)) {
    for (const binding of region.results.bindings) {
      if (!aliases(place).some((alias) => normalize(alias) === normalize(binding.itemLabel.value)))
        continue;
      const coords = binding.location.value.match(/Point\(([-.\d]+) ([-.\d]+)\)/);
      if (!coords) continue;
      const geo = { lat: Number(coords[2]), lon: Number(coords[1]) };
      if (
        (place.lat == null || place.lon == null) &&
        /hoc|ngan hang/.test(normalize(place.category))
      )
        continue;
      const evidence = matchPhoto(
        place,
        binding.itemLabel.value,
        'Ho Chi Minh City regional geospatial entity',
        geo,
      );
      const fileTitle = sourceFileTitle(binding.image.value);
      if (evidence && fileTitle)
        matches.push({
          place,
          fileTitle,
          evidence: {
            ...evidence,
            method: 'WIKIDATA_P18_AND_LOCATION',
            entity: binding.item.value,
            entityLabel: binding.itemLabel.value,
          },
        });
    }
  }
  for (let start = 0; start < matches.length; start += 35) {
    const batch = matches.slice(start, start + 35);
    const metadata = await commons({
      ...imageParams,
      titles: [...new Set(batch.map((item) => item.fileTitle))].join('|'),
    });
    for (const page of metadata.pages)
      for (const item of batch.filter(
        (item) => normalize(item.fileTitle) === normalize(page.title),
      )) {
        if (currentIndex.find((e) => e.id === item.place.id)?.image) continue;
        const c = candidate(item.place, page, 'WIKIDATA_P18_AND_LOCATION', true);
        if (c) {
          c.evidence = item.evidence;
          await commitPhoto(item.place, [c]);
        }
      }
    await checkpoint();
  }
}

const pending = places
  .filter((place) => {
    if (currentIndex.find((e) => e.id === place.id)?.image) return false;
    const prior = state.places[place.id];
    if (!prior || args.includes('--refresh')) return true;
    return (
      args.includes('--retry-errors') &&
      ['ERROR', 'NEEDS_ALTERNATIVE_PHOTO', 'READY_TO_DOWNLOAD'].includes(prior.status)
    );
  })
  .slice(
    0,
    args.includes('--wikipedia-only') ||
      args.includes('--wikidata-only') ||
      args.includes('--sources-only')
      ? 0
      : limit,
  );
console.log(
  `Researching ${pending.length} places; apply=${apply}. Current photos=${currentIndex.filter((e) => e.image).length}.`,
);
// OR queries retrieve metadata for several exact names in one request. Paginated
// result sets are split so a popular landmark cannot hide a less-photographed place.
async function searchBatch(batch) {
  if (!batch.length) return;
  const query = batch
    .map(
      (place) =>
        `"${(place.name.replace(/\s*\([^)]*\)/g, '').trim() || place.name).replaceAll('"', '')}"`,
    )
    .join(' OR ');
  try {
    const result = await commons({
      ...imageParams,
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '50',
    });
    for (const place of batch) {
      const found = result.pages.map((page) => candidate(place, page)).filter(Boolean);
      if (found.length || !result.more || batch.length === 1) await commitPhoto(place, found);
      else await searchBatch([place]);
    }
  } catch (error) {
    for (const place of batch)
      state.places[place.id] = {
        id: place.id,
        name: place.name,
        status: 'ERROR',
        error: error.message,
        checkedAt: new Date().toISOString(),
      };
  }
  await checkpoint();
}
for (let i = 0; i < pending.length; i += 5) {
  if (blockedHosts.has('commons.wikimedia.org')) break;
  await searchBatch(pending.slice(i, i + 5));
  if (i % 25 === 0 || i + 5 >= pending.length)
    console.log(
      `${Math.min(i + 5, pending.length)}/${pending.length}; added=${downloaded}; matches=${discovered}; requests=${requests}`,
    );
}
await checkpoint();
await fs.writeFile(
  inside(runDir, 'summary.json'),
  JSON.stringify(
    {
      ...state.lastRun,
      finished: new Date().toISOString(),
      photos: currentIndex.filter((e) => e.image).length,
      processed: Object.keys(state.places).length,
      providers: state.providers,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    {
      finished: true,
      photos: currentIndex.filter((e) => e.image).length,
      stagedDownloads: downloaded,
      processed: Object.keys(state.places).length,
      requests,
      providers: state.providers,
    },
    null,
    2,
  ),
);
