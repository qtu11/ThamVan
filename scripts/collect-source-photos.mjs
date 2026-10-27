import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { normalize, plain, aliases, reviewedLocationPhoto } from './lib/photo-discovery.ts';
import { inside, imageFile } from './lib/place-images.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = inside(root, 'asset/place-photo-research');
const cache = inside(research, 'source-cache');
const dir = inside(research, 'source-photos');
await fs.mkdir(cache, { recursive: true });
await fs.mkdir(dir, { recursive: true });
const { places } = JSON.parse(
  await fs.readFile(inside(root, 'src/data/THAMVAN_HCM_V3/thamvan-places.json'), 'utf8'),
);
const args = process.argv.slice(2);
if (args.some((arg) => !['--publish', '--schools', '--retry-errors', '--galleries'].includes(arg)))
  throw new Error('Use [--schools] [--publish]');
const publish = args.includes('--publish');
const statePath = inside(research, 'source-discovery.json');
const state = await fs
  .readFile(statePath, 'utf8')
  .then(JSON.parse, () => ({ pages: {}, places: {} }));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const allowed = new Set(places.map((p) => new URL(p.referenceUrl).hostname));
for (const host of [
  's3.bandodulich.vn',
  'fileth.hcm.shieldix.app',
  'filethpt.hcm.shieldix.app',
  'file1.hcm.edu.vn',
  'file.hcm.edu.vn',
  'www.zonevietnam.com',
  'zonevietnam.com',
  'axwwgrkdco.cloudimg.io',
  'guide.michelin.com',
  'd3h1lg3ksw6i6b.cloudfront.net',
])
  allowed.add(host);
