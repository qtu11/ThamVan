import { distanceKm } from './geo';
import type { Locale } from './types';

/** Shared (client + server) routing types and helpers. No fabricated geometry lives here. */
export const routeModes = ['driving', 'walking', 'cycling'] as const;
export type RouteMode = (typeof routeModes)[number];
export const isRouteMode = (value: unknown): value is RouteMode =>
  routeModes.includes(value as RouteMode);

/** GeoJSON order: [longitude, latitude]. */
export type LngLat = [number, number];

export type RouteStep = {
  type: string;
  modifier: string | null;
  name: string;
  exit: number | null;
  distanceMeters: number;
  durationSeconds: number;
  location: LngLat;
};

/**
 * Where the engine joined the road network. Engines move the start/end onto the nearest road the
 * chosen vehicle may use, which can be a parallel street far from the real point.
 */
export type RouteSnap = { start: LngLat; end: LngLat; startMeters: number; endMeters: number };

export type RouteResult = {
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  line: LngLat[];
  steps: RouteStep[];
  snap: RouteSnap | null;
};

/** Beyond this, the drawn route no longer starts/ends where the traveller and the place really are. */
export const SNAP_WARNING_METERS = 60;

const isLngLat = (value: unknown): value is LngLat =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]) &&
  Math.abs(value[0]) <= 180 &&
  Math.abs(value[1]) <= 90;

/** Validate an OSRM `route` response. Returns null instead of guessing when anything is off. */
export function parseOsrmRoute(data: unknown, mode: RouteMode): RouteResult | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as { code?: unknown; routes?: unknown };
  if (body.code !== 'Ok' || !Array.isArray(body.routes) || !body.routes.length) return null;
  const route = body.routes[0] as {
    distance?: unknown;
    duration?: unknown;
    geometry?: { coordinates?: unknown };
    legs?: unknown;
  };
  const raw = route.geometry?.coordinates;
  if (!Array.isArray(raw)) return null;
  const line = raw.filter(isLngLat).map((point) => [point[0], point[1]] as LngLat);
  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);
  if (line.length < 2 || !Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds))
    return null;
  const steps: RouteStep[] = [];
  for (const leg of Array.isArray(route.legs) ? route.legs : []) {
    const legSteps = (leg as { steps?: unknown })?.steps;
    if (!Array.isArray(legSteps)) continue;
    for (const item of legSteps) {
      const step = item as {
        name?: unknown;
        distance?: unknown;
        duration?: unknown;
        maneuver?: { type?: unknown; modifier?: unknown; exit?: unknown; location?: unknown };
      };
      const maneuver = step.maneuver;
      if (!maneuver || typeof maneuver.type !== 'string' || !isLngLat(maneuver.location)) continue;
      steps.push({
        type: maneuver.type.slice(0, 40),
        modifier: typeof maneuver.modifier === 'string' ? maneuver.modifier.slice(0, 40) : null,
        name: typeof step.name === 'string' ? step.name.trim().slice(0, 160) : '',
        exit:
          typeof maneuver.exit === 'number' && Number.isInteger(maneuver.exit)
            ? maneuver.exit
            : null,
        distanceMeters: Math.max(0, Number(step.distance) || 0),
        durationSeconds: Math.max(0, Number(step.duration) || 0),
        location: [maneuver.location[0], maneuver.location[1]],
      });
    }
  }
  let snap: RouteSnap | null = null;
  const waypoints = (data as { waypoints?: unknown }).waypoints;
  if (Array.isArray(waypoints) && waypoints.length >= 2) {
    const first = waypoints[0] as { location?: unknown; distance?: unknown };
    const last = waypoints[waypoints.length - 1] as { location?: unknown; distance?: unknown };
    if (isLngLat(first.location) && isLngLat(last.location))
      snap = {
        start: [first.location[0], first.location[1]],
        end: [last.location[0], last.location[1]],
        startMeters: Math.max(0, Number(first.distance) || 0),
        endMeters: Math.max(0, Number(last.distance) || 0),
      };
  }
  return {
    snap,
    mode,
    distanceMeters: Math.max(0, distanceMeters),
    durationSeconds: Math.max(0, durationSeconds),
    line,
    steps,
  };
}

const pick = (locale: Locale, vi: string, en: string, zh: string) =>
  locale === 'en' ? en : locale === 'zh' ? zh : vi;

const directionWords: Record<string, [string, string, string]> = {
  left: ['rẽ trái', 'turn left', '左转'],
  right: ['rẽ phải', 'turn right', '右转'],
  'slight left': ['chếch sang trái', 'bear left', '向左前方行驶'],
  'slight right': ['chếch sang phải', 'bear right', '向右前方行驶'],
  'sharp left': ['rẽ gắt sang trái', 'turn sharp left', '向左急转'],
  'sharp right': ['rẽ gắt sang phải', 'turn sharp right', '向右急转'],
  straight: ['đi thẳng', 'go straight', '直行'],
  uturn: ['quay đầu', 'make a U-turn', '掉头'],
};

function direction(locale: Locale, modifier: string | null) {
  const words = modifier ? directionWords[modifier] : undefined;
  return words ? pick(locale, ...words) : pick(locale, 'đi tiếp', 'continue', '继续前行');
}

