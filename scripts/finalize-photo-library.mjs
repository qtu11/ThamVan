import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, imageFile, csv } from './lib/place-images.ts';
import { normalize, reviewedLocationPhoto } from './lib/photo-discovery.ts';
import { auditPlaceImages } from './audit-place-images.mjs';
import { publishReviewedPhoto } from './lib/photo-publication.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = inside(root, 'asset/place-photo-research');
const indexPath = inside(root, 'public/images/thamvan-image-index.json');
const imagesDir = inside(root, 'public/images');
const { places } = JSON.parse(
  await fs.readFile(inside(root, 'src/data/THAMVAN_HCM_V3/thamvan-places.json'), 'utf8'),
);
const commons = JSON.parse(await fs.readFile(inside(research, 'discovery-state.json'), 'utf8'));
const primary = JSON.parse(await fs.readFile(inside(research, 'source-discovery.json'), 'utf8'));
const archive = inside(
  research,
  `finalizations/${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
);
await fs.mkdir(archive, { recursive: true });
await fs.copyFile(indexPath, inside(archive, 'index-before.json'));
await fs.copyFile(inside(root, 'src/data/hcm-places.json'), inside(archive, 'runtime-before.json'));
// Remove unreviewed or rejected public leftovers before importing. A Commons
// source record is provenance, not permission to restore previously rejected pixels.
const before = await auditPlaceImages({ root, apply: true });
const index = before.index;
let imported = 0;

for (const entry of index) {
  const place = places.find((p) => p.id === entry.id);
  const row = primary.places[entry.id];
  const discovered = commons.places[entry.id];
  if (!entry.image && discovered?.stagedImage && reviewedLocationPhoto(discovered)) {
    const name = path.basename(discovered.stagedImage);
    const destination = imageFile(imagesDir, `/images/${name}`, entry.id);
    {
      const bytes = await publishReviewedPhoto(
        inside(root, discovered.stagedImage),
        destination,
        discovered,
      );
      const source = discovered.selected;
      await fs.writeFile(inside(root, `asset/places/${name}`), bytes);
      await fs.writeFile(
        inside(root, `asset/places/${entry.id.toLowerCase()}.source.json`),
        JSON.stringify(source, null, 2) + '\n',
      );
      Object.assign(entry, {
        image: `/images/${name}`,
        type: 'LOCATION_PHOTO',
        status: 'PENDING_REVIEW',
        source: source.source,
        attribution: {
          author: source.author,
          license: source.license,
          licenseUrl: source.licenseUrl,
          source: source.source,
        },
        review: {
          identity: 'pending',
          license: 'documented',
          subject: 'LOCATION_VIEW',
          subjectSha256: discovered.sha256,
          subjectCheckedAt: discovered.visualReview.at,
        },
        evidence: source.evidence,
        sha256: discovered.sha256,
      });
      imported++;
    }
  }
  if (!entry.image && row?.image && reviewedLocationPhoto(row)) {
    const image = `/images/${entry.id.toLowerCase()}-${normalize(place.name).replaceAll(' ', '-').slice(0, 72).replace(/-$/, '')}.jpg`;
    const dest = imageFile(imagesDir, image, entry.id);
    {
      await publishReviewedPhoto(inside(root, row.image), dest, row);
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
          visualReview: row.visualReview,
        },
        sha256: row.sha256,
      });
      imported++;
    }
  }
  const c = commons.places[entry.id];
  entry.research = {
    commons: c?.status || 'EXISTING_PHOTO',
    wikipediaChecked: !!c?.wikipediaChecked,
    sourceStatus: row?.status || 'NO_LABELLED_SOURCE_PHOTO',
    sourceChecked: !!primary.pages[place.referenceUrl],
    lastCheckedAt:
      row?.retrievedAt ||
      row?.checkedAt ||
      c?.checkedAt ||
      primary.pages[place.referenceUrl]?.checkedAt ||
      null,
  };
}
await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
const report = await auditPlaceImages({ root, apply: true });
const researchRows = report.index.map((entry) => ({
  Id: entry.id,
  Name: entry.name,
  Category: entry.category,
  Address: entry.address,
  HasImage: !!entry.image,
  Commons: entry.research?.commons,
  WikipediaChecked: entry.research?.wikipediaChecked,
  PrimarySource: entry.research?.sourceStatus,
  Source: entry.source || '',
  Author: entry.attribution?.author || '',
  License: entry.attribution?.license || '',
  LicenseUrl: entry.attribution?.licenseUrl || '',
  SubjectChecked: entry.review?.subject === 'LOCATION_VIEW',
  ReviewStatus: entry.status,
}));
await fs.writeFile(
  inside(imagesDir, '_thamvan_reports/photo-research.csv'),
  csv(researchRows, [
    'Id',
    'Name',
    'Category',
    'Address',
    'HasImage',
    'Commons',
    'WikipediaChecked',
    'PrimarySource',
    'Source',
    'Author',
    'License',
    'LicenseUrl',
    'SubjectChecked',
    'ReviewStatus',
  ]),
);
const result = {
  imported,
  ...report.summary,
  QuarantinedThisRun: before.summary.QuarantinedThisRun + report.summary.QuarantinedThisRun,
  runtime: report.runtime,
  SourcePagesChecked: Object.keys(primary.pages).length,
  SourcePhotosCollected: Object.values(primary.places).filter((p) => p.image).length,
  SourcePhotosVisuallyAccepted: Object.values(primary.places).filter((p) =>
    reviewedLocationPhoto(p),
  ).length,
};
await fs.writeFile(inside(archive, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
