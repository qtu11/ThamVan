import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { photoReport, photoReportCSS } from './lib/photo-report.mjs';
import { syncRuntimePhotos } from './lib/photo-publication.mjs';
import {
  inside,
  imageFile,
  rejection,
  isVerified,
  duplicateAssignments,
  csv,
  reviewedLocationView,
} from './lib/place-images.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const exists = async (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

export async function auditPlaceImages({ root = projectRoot, manifest, apply = false } = {}) {
  const publicDir = inside(root, 'public/images');
  const reports = inside(publicDir, '_thamvan_reports');
  const indexFile = inside(publicDir, 'thamvan-image-index.json');
  const { places } = JSON.parse(
    await fs.readFile(
      manifest || inside(root, 'src/data/THAMVAN_HCM_V3/thamvan-places.json'),
      'utf8',
    ),
  );
  const previous = (await exists(indexFile))
    ? JSON.parse(await fs.readFile(indexFile, 'utf8'))
    : [];
  const ids = new Set(places.map((p) => p.id));
  if (
    ids.size !== places.length ||
    new Set(previous.map((p) => p.id)).size !== previous.length ||
    previous.some((p) => !ids.has(p.id))
  ) {
    throw new Error(
      'Duplicate or unknown place IDs: reconcile the manifest before changing files.',
    );
  }
  const oldById = new Map(previous.map((p) => [p.id, p]));
  const candidates = [],
    removed = [],
    decisions = new Map();
  const files = await fs.readdir(publicDir);
  for (const place of places) {
    let entry = oldById.get(place.id) || { id: place.id };
    // The source downloader can add photos without emitting a complete index.
    if (!entry.image) {
      const matches = files.filter(
        (name) =>
          name.toLowerCase().startsWith(`${place.id.toLowerCase()}-`) &&
          /\.(jpg|jpeg|png|webp)$/i.test(name),
      );
      if (matches.length > 1)
        throw new Error(`Multiple unindexed assets for ${place.id}; review them first.`);
      if (matches.length === 1)
        entry = { ...entry, image: `/images/${matches[0]}`, type: 'PHOTO_PENDING_REVIEW' };
    }
    if (!entry.image) {
      decisions.set(place.id, {
        reason: entry.reason || 'NO_LOCATION_PHOTO',
        ...(entry.duplicateOf ? { duplicateOf: entry.duplicateOf } : {}),
      });
      continue;
    }
    const file = imageFile(publicDir, entry.image, place.id);
    if (!(await exists(file))) {
      decisions.set(place.id, { reason: 'FILE_MISSING' });
      continue;
    }
    // Refuse symlinks, including a linked parent, before reading or moving assets.
    if ((await fs.lstat(file)).isSymbolicLink() || (await fs.realpath(file)) !== file)
      throw new Error(`Linked image path: ${file}`);
    const bytes = await fs.readFile(file);
    const sha256 = digest(bytes);
    let reason = rejection(entry);
    if (!reason && !reviewedLocationView(entry, sha256)) reason = 'AWAITING_VISUAL_LOCATION_REVIEW';
    let pixelHash;
    if (!reason) {
      try {
        const { data, info } = await sharp(bytes, { limitInputPixels: 40000000 })
          .rotate()
          .toColourspace('srgb')
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        pixelHash = digest(Buffer.concat([Buffer.from(`${info.width}:${info.height}:`), data]));
      } catch {
        reason = 'INVALID_IMAGE';
      }
    }
    const item = { entry, file, sha256, pixelHash };
    if (reason) {
      removed.push({ ...item, reason });
      decisions.set(place.id, { reason });
    } else candidates.push(item);
  }
  const duplicates = duplicateAssignments(candidates);
  for (const item of candidates) {
    const duplicateOf = duplicates.get(item.entry.id);
    if (duplicateOf) {
      removed.push({ ...item, reason: 'DUPLICATE_LOCATION_ASSIGNMENT', duplicateOf });
      decisions.set(item.entry.id, { reason: 'DUPLICATE_LOCATION_ASSIGNMENT', duplicateOf });
    } else decisions.set(item.entry.id, { item });
  }
  const now = new Date().toISOString();
  const index = places.map((place) => {
    const decision = decisions.get(place.id),
      item = decision.item;
    const prior = oldById.get(place.id);
    const verified = item && isVerified(item.entry);
    return {
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      image: item?.entry.image || null,
      type: item ? 'LOCATION_PHOTO' : 'MISSING',
      status: item ? (verified ? 'VERIFIED_PHOTO' : 'PENDING_REVIEW') : 'NEEDS_IMAGE',
      source: item?.entry.source || item?.entry.attribution?.source || prior?.source || null,
      attribution: item?.entry.attribution || null,
      review: verified
        ? item.entry.review
        : {
            ...item?.entry.review,
            identity: 'pending',
            license: item?.entry.review?.license === 'documented' ? 'documented' : 'pending',
          },
      ...(item?.entry.evidence ? { evidence: item.entry.evidence } : {}),
      ...(prior?.research ? { research: prior.research } : {}),
      ...(item
        ? { sha256: item.sha256, pixelHash: item.pixelHash }
        : {
            reason: decision.reason,
            ...(decision.duplicateOf ? { duplicateOf: decision.duplicateOf } : {}),
          }),
    };
  });
  const withImages = index.filter((row) => row.image),
    missing = index.filter((row) => !row.image);
  const summary = {
    TotalPlaces: places.length,
    HasImages: withImages.length,
    Missing: missing.length,
    VerifiedImages: withImages.filter((row) => row.status === 'VERIFIED_PHOTO').length,
    PendingReview: withImages.filter((row) => row.status === 'PENDING_REVIEW').length,
    SubjectReviewedImages: withImages.filter((row) => reviewedLocationView(row, row.sha256)).length,
    DocumentedLicenseImages: withImages.filter(
      (row) => row.attribution?.license && row.attribution?.licenseUrl && row.attribution?.author,
    ).length,
    CoveragePercent: Math.round((withImages.length / Math.max(places.length, 1)) * 10000) / 100,
    QuarantinedThisRun: removed.length,
    DuplicateAssignments: duplicates.size,
    AuditedUtc: now,
    CoverageMeaning:
      'Existing location photos only. Generated title cards and renders are excluded. Presence does not establish identity or usage rights.',
  };
  if (!apply) return { summary, index, removed };

  // Snapshot every file being replaced and every move BEFORE changing public assets.
  const archive = inside(root, `asset/quarantine/place-images/${now.replaceAll(/[:.]/g, '-')}`);
  await fs.mkdir(inside(archive, 'images'), { recursive: true });
  if (await exists(indexFile)) await fs.copyFile(indexFile, inside(archive, 'original-index.json'));
  const runtimeFile = inside(root, 'src/data/hcm-places.json');
  if (await exists(runtimeFile))
    await fs.copyFile(runtimeFile, inside(archive, 'original-runtime.json'));
  if (await exists(reports))
    await fs.cp(reports, inside(archive, 'original-reports'), { recursive: true });
  const manifestRows = removed.map((item) => ({
    id: item.entry.id,
    original: item.entry.image,
    sha256: item.sha256,
    reason: item.reason,
    destination: path
      .relative(root, inside(archive, `images/${path.basename(item.file)}`))
      .replaceAll('\\', '/'),
    ...(item.duplicateOf ? { duplicateOf: item.duplicateOf } : {}),
  }));
  await fs.writeFile(
    inside(archive, 'moves.json'),
    JSON.stringify({ createdAt: now, moves: manifestRows }, null, 2) + '\n',
  );
  for (const item of removed) {
    // Fail if an external process changed a file after the audit was prepared.
    if (digest(await fs.readFile(item.file)) !== item.sha256)
      throw new Error(`Asset changed during audit: ${item.file}`);
    const destination = inside(archive, `images/${path.basename(item.file)}`);
    if (await exists(destination)) throw new Error(`Archive already contains ${destination}`);
    await fs.rename(item.file, destination);
  }
  // Restore the six existing app photographs from inspectable originals, without overwriting edits.
  const heritage = inside(root, 'asset/heritage');
  if (await exists(heritage))
    for (const name of await fs.readdir(heritage)) {
      if (!/^(hue|hoi-an|my-son|ha-long|thang-long|trang-an)\.jpg$/.test(name)) continue;
      const target = inside(publicDir, name);
      if (!(await exists(target))) await fs.copyFile(inside(heritage, name), target);
    }
  await fs.mkdir(reports, { recursive: true });
  const save = (name, body) => fs.writeFile(inside(reports, name), body);
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2) + '\n');
  const coverage = index.map((row, i) => ({
    Id: row.id,
    Name: row.name,
    Category: row.category,
    Address: row.address,
    HasGPS: places[i].lat != null && places[i].lon != null,
    HasImage: !!row.image,
    Files: row.image ? path.basename(row.image) : '',
    Status: row.status,
    Reason: row.reason || '',
    SearchCommons: `https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search=${encodeURIComponent(`${row.name} ${row.address}`)}`,
  }));
  const cols = [
    'Id',
    'Name',
    'Category',
    'Address',
    'HasGPS',
    'HasImage',
    'Files',
    'Status',
    'Reason',
    'SearchCommons',
  ];
  await save('coverage-current.csv', csv(coverage, cols));
  await save(
    'missing-current.csv',
    csv(
      coverage.filter((row) => !row.HasImage),
      cols,
    ),
  );
  const categories = [...new Set(places.map((p) => p.category))].map((category) => {
    const rows = index.filter((row) => row.category === category);
    return {
      Category: category,
      Total: rows.length,
      WithImages: rows.filter((row) => row.image).length,
      Missing: rows.filter((row) => !row.image).length,
      Verified: rows.filter((row) => row.status === 'VERIFIED_PHOTO').length,
    };
  });
  await save(
    'coverage-by-category.csv',
    csv(categories, ['Category', 'Total', 'WithImages', 'Missing', 'Verified']),
  );
  // Preserve source downloader columns so it can append compatible results later.
  await save(
    'download-results.csv',
    csv(
      index.map((row) => ({
        Id: row.id,
        Name: row.name,
        Status: row.status,
        FileName: row.image ? path.basename(row.image) : '',
        Confidence: row.status,
        FilePage: row.attribution?.source || '',
        Author: row.attribution?.author || '',
        License: row.attribution?.license || '',
        LicenseUrl: row.attribution?.licenseUrl || '',
        Source: row.source,
        Note: row.reason || 'Requires identity and licensing review',
        Timestamp: now,
      })),
      [
        'Id',
        'Name',
        'Status',
        'FileName',
        'Confidence',
        'FilePage',
        'Author',
        'License',
        'LicenseUrl',
        'Source',
        'Note',
        'Timestamp',
      ],
    ),
  );
  await save(
    'coverage-summary.json',
    JSON.stringify(
      { ...summary, LastArchive: path.relative(root, archive).replaceAll('\\', '/') },
      null,
      2,
    ) + '\n',
  );
  await save('summary-v3.json', JSON.stringify(summary, null, 2) + '\n');
  await save('index.html', photoReport(index, summary, now));
  await save('audit.css', photoReportCSS);
  await save(
    'gallery.js',
    await fs.readFile(new URL('./report-assets/gallery.js', import.meta.url), 'utf8'),
  );
  const runtime = await syncRuntimePhotos(root, index);
  return { summary, index, removed, archive, runtime };
}

export async function runAuditCLI() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !['--apply', '--dry-run'].includes(arg)) ||
    (args.includes('--apply') && args.includes('--dry-run'))
  )
    throw new Error(
      'Usage: node --experimental-strip-types scripts/audit-place-images.mjs [--apply|--dry-run]',
    );
  const result = await auditPlaceImages({ apply: args.includes('--apply') });
  console.log(
    JSON.stringify(
      {
        mode: args.includes('--apply') ? 'applied' : 'dry-run',
        ...result.summary,
        archive: result.archive,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await runAuditCLI();
