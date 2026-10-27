import { it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { auditPlaceImages } from '../scripts/audit-place-images.mjs';
import {
  imageFile,
  rejection,
  duplicateAssignments,
  csv,
  reviewedLocationView,
} from '../scripts/lib/place-images.ts';

it('does not accept an unreviewed image or carry a location review onto changed pixels', () => {
  expect(reviewedLocationView({ id: 'HCM-0001', type: 'LOCATION_PHOTO' }, 'a')).toBe(false);
  const entry = { id: 'HCM-0001', review: { subject: 'LOCATION_VIEW', subjectSha256: 'a' } };
  expect(reviewedLocationView(entry, 'a')).toBe(true);
  expect(reviewedLocationView(entry, 'b')).toBe(false);
});

it('excludes title cards and local renders even when marked as verified photos', () => {
  expect(rejection({ id: 'HCM-0001', type: 'EDITORIAL_CARD_FALLBACK' })).toBe(
    'GENERATED_TITLE_CARD',
  );
  expect(
    rejection({ id: 'HCM-0001', type: 'BESPOKE_EDITORIAL_CARD', confidence: 'GENERATED_100%' }),
  ).toBe('GENERATED_TITLE_CARD');
  expect(
    rejection({
      id: 'HCM-VR-0059',
      source: 'local:d:/thamvan/asset/city/hcm-landmark81.png',
      confidence: 'VERIFIED_100%',
    }),
  ).toBe('RENDER_IS_NOT_A_LOCATION_PHOTO');
  expect(
    rejection({
      id: 'HCM-VR-0013',
      source: 'local:d:/thamvan/asset/city/references/03-waterbus-skyline.png',
    }),
  ).toBe('PHOTO_DOES_NOT_SHOW_SAIGON_BRIDGE');
});

it('rejects path traversal, other IDs, absolute paths and external URLs', () => {
  for (const image of [
    '/images/../hcm-0001-a.jpg',
    '/images/hcm-0002-a.jpg',
    'https://other/hcm-0001-a.jpg',
    '/images/hcm-0001-a/../../secret.jpg',
    '/images/hcm-0001-%2e.jpg',
  ]) {
    expect(() => imageFile('/tmp/images', image, 'HCM-0001')).toThrow();
  }
});

it('detects reused bytes and decoded pixels across filenames, preferring a reviewed assignment', () => {
  const make = (id, sha256, pixelHash, verified = false) => ({
    file: id,
    sha256,
    pixelHash,
    entry: {
      id,
      ...(verified
        ? {
            review: { identity: 'approved', license: 'approved' },
            attribution: {
              author: 'Author',
              license: 'CC BY 4.0',
              licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
              source: 'https://commons.wikimedia.org/wiki/File:example',
            },
          }
        : {}),
    },
  });
  const result = duplicateAssignments([
    make('HCM-0001', 'same', 'pixels'),
    make('HCM-0002', 'same', 'pixels', true),
    make('HCM-0003', 'reencoded', 'pixels'),
  ]);
  expect([...result]).toEqual([
    ['HCM-0001', 'HCM-0002'],
    ['HCM-0003', 'HCM-0002'],
  ]);
});

it('escapes CSV formulas, quotes, commas, and multiline location names', () => {
  expect(csv([{ Name: '=HYPERLINK("bad")\nnext, line' }], ['Name'])).toContain(
    '"\'=HYPERLINK(""bad"")\nnext, line"',
  );
});

it('dry runs without mutation, archives rejected files, preserves place IDs and originals, and is repeatable', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thamvan-image-audit-'));
  try {
    const publicDir = path.join(root, 'public/images');
    await fs.mkdir(publicDir, { recursive: true });
    const places = [1, 2, 3].map((number) => ({
      id: `HCM-000${number}`,
      name: `Place ${number}`,
      category: 'Test',
      address: 'Test address',
    }));
    const manifest = path.join(root, 'manifest.json');
    await fs.writeFile(manifest, JSON.stringify({ places }));
    const photo = await sharp({
      create: { width: 20, height: 10, channels: 3, background: 'green' },
    })
      .jpeg()
      .toBuffer();
    const entries = places.map((place, i) => ({
      ...place,
      image: `/images/hcm-000${i + 1}-test.jpg`,
      type: i === 0 ? 'BESPOKE_EDITORIAL_CARD' : 'LANDMARK_AUTHENTIC_PHOTO',
      confidence: 'VERIFIED_100%',
      review: {
        subject: 'LOCATION_VIEW',
        subjectSha256: createHash('sha256').update(photo).digest('hex'),
      },
    }));
    for (const entry of entries) await fs.writeFile(path.join(root, `public${entry.image}`), photo);
    await fs.writeFile(path.join(publicDir, 'thamvan-image-index.json'), JSON.stringify(entries));
    await fs.mkdir(path.join(root, 'asset/heritage'), { recursive: true });
    await fs.writeFile(path.join(root, 'asset/heritage/hue.jpg'), photo);
    const before = await fs.readdir(publicDir);
    const dry = await auditPlaceImages({ root, manifest });
    expect(dry.summary).toMatchObject({
      TotalPlaces: 3,
      HasImages: 1,
      Missing: 2,
      VerifiedImages: 0,
      QuarantinedThisRun: 2,
    });
    expect(await fs.readdir(publicDir)).toEqual(before);
    const result = await auditPlaceImages({ root, manifest, apply: true });
    expect(result.index.map((row) => row.id)).toEqual(places.map((row) => row.id));
    expect(result.index[0]).toMatchObject({ image: null, reason: 'GENERATED_TITLE_CARD' });
    expect(result.index[1]).toMatchObject({ image: entries[1].image, status: 'PENDING_REVIEW' });
    expect(await fs.readFile(path.join(publicDir, 'hcm-0002-test.jpg'))).toEqual(photo);
    expect(await fs.readFile(path.join(publicDir, 'hue.jpg'))).toEqual(photo);
    const moves = JSON.parse(
      await fs.readFile(path.join(result.archive, 'moves.json'), 'utf8'),
    ).moves;
    expect(moves).toHaveLength(2);
    for (const move of moves)
      expect(await fs.readFile(path.join(root, move.destination))).toEqual(photo);
    const again = await auditPlaceImages({ root, manifest });
    expect(again.summary).toMatchObject({ HasImages: 1, Missing: 2, QuarantinedThisRun: 0 });
    expect(again.index).toEqual(result.index);
    const changedPhoto = await sharp(photo).resize(21, 10).jpeg().toBuffer();
    await fs.writeFile(path.join(publicDir, 'hcm-0002-test.jpg'), changedPhoto);
    const changed = await auditPlaceImages({ root, manifest });
    expect(changed.index[1]).toMatchObject({
      image: null,
      reason: 'AWAITING_VISUAL_LOCATION_REVIEW',
    });
    expect(changed.summary.HasImages).toBe(0);
  } finally {
    // mkdtemp produces a fresh test-owned directory; no user paths are accepted here.
    await fs.rm(root, { recursive: true, force: true });
  }
});