const blocked = new Set();
let educationFailures = 0;
const reservedHashes = new Set(
  Object.values(state.places)
    .filter((p) => p.image)
    .map((p) => p.sha256),
);
const lastHost = new Map();
const userAgent = 'ThamVanHeritagePhotoImporter/4.0 (https://github.com/qtu11)';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
function permitted(url) {
  const u = new URL(url);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (!allowed.has(u.hostname) && !u.hostname.endsWith('.hcm.edu.vn'))
  )
    throw new Error(`Unapproved source ${u.hostname}`);
  return u;
}
async function fetchSource(url, binary = false) {
  let u = permitted(url);
  const target = inside(cache, hash(url) + (binary ? '.image' : '.html'));
  function checkedContent(bytes) {
    if (
      !binary &&
      /awsWafCookieDomainList|window\.gokuProps|cf-chl-|challenge-platform/.test(String(bytes))
    )
      throw new Error('Source requires browser verification');
    return bytes;
  }
  if (await exists(target))
    return checkedContent(await fs.readFile(target, binary ? undefined : 'utf8'));
  for (let redirects = 0; redirects < 4; redirects++) {
    const bucket = u.hostname.endsWith('.hcm.edu.vn') ? 'hcm-education' : u.hostname;
    if (blocked.has(bucket)) throw new Error('Source temporarily unavailable; circuit open');
    if (blocked.has(u.hostname)) throw new Error('Source rate limited; retry later');
    const slot = Math.max(Date.now(), lastHost.get(bucket) || 0);
    lastHost.set(bucket, slot + 800);
    await sleep(Math.max(0, slot - Date.now()));
    let r;
    try {
      r = await fetch(u, {
        headers: { 'User-Agent': userAgent, Accept: binary ? 'image/*' : 'text/html' },
        signal: AbortSignal.timeout(12000),
        redirect: 'manual',
      });
    } catch (error) {
      if (bucket === 'hcm-education' && ++educationFailures >= 6) {
        blocked.add(bucket);
        state.providers ||= {};
        state.providers[bucket] = {
          status: 'TEMPORARILY_UNAVAILABLE',
          reason: 'Repeated network timeouts',
          at: new Date().toISOString(),
        };
      }
      throw error;
    }
    if (r.ok && bucket === 'hcm-education') educationFailures = 0;
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      u = permitted(new URL(r.headers.get('location'), u).href);
      continue;
    }
    if (r.status === 429) {
      blocked.add(u.hostname);
      throw new Error('Source rate limited; retry later');
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of r.body) {
      size += chunk.length;
      if (size > (binary ? 15000000 : 5000000)) throw new Error('Source exceeds size limit');
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    checkedContent(bytes);
    await fs.writeFile(target, bytes);
    return binary ? bytes : bytes.toString('utf8');
  }
  throw new Error('Too many redirects');
}
function attrs(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [
      m[1].toLowerCase(),
      plain(m[2] ?? m[3]),
    ]),
  );
}
function imagesIn(html, url) {
  return [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => {
      const a = attrs(match[0]);
      const src = a['data-src'] || a.src;
      try {
        return {
          url: new URL(src, url).href,
          alt: a.alt || '',
          title: a.title || '',
          at: match.index,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
function pageTitle(html) {
  return plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}
function cleanName(name) {
  return normalize(name)
    .replace(/\btruong\b/g, '')
    .replace(/\btih\b/g, 'tieu hoc')
    .replace(/\bth\b/g, 'tieu hoc')
    .replace(/\bthpt\b/g, 'trung hoc pho thong')
    .replace(/\s+/g, ' ')
    .trim();
}
function nameMatches(place, text) {
  const value = ` ${cleanName(text)} `;
  return aliases(place).some((alias) => value.includes(` ${cleanName(alias)} `));
}

async function record(place, candidate) {
  const row = state.places[place.id] || { id: place.id, name: place.name, candidates: [] };
  if (!row.candidates.some((c) => c.url === candidate.url)) row.candidates.push(candidate);
  state.places[place.id] = row;
  if (row.image) return;
  if (row.rejectedImages?.[candidate.url]) return;
  if (
    /logo|placeholder|default|avatar|icon|banner|advert|sprite|no[_-]?(?:image|img)|qrcode|qr-code/i.test(
      candidate.url,
    )
  )
    return;
  try {
    const bytes = await fetchSource(candidate.url, true);
    const meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    const ratio = meta.width / meta.height;
    const imageStats = await sharp(bytes).stats();
    if (
      !['jpeg', 'png', 'webp', 'avif'].includes(meta.format) ||
      meta.width < 480 ||
      meta.height < 300 ||
      ratio > 3.5 ||
      ratio < 0.5 ||
      imageStats.entropy < 2.8
    )
      throw new Error('Not a suitable location photograph');
    const jpg = await sharp(bytes, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const file = inside(dir, `${place.id.toLowerCase()}.jpg`);
    const sha256 = hash(jpg);
    if (reservedHashes.has(sha256)) throw new Error('Same image was assigned to another place');
    reservedHashes.add(sha256);
    await fs.writeFile(file, jpg);
    Object.assign(row, {
      image: path.relative(root, file).replaceAll('\\', '/'),
      sha256,
      selected: candidate,
      status: 'PHOTO_COLLECTED_RIGHTS_PENDING',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    row.error = error.message;
  }
}

async function inspectPage(url, group, { school = false, facilityPage = false } = {}) {
  function recordFailure(error) {
    for (const place of group) {
      const row = (state.places[place.id] ??= {
        id: place.id,
        name: place.name,
        candidates: [],
      });
      if (!row.image)
        Object.assign(row, {
          status: 'SOURCE_UNAVAILABLE',
          attemptedSource: url,
          sourceError: error,
          checkedAt: state.pages[url]?.checkedAt || new Date().toISOString(),
        });
    }
  }
  if (
    state.pages[url]?.error &&
    !args.includes('--retry-errors') &&
    Date.now() - Date.parse(state.pages[url].checkedAt || '') < 6 * 3600000
  ) {
    recordFailure(state.pages[url].error);
    return;
  }
  if (
    state.pages[url]?.done &&
    (!school || facilityPage || state.pages[url].facilitiesChecked) &&
    group.every((place) => state.places[place.id])
  )
    return;
  try {
    const html = await fetchSource(url),
      title = [
        pageTitle(html),
        ...[...html.matchAll(/<meta\b[^>]*>/gi)]
          .map((m) => attrs(m[0]))
          .filter((a) => ['og:site_name', 'article:publisher'].includes(a.property))
          .map((a) => a.content || ''),
      ].join(' · '),
      images = imagesIn(html, url);
    for (const place of group) {
      if (state.places[place.id]?.image) continue;
      const candidates = [];
      for (const img of images) {
        if (
          nameMatches(place, img.alt + ' ' + img.title) &&
          (!school ||
            facilityPage ||
            /khuon vien|cong truong|toan canh|co so vat chat|school building/.test(
              normalize(img.alt + ' ' + img.title),
            ))
        )
          candidates.push({
            ...img,
            sourcePage: url,
            sourceTitle: title,
            evidence: 'IMAGE_LABEL_MATCHES_PLACE',
          });
      }
      // Article-level OpenGraph is used only when the page identifies this place.
      // A directory's site-wide cover or a chain's logo is never assigned to its entries.
      if (nameMatches(place, title) && !school) {
        for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
          const a = attrs(m[0]);
          if (a.property === 'og:image' && a.content)
            candidates.unshift({
              url: new URL(a.content, url).href,
              alt: place.name,
              sourcePage: url,
              sourceTitle: title,
              evidence: 'PLACE_ARTICLE_OPENGRAPH',
            });
        }
      }
      if (school && nameMatches(place, title)) {
        // Only campus/facility captions qualify automatically, rather than any news thumbnail.
        for (const img of images)
          if (
            /khuon vien|cong truong|toan canh|co so vat chat|school building/.test(
              normalize(img.alt + ' ' + img.title + ' ' + decodeURI(img.url)),
            )
          )
            candidates.push({
              ...img,
              sourcePage: url,
              sourceTitle: title,
              evidence: 'OFFICIAL_SCHOOL_FACILITIES',
            });
      }
      for (const candidate of candidates.slice(0, 3)) await record(place, candidate);
      if (school && !facilityPage && !state.places[place.id]?.image) {
        const aboutLinks = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
          .map((match) => ({ ...attrs(match[1]), text: plain(match[2]) }))
          .filter(
            (link) =>
              link.href &&
              !link.href.startsWith('#') &&
              /^(co so vat chat|gioi thieu truong|bai viet gioi thieu|gioi thieu nha truong)$/.test(
                normalize(link.text),
              ),
          )
          .map((link) => ({ url: new URL(link.href, url), text: link.text }))
          .filter((link) => link.url.hostname === new URL(url).hostname)
          .sort(
            (a, b) =>
              Number(normalize(b.text) === 'co so vat chat') -
              Number(normalize(a.text) === 'co so vat chat'),
          );
        if (aboutLinks[0])
          await inspectPage(aboutLinks[0].url.href, [place], { school: true, facilityPage: true });
      }
      if (!state.places[place.id])
        state.places[place.id] = {
          id: place.id,
          name: place.name,
          status: 'NO_LABELLED_PHOTO',
          candidates: [],
        };
    }
    state.pages[url] = {
      done: true,
      title,
      checkedAt: new Date().toISOString(),
      images: images.length,
      facilitiesChecked: school,
    };
  } catch (error) {
    state.pages[url] = { done: false, error: error.message, checkedAt: new Date().toISOString() };
    recordFailure(error.message);
  }
}

const groups = new Map();
const existingIndex = JSON.parse(
  await fs.readFile(inside(root, 'public/images/thamvan-image-index.json'), 'utf8'),
);
for (const place of places) {
  if (existingIndex.find((e) => e.id === place.id)?.image) continue;
  const url = place.referenceUrl;
  if (
    !url ||
    new URL(url).hostname === 'www.google.com' ||
    /\.hcm\.edu\.vn/.test(new URL(url).hostname)
  )
    continue;
  if (!groups.has(url)) groups.set(url, []);
  groups.get(url).push(place);
}
let done = 0;
let saving = Promise.resolve();
async function save() {
  const content = JSON.stringify(state, null, 2) + '\n';
  saving = saving.then(() => fs.writeFile(statePath, content));
  await saving;
}
// Different sites may be fetched independently; only one task mutates the local ledger.
for (const [url, group] of groups) {
  await inspectPage(url, group);
  done++;
  if (done % 10 === 0) {
    await save();
    console.log(
      `Sources ${done}/${groups.size}; photos collected=${Object.values(state.places).filter((p) => p.image).length}`,
    );
  }
}

if (args.includes('--galleries')) {
  state.galleries ||= {};
  for (const [url, group] of groups) {
    if (!new URL(url).hostname.endsWith('zonevietnam.com')) continue;
    try {
      const directory = await fetchSource(url);
      const links = [...directory.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
        ...attrs(m[1]),
        body: m[2],
      }));
      for (const place of group) {
        if (state.galleries[place.id]?.done) continue;
        const link = links.find(
          (a) =>
            a.href &&
            /^\/food\/\d+\//.test(a.href) &&
            imagesIn(a.body, url).some((img) => nameMatches(place, img.alt)),
        );
        if (!link) continue;
        const page = new URL(link.href, url).href;
        const html = await fetchSource(page);
        if (!nameMatches(place, pageTitle(html))) continue;
        const candidates = imagesIn(html, page).filter(
          (img) =>
            new URL(img.url).pathname.startsWith('/uploads/gallery/') &&
            nameMatches(place, img.alt),
        );
        const staged = [];
        for (const candidate of candidates.slice(0, 8)) {
          try {
            const u = new URL(candidate.url);
            u.search = '';
            const bytes = await fetchSource(u.href, true);
            const m = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
            if (!['jpeg', 'png', 'webp'].includes(m.format) || m.width < 360 || m.height < 240)
              continue;
            const jpg = await sharp(bytes, { limitInputPixels: 40000000 })
              .rotate()
              .resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
            const sha256 = hash(jpg);
            const file = inside(
              research,
              `gallery-candidates/${place.id.toLowerCase()}-${sha256.slice(0, 12)}.jpg`,
            );
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, jpg);
            staged.push({
              id: place.id,
              image: path.relative(root, file).replaceAll('\\', '/'),
              sha256,
              selected: {
                ...candidate,
                url: u.href,
                sourcePage: page,
                sourceTitle: pageTitle(html),
                evidence: 'PLACE_DETAIL_GALLERY',
              },
            });
          } catch (error) {
            console.log(`Gallery image ${place.id}: ${error.message}`);
          }
        }
        state.galleries[place.id] = {
          done: true,
          sourcePage: page,
          candidates: staged,
          checkedAt: new Date().toISOString(),
        };
        await save();
        console.log(`Gallery ${place.id}: ${staged.length} candidates awaiting visual review`);
      }
    } catch (error) {
      console.log(`Gallery source: ${error.message}`);
    }
  }
}

if (args.includes('--schools')) {
  const listings = [
    'https://thankhanh.hcm.edu.vn/DSDonvimb?codekhoi=th',
    'https://thpttrungphu.hcm.edu.vn/DSDonvimb?codekhoi=thpt',
  ];
  const schoolLinks = [];
  for (const url of listings) {
    try {
      const html = await fetchSource(url);
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const a = attrs(m[1]);
        if (a.href && /^https:\/\/[^/]+\.hcm\.edu\.vn\/?$/i.test(a.href))
          schoolLinks.push({ url: a.href, title: plain(m[2]) });
      }
    } catch (error) {
      state.pages[url] = { error: error.message };
    }
  }
  const schools = places.filter(
    (p) =>
      /hoc|lien cap|giao duc/i.test(normalize(p.category)) &&
      !existingIndex.find((e) => e.id === p.id)?.image,
  );
  let count = 0;
  let nextSchool = 0;
  async function schoolWorker() {
    while (nextSchool < schools.length) {
      const place = schools[nextSchool++];
      const matches = [
        ...new Map(
          schoolLinks
            .filter((link) => cleanName(link.title) === cleanName(place.name))
            .map((link) => [new URL(link.url).hostname, link]),
        ).values(),
      ];
      let url = /^https:\/\/[^/]+\.hcm\.edu\.vn\/?$/.test(place.referenceUrl)
        ? place.referenceUrl
        : null;
      if (!url && matches.length === 1) url = matches[0].url;
      if (url) await inspectPage(url, [place], { school: true });
      else if (matches.length > 1)
        state.places[place.id] = {
          id: place.id,
          name: place.name,
          status: 'AMBIGUOUS_SCHOOL_BRANCH',
          candidates: matches,
        };
      count++;
      if (count % 20 === 0) {
        await save();
        console.log(
          `School discovery ${count}/${schools.length}; photos=${Object.values(state.places).filter((p) => p.image).length}`,
        );
      }
    }
  }
  await Promise.all([schoolWorker(), schoolWorker()]);
}
await save();

if (publish) {
  const indexPath = inside(root, 'public/images/thamvan-image-index.json');
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  await fs.writeFile(
    inside(research, `source-index-before-${Date.now()}.json`),
    JSON.stringify(index, null, 2) + '\n',
  );
  const hashes = new Set(index.filter((e) => e.image).map((e) => e.sha256));
  let count = 0;
  for (const entry of index) {
    const row = state.places[entry.id];
    if (entry.image || !row?.image || hashes.has(row.sha256) || !reviewedLocationPhoto(row))
      continue;
    const place = places.find((p) => p.id === entry.id);
    const image = `/images/${entry.id.toLowerCase()}-${normalize(place.name).replaceAll(' ', '-').slice(0, 72).replace(/-$/, '')}.jpg`;
    const dest = imageFile(inside(root, 'public/images'), image, entry.id);
    const bytes = await fs.readFile(inside(root, row.image));
    if (hash(bytes) !== row.sha256) throw new Error('Staged image changed');
    if (await exists(dest)) continue;
    await fs.writeFile(dest, bytes, { flag: 'wx' });
    const c = row.selected;
    Object.assign(entry, {
      image,
      type: 'LOCATION_PHOTO',
      status: 'PENDING_REVIEW',
      source: c.sourcePage,
      attribution: { author: null, license: null, licenseUrl: null, source: c.sourcePage },
      review: {
        identity: 'pending',
        license: 'pending',
        subject: 'LOCATION_VIEW',
        subjectSha256: row.sha256,
        subjectCheckedAt: row.visualReview.at,
      },
      evidence: {
        method: c.evidence,
        sourceTitle: c.sourceTitle,
        sourceImage: c.url,
        retrievedAt: row.retrievedAt,
      },
      sha256: row.sha256,
    });
    hashes.add(row.sha256);
    count++;
  }
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
  console.log(
    `Published ${count} locally collected photographs, with source/rights marked pending.`,
  );
}
console.log(
  JSON.stringify(
    {
      pages: Object.keys(state.pages).length,
      places: Object.keys(state.places).length,
      photos: Object.values(state.places).filter((p) => p.image).length,
      blocked: [...blocked],
    },
    null,
    2,
  ),
);
