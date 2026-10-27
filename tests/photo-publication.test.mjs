import { it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { publishReviewedPhoto, syncRuntimePhotos } from '../scripts/lib/photo-publication.mjs';

it('requires exact reviewed bytes and resumes an interrupted import without adopting a conflicting photo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thamvan-photo-publication-'));
  try {
    const source = path.join(root, 'source.jpg'),
      destination = path.join(root, 'public.jpg');
    const bytes = Buffer.from('reviewed photo bytes');
    await fs.writeFile(source, bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const row = {
      sha256,
      visualReview: { decision: 'accepted', subject: 'LOCATION_VIEW', sha256 },
    };
    await expect(publishReviewedPhoto(source, destination, { sha256 })).rejects.toThrow('review');
    await expect(fs.access(destination)).rejects.toThrow();
    await publishReviewedPhoto(source, destination, row);
    await publishReviewedPhoto(source, destination, row);
    await fs.writeFile(destination, 'rejected photo');
    await expect(publishReviewedPhoto(source, destination, row)).rejects.toThrow('conflicts');
    expect(await fs.readFile(destination, 'utf8')).toBe('rejected photo');
    await fs.writeFile(source, 'changed photo');
    await expect(publishReviewedPhoto(source, destination, row)).rejects.toThrow('changed');
  } finally {
    // Fresh test-owned directory from mkdtemp, never a user-supplied path.
    await fs.rm(root, { recursive: true, force: true });
  }
});

it('removes stale app assignments, preserves other catalog fields, and never invents author or license', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'thamvan-photo-runtime-'));
  try {
    await fs.mkdir(path.join(root, 'src/data'), { recursive: true });
    await fs.mkdir(path.join(root, 'public/images'), { recursive: true });
    const file = path.join(root, 'src/data/hcm-places.json');
    const bytes = Buffer.from('location'),
      sha256 = createHash('sha256').update(bytes).digest('hex');
    const rows = [1, 2, 3].map((n) => ({
      id: `HCM-000${n}`,
      image: '/images/stale.jpg',
      hasImage: true,
      image_author: 'Invented',
      image_license: 'CC',
      latitude: 10.7,
      translations: { vi: { story: 'Preserved' } },
    }));
    await fs.writeFile(file, JSON.stringify(rows));
    for (const n of [1, 3])
      await fs.writeFile(path.join(root, `public/images/hcm-000${n}-test.jpg`), bytes);
    const index = [1, 3].map((n) => ({
      id: `HCM-000${n}`,
      image: `/images/hcm-000${n}-test.jpg`,
      status: 'PENDING_REVIEW',
      review: { subject: 'LOCATION_VIEW', subjectSha256: n === 1 ? sha256 : 'old-photo' },
    }));
    expect(await syncRuntimePhotos(root, index)).toMatchObject({ changed: 3, photos: 1 });
    const actual = JSON.parse(await fs.readFile(file, 'utf8'));
    expect(actual[0]).toMatchObject({
      image: index[0].image,
      image_author: '',
      image_license: '',
      verification: 'reference',
    });
    expect(actual.slice(1).every((p) => p.image === null && !p.hasImage)).toBe(true);
    expect(actual.map(({ latitude, translations }) => ({ latitude, translations }))).toEqual(
      rows.map(({ latitude, translations }) => ({ latitude, translations })),
    );
    expect(await syncRuntimePhotos(root, index)).toMatchObject({ changed: 0 });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
