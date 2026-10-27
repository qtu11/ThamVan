import path from 'node:path';

export type Place = {
  id: string;
  name: string;
  category: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
};
export type ImageEntry = {
  id: string;
  name?: string;
  image?: string | null;
  type?: string;
  status?: string;
  source?: string;
  confidence?: string;
  reason?: string;
  duplicateOf?: string;
  evidence?: Record<string, unknown>;
  research?: Record<string, unknown>;
  attribution?: { author?: string; license?: string; licenseUrl?: string; source?: string };
  review?: {
    identity?: string;
    license?: string;
    subject?: string;
    subjectSha256?: string;
    subjectCheckedAt?: string;
  };
};
export type ImageCandidate = { entry: ImageEntry; file: string; sha256: string; pixelHash: string };

export function reviewedLocationView(entry: ImageEntry, sha256: string) {
  return entry.review?.subject === 'LOCATION_VIEW' && entry.review.subjectSha256 === sha256;
}

// A public image URL must resolve to one plain local file belonging to this place.
export function imageFile(root: string, image: string, id: string) {
  const name = image.slice('/images/'.length);
  if (
    !image.startsWith('/images/') ||
    !/^HCM-(?:[A-Z0-9]+-)?\d{4}$/.test(id) ||
    !name.toLowerCase().startsWith(`${id.toLowerCase()}-`) ||
    !/^[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/.test(name)
  ) {
    throw new Error(`Unsafe image path for ${id}: ${image}`);
  }
  return inside(root, name);
}

export function inside(root: string, relative: string) {
  const target = path.resolve(root, relative);
  const rel = path.relative(path.resolve(root), target);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`Path escapes asset directory: ${relative}`);
  }
  return target;
}

export function rejection(entry: ImageEntry): string | null {
  if (entry.review?.identity === 'rejected') return 'IDENTITY_REJECTED';
  if (/CARD|GENERATED|PLACEHOLDER/i.test(`${entry.type || ''} ${entry.confidence || ''}`)) {
    return 'GENERATED_TITLE_CARD';
  }
  const source = (entry.source || '').replaceAll('\\', '/');
  if (/asset\/city\/(?!references\/)[^/]+\.(png|webp)$/i.test(source)) {
    return 'RENDER_IS_NOT_A_LOCATION_PHOTO';
  }
  if (entry.id === 'HCM-VR-0013' && /03-waterbus-skyline/i.test(source)) {
    return 'PHOTO_DOES_NOT_SHOW_SAIGON_BRIDGE';
  }
  return null;
}

export function isVerified(entry: ImageEntry) {
  const a = entry.attribution;
  return (
    entry.review?.identity === 'approved' &&
    entry.review?.license === 'approved' &&
    !!a?.author &&
    !!a.license &&
    /^https:\/\//.test(a.licenseUrl || '') &&
    /^https:\/\//.test(a.source || '')
  );
}

// Prefer explicitly reviewed photos when an identical asset was assigned to multiple places.
// A retained unreviewed photo remains pending; a hash never proves location identity.
export function duplicateAssignments(candidates: ImageCandidate[]) {
  const seenBytes = new Map<string, string>();
  const seenPixels = new Map<string, string>();
  const duplicates = new Map<string, string>();
  for (const item of [...candidates].sort(
    (a, b) =>
      Number(isVerified(b.entry)) - Number(isVerified(a.entry)) ||
      a.entry.id.localeCompare(b.entry.id),
  )) {
    const prior = seenBytes.get(item.sha256) || seenPixels.get(item.pixelHash);
    if (prior) duplicates.set(item.entry.id, prior);
    else {
      seenBytes.set(item.sha256, item.entry.id);
      seenPixels.set(item.pixelHash, item.entry.id);
    }
  }
  return duplicates;
}

export function csv(rows: Record<string, unknown>[], columns: string[]) {
  const quote = (value: unknown) => {
    let s = String(value ?? '');
    // Spreadsheets should display untrusted titles as text rather than run formulas.
    if (/^[=+@-]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return (
    '\ufeff' +
    [
      columns.map(quote).join(','),
      ...rows.map((row) => columns.map((key) => quote(row[key])).join(',')),
    ].join('\r\n') +
    '\r\n'
  );
}

export function html(value: unknown) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}
