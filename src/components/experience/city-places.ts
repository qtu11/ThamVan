// Shared identities for model anchors, HTML labels and static alternatives.
// Positions compose three separate scenes; they are not GIS coordinates.
export const cityPlaces = [
  { id: 'bitexco', name: 'BITEXCO FINANCIAL TOWER', view: 0, point: [-17, 26.7, -6] },
  { id: 'times', name: 'SAIGON TIMES SQUARE', view: 0, point: [-5, 16.8, -5] },
  { id: 'hilton', name: 'HILTON SAIGON', view: 0, point: [3.2, 16.3, -2.8] },
  { id: 'vietcombank', name: 'VIETCOMBANK TOWER', view: 0, point: [12.2, 21.1, -2] },
  { id: 'bason', name: 'CẦU BA SON', view: 1, point: [100, 12, 29] },
  { id: 'landmark81', name: 'LANDMARK 81', view: 2, point: [210, 46.8, -9] },
] as const;

export function cityPoster(view: number, time: 'dusk' | 'day' | 'sunset' | 'night') {
  const isDay = time === 'day';
  const name = view === 1 ? 'hcm-ba-son' : view === 2 ? 'hcm-landmark81' : 'hcm-city';
  return `/images/${name}${isDay ? '-day' : view === 0 ? '-poster' : ''}.webp`;
}
