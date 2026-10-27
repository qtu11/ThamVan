export function normalize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// A name match or a valid license cannot prove that the pixels show the venue.
// Only a visual review of the exact staged file can release it to the library.
export function reviewedLocationPhoto(row: {
  sha256?: string;
  visualReview?: { decision?: string; subject?: string; sha256?: string };
}) {
  return !!(
    row.sha256 &&
    row.visualReview?.decision === 'accepted' &&
    row.visualReview.subject === 'LOCATION_VIEW' &&
    row.visualReview.sha256 === row.sha256
  );
}

export function plain(value: string = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:0*39|x27);/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type SearchPlace = {
  name: string;
  aliases?: string[];
  address: string;
  lat?: number | null;
  lon?: number | null;
};
const generic = new Set(
  'truong tieu hoc trung pho thong co so giao duc chua nha tho den dinh hoi quan dai cao dang cong vien ben cau du lich khu cho vien nguyen van thi thanh pho ho chi minh sai gon tphcm saigon vietnam viet nam the of in and at'.split(
    ' ',
  ),
);

export function aliases(place: SearchPlace) {
  const core = place.name.replace(/\s*\([^)]*\)/g, '').trim();
  const tokens = normalize(core)
    .split(' ')
    .filter((word) => !generic.has(word));
  return [
    ...new Set([
      place.name,
      core,
      ...(place.aliases || []).filter((alias) => {
        const words = new Set(normalize(alias).split(' '));
        const overlap = tokens.filter((token) => words.has(token)).length;
        return overlap >= Math.max(1, Math.ceil(Math.min(tokens.length, 4) * 0.6));
      }),
    ]),
  ].filter((name) => name.length >= 5);
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Exact names alone are insufficient for schools, branches, or names shared across cities.
export function matchPhoto(
  place: SearchPlace,
  title: string,
  caption: string,
  geo?: { lat: number; lon: number },
) {
  const text = ` ${normalize(`${title} ${plain(caption)}`)} `;
  const words = normalize(place.name)
    .split(' ')
    .filter((w) => !generic.has(w));
  const geographic =
    /\b(ho chi minh|sai gon|saigon|hcmc|tphcm|thu duc|cho lon|binh thanh|go vap|hoc mon|cu chi|can gio|tan binh|phu nhuan|binh chanh|binh tan|binh duong|thu dau mot|di an|thuan an|vung tau|ba ria|con dao)\b/.test(
      text,
    );
  const badRegion =
    /\b(hanoi|ha noi|hai phong|da nang|da lat|can tho|nha trang|quang ninh|thanh hoa|nghe an|quang binh|hue city)\b/.test(
      text,
    ) &&
    !/\b(hanoi|ha noi|hai phong|da nang|da lat|can tho|nha trang|quang ninh|thanh hoa|nghe an|quang binh|hue city)\b/.test(
      normalize(place.address + ' ' + place.name),
    );
  if (
    badRegion ||
    /\b(logo|map|locator|screenshot|poster|banner|icon|coat of arms|plan|diagram|drawing|render|floorplan)\b/.test(
      normalize(title),
    )
  )
    return null;
  const titleText = ` ${normalize(title)} `;
  // A nearby business mentioned in a long travel caption is not the subject.
  const matchedAlias = aliases(place).find((name) => titleText.includes(` ${normalize(name)} `));
  if (!matchedAlias || words.length < 1) return null;
  let distance: number | null = null;
  if (geo && place.lat != null && place.lon != null) {
    distance = distanceKm({ lat: place.lat, lon: place.lon }, geo);
    if (distance > 3) return null;
  }
  // A short/common name must include local context; location coordinates alone may
  // describe the camera position, so a matching name is always required as well.
  if (!geographic && !(distance != null && distance < 0.7)) return null;
  return {
    method: 'EXACT_NAME_AND_GEOGRAPHY',
    matchedAlias,
    geographicContext: geographic,
    distanceKm: distance,
    score: 80 + (distance != null && distance < 0.7 ? 10 : 0) + Math.min(words.length, 5),
  };
}

export function eligibleLicense(license: string, licenseUrl: string) {
  return (
    /^(CC BY(?:-SA)?(?: \d(?:\.\d)?)?|CC0(?: \d(?:\.\d)?)?|Public domain|PDM)$/i.test(
      plain(license),
    ) &&
    /^https?:\/\/(?:creativecommons\.org|[a-z]+\.wikipedia\.org)\//.test(licenseUrl) &&
    !/NC|ND/i.test(license)
  );
}

export function sourceFileTitle(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!['commons.wikimedia.org', 'upload.wikimedia.org'].includes(u.hostname)) return null;
    const clean = decodeURIComponent(u.pathname);
    const file =
      clean.match(/\/(?:File:|Special:(?:Redirect\/file|FilePath)\/)(.+)$/i)?.[1] ||
      (u.hostname === 'upload.wikimedia.org' && clean.startsWith('/wikipedia/commons/')
        ? clean.split('/').at(-1)
        : null);
    return file ? `File:${file.replaceAll('_', ' ')}` : null;
  } catch {
    return null;
  }
}
