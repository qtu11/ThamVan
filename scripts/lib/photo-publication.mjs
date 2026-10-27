import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inside, imageFile, reviewedLocationView, rejection } from './place-images.ts';
import { reviewedLocationPhoto } from './photo-discovery.ts';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

// An interrupted import may have written the destination already. Only the
// reviewed staged bytes can authorize adoption; a source/filename cannot.
export async function publishReviewedPhoto(source, destination, row) {
  if (!reviewedLocationPhoto(row)) throw new Error('Photo has no exact-file location review');
  if ((await fs.lstat(source)).isSymbolicLink()) throw new Error('Linked staged photo');
  const bytes = await fs.readFile(source);
  if (hash(bytes) !== row.sha256) throw new Error('Reviewed photo changed');
  try {
    await fs.writeFile(destination, bytes, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if ((await fs.lstat(destination)).isSymbolicLink()) throw new Error('Linked public photo');
    const existing = await fs.readFile(destination);
    if (!existing.equals(bytes))
      throw new Error('Public photo conflicts with reviewed staged file');
  }
  return bytes;
}

// Keep the app's prepared catalog aligned with the audited library without
// regenerating its addresses, coordinates, descriptions, or translations.
export async function syncRuntimePhotos(root, index) {
  const file = inside(root, 'src/data/hcm-places.json');
  let rows;
  try {
    rows = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { skipped: true };
    throw error;
  }
  const byId = new Map(index.map((entry) => [entry.id, entry]));
  let changed = 0;
  for (const place of rows) {
    const entry = byId.get(place.id);
    let photo = null;
    if (entry?.image && !rejection(entry)) {
      const bytes = await fs.readFile(
        imageFile(inside(root, 'public/images'), entry.image, entry.id),
      );
      if (reviewedLocationView(entry, hash(bytes))) photo = entry;
    }
    const fields = {
      hasImage: !!photo,
      image: photo?.image || null,
      image_author: photo?.attribution?.author || '',
      image_license: photo?.attribution?.license || '',
      image_source: photo?.source || photo?.attribution?.source || null,
      verification: photo?.status === 'VERIFIED_PHOTO' ? 'reviewed' : 'reference',
    };
    if (Object.entries(fields).some(([key, value]) => place[key] !== value)) {
      Object.assign(place, fields);
      changed++;
    }
  }
  if (changed) await fs.writeFile(file, JSON.stringify(rows) + '\n');
  return { changed, photos: rows.filter((row) => row.image).length, places: rows.length };
}
