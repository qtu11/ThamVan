export type Coordinates = { latitude: number; longitude: number };
export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
export function safeNext(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\r\n]|%0[ad]|%5c/i.test(value))
    return fallback;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || !/^\/(vi|en|zh)(\/|$)/.test(url.pathname))
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