const capital = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** One human sentence per manoeuvre, built only from what the routing engine returned. */
export function stepText(step: RouteStep, locale: Locale): string {
  const road = step.name;
  const onto = road ? pick(locale, ` vào ${road}`, ` onto ${road}`, `，进入${road}`) : '';
  const along = road ? pick(locale, ` theo ${road}`, ` on ${road}`, `，沿${road}`) : '';
  const turn = direction(locale, step.modifier);
  switch (step.type) {
    case 'depart':
      return capital(pick(locale, `xuất phát${along}`, `head out${along}`, `出发${along}`));
    case 'arrive':
      return step.modifier === 'left' || step.modifier === 'right'
        ? pick(
            locale,
            `Đến nơi, điểm đến ở bên ${step.modifier === 'left' ? 'trái' : 'phải'}`,
            `Arrive — your destination is on the ${step.modifier}`,
            `到达目的地，位于${step.modifier === 'left' ? '左' : '右'}侧`,
          )
        : pick(locale, 'Đến nơi', 'Arrive at your destination', '到达目的地');
    case 'roundabout':
    case 'rotary':
      return step.exit
        ? pick(
            locale,
            `Vào vòng xoay, đi lối ra thứ ${step.exit}${onto}`,
            `At the roundabout take exit ${step.exit}${onto}`,
            `进入环岛，从第 ${step.exit} 个出口驶出${onto}`,
          )
        : pick(
            locale,
            `Vào vòng xoay${onto}`,
            `Enter the roundabout${onto}`,
            `进入环岛${onto}`,
          );
    case 'roundabout turn':
      return capital(
        pick(
          locale,
          `tại vòng xoay ${turn}${onto}`,
          `at the roundabout ${turn}${onto}`,
          `在环岛${turn}${onto}`,
        ),
      );
    case 'exit roundabout':
    case 'exit rotary':
      return pick(locale, `Ra khỏi vòng xoay${onto}`, `Exit the roundabout${onto}`, `驶出环岛${onto}`);
    case 'merge':
      return pick(locale, `Nhập làn${onto}`, `Merge${onto}`, `并入车道${onto}`);
    case 'on ramp':
      return pick(locale, `Vào đường dẫn${onto}`, `Take the ramp${onto}`, `驶入匝道${onto}`);
    case 'off ramp':
      return pick(locale, `Ra theo đường nhánh${onto}`, `Take the exit${onto}`, `从出口驶出${onto}`);
    case 'fork':
      return capital(
        pick(
          locale,
          `tại ngã ba, ${turn === 'đi tiếp' ? 'đi tiếp' : turn}${onto}`,
          `at the fork ${turn}${onto}`,
          `在岔路口${turn}${onto}`,
        ),
      );
    case 'end of road':
      return capital(
        pick(
          locale,
          `đến cuối đường thì ${turn}${onto}`,
          `at the end of the road ${turn}${onto}`,
          `到路的尽头${turn}${onto}`,
        ),
      );
    case 'new name':
    case 'continue':
      return step.modifier && step.modifier !== 'straight'
        ? capital(`${turn}${onto}`)
        : pick(locale, `Tiếp tục${along}`, `Continue${along}`, `继续前行${along}`);
    case 'turn':
      return capital(`${turn}${onto}`);
    default:
      return pick(locale, `Tiếp tục${along}`, `Continue${along}`, `继续前行${along}`);
  }
}

export function formatDistance(meters: number, locale: Locale): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : 'en-GB', {
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km)} km`;
}

export function formatDuration(seconds: number, locale: Locale): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return pick(locale, `${minutes} phút`, `${minutes} min`, `${minutes} 分钟`);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return pick(
    locale,
    rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`,
    rest ? `${hours} h ${rest} min` : `${hours} h`,
    rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`,
  );
}

/** Shortest distance from a point to a polyline, in metres (flat-earth per segment; fine at city scale). */
export function distanceToLineMeters(
  point: { latitude: number; longitude: number },
  line: LngLat[],
): number {
  if (!line.length) return Infinity;
  const kx = 111_320 * Math.cos((point.latitude * Math.PI) / 180);
  const ky = 110_574;
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = (line[i][0] - point.longitude) * kx;
    const ay = (line[i][1] - point.latitude) * ky;
    const bx = (line[i + 1][0] - point.longitude) * kx;
    const by = (line[i + 1][1] - point.latitude) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) best = d;
  }
  if (line.length === 1)
    best = distanceKm(point, { latitude: line[0][1], longitude: line[0][0] }) * 1000;
  return best;
}

/** Index of the manoeuvre the traveller is heading to next. */
export function nextStepIndex(
  point: { latitude: number; longitude: number },
  steps: RouteStep[],
): number {
  if (steps.length < 2) return 0;
  let nearest = 0;
  let best = Infinity;
  steps.forEach((step, index) => {
    const d = distanceKm(point, { latitude: step.location[1], longitude: step.location[0] });
    if (d < best) {
      best = d;
      nearest = index;
    }
  });
  // Within ~25 m of a manoeuvre it is still "the next one"; past it, announce the following step.
  return best * 1000 <= 25 ? nearest : Math.min(steps.length - 1, nearest + 1);
}
