'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Camera,
  Bike,
  Car,
  ChevronDown,
  CornerUpRight,
  ExternalLink,
  Footprints,
  Layers,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import type { Challenge, Locale, Profile } from '@/lib/types';
import { textFor } from '@/lib/types';
import { distanceKm, normalizeSearch } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { hcmCategoryGroups } from '@/data/hcm-places';
import { useDeviceConsent } from '@/lib/device-consent';
import { useLiveLocation, type LocationFailure } from '@/lib/device-location';
import type { Basemap, MapPlace, MapView, OsmPlace } from '@/lib/map-types';
import {
  distanceToLineMeters,
  formatDistance,
  formatDuration,
  nextStepIndex,
  stepText,
  SNAP_WARNING_METERS,
  type LngLat,
  type RouteMode,
  type RouteResult,
} from '@/lib/routing';
import { useDiscoveryPreferences } from './discovery';

const CATEGORY_GROUP_LABELS: Record<string, { en: string; zh: string }> = {
  'Tín ngưỡng & Tâm linh': { en: 'Belief & Spiritual Sites', zh: '信仰与宗教场所' },
  'Di sản & Bảo tàng': { en: 'Heritage & Museums', zh: '遗产与博物馆' },
  'Giáo dục & Trường học': { en: 'Education & Campuses', zh: '教育与校园' },
  'Y tế & Bệnh viện': { en: 'Medical & Historic Hospitals', zh: '医疗与历史医院' },
  'Ẩm thực & Nhà hàng': { en: 'Cuisine & Dining', zh: '美食与餐厅' },
  'Cà phê & Check-in': { en: 'Cafes & Photo Spots', zh: '咖啡馆与打卡地' },
  'Bar, Pub & Rooftop': { en: 'Bars, Pubs & Rooftops', zh: '酒吧与天台' },
  'Mua sắm & Thương mại': { en: 'Markets & Commerce', zh: '市集与商业' },
  'Đô thị & Cao ốc': { en: 'Urban Landmarks & Towers', zh: '都市地标与高层建筑' },
  'Cảnh quan & Thiên nhiên': { en: 'Parks & Waterfronts', zh: '景观与自然绿地' },
  'Khách sạn & Nghỉ dưỡng': { en: 'Historic & City Hotels', zh: '酒店与旅宿' },
  'Spa & Chăm sóc sức khỏe': { en: 'Wellness & Spa', zh: '水疗与康养' },
  'Ngân hàng & Tài chính': { en: 'Banking & Finance', zh: '银行与金融建筑' },
  'Điểm đến & Tiện ích khác': { en: 'Civic & Other Landmarks', zh: '公共建筑与其他地标' },
};
const labelCategoryGroup = (group: string, locale: Locale) =>
  locale === 'vi' ? group : (CATEGORY_GROUP_LABELS[group]?.[locale] ?? group);

const POI_KIND_LABELS: Record<string, [string, string, string]> = {
  heritage: ['Di tích', 'Historic site', '历史遗迹'],
  worship: ['Nơi thờ tự', 'Place of worship', '宗教场所'],
  museum: ['Bảo tàng', 'Museum', '博物馆'],
  attraction: ['Điểm tham quan', 'Attraction', '景点'],
  park: ['Công viên', 'Park', '公园'],
  cafe: ['Quán cà phê', 'Café', '咖啡馆'],
  food: ['Ăn uống', 'Food & drink', '餐饮'],
  market: ['Chợ', 'Market', '市场'],
  shop: ['Mua sắm', 'Shopping', '购物'],
  hotel: ['Lưu trú', 'Stay', '住宿'],
  education: ['Trường học', 'Education', '教育'],
  health: ['Y tế', 'Health', '医疗'],
  culture: ['Văn hóa', 'Culture', '文化'],
  service: ['Dịch vụ', 'Service', '服务'],
  transport: ['Giao thông', 'Transport', '交通'],
  other: ['Địa điểm', 'Place', '地点'],
};
// Basemap (OpenMapTiles) icon classes mapped onto the same labels.
const POI_CLASS_ALIASES: Record<string, string> = {
  school: 'education',
  college: 'education',
  library: 'education',
  hospital: 'health',
  pharmacy: 'health',
  doctors: 'health',
  dentist: 'health',
  restaurant: 'food',
  fast_food: 'food',
  bar: 'food',
  beer: 'food',
  ice_cream: 'food',
  bakery: 'food',
  grocery: 'shop',
  clothing_store: 'shop',
  shop: 'shop',
  lodging: 'hotel',
  bus: 'transport',
  railway: 'transport',
  ferry_terminal: 'transport',
  place_of_worship: 'worship',
  religious_christian: 'worship',
  religious_buddhist: 'worship',
  garden: 'park',
  campsite: 'park',
  stadium: 'park',
  town_hall: 'service',
  bank: 'service',
  post: 'service',
  police: 'service',
  fuel: 'service',
  monument: 'heritage',
  castle: 'heritage',
  art_gallery: 'museum',
  theatre: 'culture',
  cinema: 'culture',
};
const labelPoiKind = (kind: string, locale: Locale) =>
  copy(
    locale,
    ...(POI_KIND_LABELS[kind] ||
      POI_KIND_LABELS[POI_CLASS_ALIASES[kind] || 'other'] ||
      POI_KIND_LABELS.other),
  );

const MapCanvas = dynamic(() => import('./map-canvas'), {
  ssr: false,
  loading: () => <div className="atlas-canvas skeleton" />,
});

const PAGE_SIZE = 30;
const AROUND_RADIUS = 900;

type Target = { id: string; name: string; latitude: number; longitude: number };
type Selection =
  | { type: 'place'; id: string }
  | { type: 'poi'; id: string }
  | { type: 'picked'; id: string }
  | null;
type Around = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  places: OsmPlace[];
  area: string | null;
  origin: { latitude: number; longitude: number } | null;
};

function PlaceImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}

const failureText = (locale: Locale, failure: LocationFailure | null) =>
  failure === 'insecure'
    ? copy(
        locale,
        'Trình duyệt chỉ cho lấy vị trí khi trang chạy bằng HTTPS (hoặc localhost).',
        'Browsers only share location on HTTPS (or localhost) pages.',
        '浏览器仅在 HTTPS（或 localhost）页面上提供位置。',
      )
    : failure === 'denied'
      ? copy(
          locale,
          'Bạn đã chặn quyền vị trí cho trang này. Hãy bật lại trong cài đặt trình duyệt rồi bấm định vị.',
          'Location is blocked for this site. Re-enable it in your browser settings, then tap locate.',
          '你已阻止本站使用位置。请在浏览器设置中重新开启，然后点击定位。',
        )
      : failure
        ? copy(
            locale,
            'Chưa lấy được vị trí của thiết bị. Hãy bật GPS/định vị và thử lại ở nơi thoáng.',
            'Could not get this device’s location. Turn on GPS/location and try again in the open.',
            '无法获取本设备的位置。请开启 GPS/定位后在开阔处重试。',
          )
        : '';

export function MapExplorer({
  places,
  locale,
  focus,
  profile,
  challenges = [],
}: {
  places: MapPlace[];
  locale: Locale;
  focus?: string;
  profile?: Profile;
  challenges?: Challenge[];
}) {
  const c = useCallback(
    (vi: string, en: string, zh: string) => copy(locale, vi, en, zh),
    [locale],
  );
  const focused = useMemo(
    () =>
      focus
        ? places.find((p) => p.slug === focus || p.id.toLowerCase() === focus.toLowerCase()) || null
        : null,
    [places, focus],
  );

  const [query, setQuery] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('');
  const [region, setRegion] = useState('');
  const [nearOnly, setNearOnly] = useState(false);
  const [tab, setTab] = useState<'places' | 'around'>('places');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [selection, setSelection] = useState<Selection>(
    focused ? { type: 'place', id: focused.id } : null,
  );
  const [basemap, setBasemap] = useState<Basemap>('streets');
  const [layersOpen, setLayersOpen] = useState(false);
  const [view, setView] = useState<MapView | null>(
    focused
      ? { type: 'point', longitude: focused.longitude, latitude: focused.latitude, zoom: 16, nonce: 1 }
      : null,
  );
  const [around, setAround] = useState<Around>({
    status: 'idle',
    places: [],
    area: null,
    origin: null,
  });
  const [picked, setPicked] = useState<OsmPlace | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeTarget, setRouteTarget] = useState<Target | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>('driving');
  const [routeState, setRouteState] = useState<'idle' | 'waiting' | 'loading' | 'error'>('idle');
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);
  useEffect(() => {
    navigatingRef.current = navigating;
  }, [navigating]);
  const [arrived, setArrived] = useState(false);

  const { consent } = useDeviceConsent();
  const live = useLiveLocation();
  const { fix, start: startLocation } = live;
  const { radius, store, ready } = useDiscoveryPreferences(profile);

  const nonce = useRef(1);
  const centredOnUser = useRef(Boolean(focused));
  const centredAccuracy = useRef(Infinity);
  const autoAroundTab = useRef(false);
  const aroundOrigin = useRef<{ latitude: number; longitude: number } | null>(null);
  const aroundRequest = useRef<AbortController | null>(null);
  const routeRequest = useRef<AbortController | null>(null);
  const lastReroute = useRef(0);
  const layersRef = useRef<HTMLDivElement>(null);

  const flyTo = useCallback((latitude: number, longitude: number, zoom: number) => {
    nonce.current += 1;
    setView({ type: 'point', latitude, longitude, zoom, nonce: nonce.current });
  }, []);

  // Start tracking without a second prompt when this device already agreed (camera gate or browser).
  const consentLocation = consent?.location === true;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let granted = consentLocation;
      if (!granted && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          granted = status.state === 'granted';
        } catch {
          /* Permissions API unavailable: wait for the visitor to tap locate. */
        }
      }
      if (!cancelled && granted) startLocation();
    })();
    return () => {
      cancelled = true;
    };
  }, [consentLocation, startLocation]);

  const loadAround = useCallback(async (origin: { latitude: number; longitude: number }) => {
    aroundRequest.current?.abort();
    const controller = new AbortController();
    aroundRequest.current = controller;
    aroundOrigin.current = origin;
    setAround((current) => ({ ...current, status: 'loading', origin }));
    try {
      const response = await fetch(
        `/api/nearby?lat=${origin.latitude}&lon=${origin.longitude}&radius=${AROUND_RADIUS}&address=1`,
        { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) },
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !data.placesAvailable) throw new Error('unavailable');
      setAround({
        status: 'ready',
        places: data.places as OsmPlace[],
        area: typeof data.area === 'string' ? data.area : null,
        origin,
      });
    } catch {
      if (!controller.signal.aborted)
        setAround((current) => ({ ...current, status: 'error', places: [], origin }));
    }
  }, []);

  // First fix: centre on the visitor. Later fixes: refresh "around you" after a real move.
  const hasFix = Boolean(fix);
  const fixLatitude = fix?.latitude;
  const fixLongitude = fix?.longitude;
  const fixAccuracy = fix?.accuracy;
  useEffect(() => {
    if (fixLatitude === undefined || fixLongitude === undefined || fixAccuracy === undefined)
      return;
    const here = { latitude: fixLatitude, longitude: fixLongitude };
    const timer = window.setTimeout(() => {
      // Centre on the first fix, and once more when a coarse network estimate sharpens into GPS.
      const sharpened =
        centredAccuracy.current > 150 && fixAccuracy < centredAccuracy.current / 2.5;
      if (!centredOnUser.current || (sharpened && !navigatingRef.current)) {
        centredOnUser.current = true;
        centredAccuracy.current = fixAccuracy;
        flyTo(here.latitude, here.longitude, 16);
      }
      if (!aroundOrigin.current || distanceKm(aroundOrigin.current, here) > 0.15)
        void loadAround(here);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fixLatitude, fixLongitude, fixAccuracy, flyTo, loadAround]);

  // The first time real places around the visitor arrive, show them.
  useEffect(() => {
    if (around.status !== 'ready' || autoAroundTab.current || !around.places.length) return;
    autoAroundTab.current = true;
    const timer = window.setTimeout(() => {
      if (!query) setTab('around');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [around.status, around.places.length, query]);

  useEffect(
    () => () => {
      aroundRequest.current?.abort();
      routeRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!layersOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!layersRef.current?.contains(event.target as Node)) setLayersOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLayersOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [layersOpen]);

  const regions = useMemo(
    () =>
      [...new Set(places.map((p) => p.region).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
    [places],
  );

  const filtered = useMemo(() => {
    const tokens = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
    const here =
      fixLatitude !== undefined && fixLongitude !== undefined
        ? { latitude: fixLatitude, longitude: fixLongitude }
        : null;
    return places
      .map((place) => ({ place, distance: here ? distanceKm(here, place) * 1000 : null }))
      .filter(({ place, distance }) => {
        if (categoryGroup && place.categoryGroup !== categoryGroup) return false;
        if (region && place.region !== region) return false;
        if (nearOnly && distance !== null && distance > radius * 1000) return false;
        if (!tokens.length) return true;
        const target = normalizeSearch(
          `${place.name} ${place.address} ${place.category} ${place.categoryGroup} ${place.region} ${place.description}`,
        );
        return tokens.every((token) => target.includes(token));
      })
      .sort((a, b) =>
        a.distance !== null && b.distance !== null
          ? a.distance - b.distance
          : a.place.name.localeCompare(b.place.name, 'vi'),
      );
  }, [places, query, categoryGroup, region, nearOnly, radius, fixLatitude, fixLongitude]);
  const mapPlaces = useMemo(() => filtered.map((item) => item.place), [filtered]);

  const filterKey = `${query}|${categoryGroup}|${region}|${nearOnly}|${radius}|${tab}`;
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey);
    setDisplayCount(PAGE_SIZE);
  }

  const selectedPlace =
    selection?.type === 'place' ? places.find((p) => p.id === selection.id) || null : null;
  const selectedPoi =
    selection?.type === 'poi'
      ? around.places.find((p) => p.id === selection.id) || null
      : selection?.type === 'picked' && picked?.id === selection.id
        ? picked
        : null;
  const selectedTarget: Target | null = selectedPlace || selectedPoi;
  const selectedDistance = fix && selectedTarget ? distanceKm(fix, selectedTarget) * 1000 : null;
  const relatedChallenges = selectedPlace
    ? challenges.filter((challenge) => challenge.entry_id === selectedPlace.id)
    : [];

  const select = useCallback(
    (next: Exclude<Selection, null>, target: Target) => {
      setSelection(next);
      setNavigating(false);
      flyTo(target.latitude, target.longitude, 16);
    },
    [flyTo],
  );

  const fetchRoute = useCallback(
    async (
      from: { latitude: number; longitude: number },
      target: Target,
      mode: RouteMode,
      fit: boolean,
    ) => {
      routeRequest.current?.abort();
      const controller = new AbortController();
      routeRequest.current = controller;
      setRouteState('loading');
      try {
        const response = await fetch(
          `/api/route?fromLat=${from.latitude}&fromLon=${from.longitude}&toLat=${target.latitude}&toLon=${target.longitude}&mode=${mode}`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) },
        );
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.line) || data.line.length < 2)
          throw new Error('unavailable');
        setRoute(data as RouteResult);
        setRouteState('idle');
        if (fit) {
          nonce.current += 1;
          setView({ type: 'line', line: data.line, nonce: nonce.current });
        }
      } catch {
        if (controller.signal.aborted) return;
        setRoute(null);
        setNavigating(false);
        setRouteState('error');
      }
    },
    [],
  );

  const requestRoute = useCallback(
    (target: Target, mode: RouteMode) => {
      setRouteTarget(target);
      setRouteMode(mode);
      setArrived(false);
      setNavigating(false);
      if (fix) void fetchRoute(fix, target, mode, true);
      else {
        // Directions start from the real device position: ask for it, then route.
        setRoute(null);
        setRouteState('waiting');
        startLocation();
      }
    },
    [fix, fetchRoute, startLocation],
  );

  // A route requested before the first fix is computed as soon as the device reports one.
  useEffect(() => {
    if (
      routeState !== 'waiting' ||
      !routeTarget ||
      fixLatitude === undefined ||
      fixLongitude === undefined
    )
      return;
    const timer = window.setTimeout(
      () =>
        void fetchRoute(
          { latitude: fixLatitude, longitude: fixLongitude },
          routeTarget,
          routeMode,
          true,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [routeState, routeTarget, routeMode, fixLatitude, fixLongitude, fetchRoute]);

  // While navigating: detect arrival, and re-route from the real position after a wrong turn.
  useEffect(() => {
    if (
      !navigating ||
      !route ||
      !routeTarget ||
      fixLatitude === undefined ||
      fixLongitude === undefined
    )
      return;
    const here = { latitude: fixLatitude, longitude: fixLongitude };
    const timer = window.setTimeout(() => {
      if (distanceKm(here, routeTarget) * 1000 < 35) {
        setNavigating(false);
        setArrived(true);
        return;
      }
      if (
        distanceToLineMeters(here, route.line) > Math.max(70, (route.snap?.startMeters ?? 0) + 40) &&
        Date.now() - lastReroute.current > 15_000
      ) {
        lastReroute.current = Date.now();
        void fetchRoute(here, routeTarget, routeMode, false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [navigating, route, routeTarget, routeMode, fixLatitude, fixLongitude, fetchRoute]);

  const clearRoute = useCallback(() => {
    routeRequest.current?.abort();
    setRoute(null);
    setRouteTarget(null);
    setRouteState('idle');
    setNavigating(false);
    setArrived(false);
  }, []);

  const locate = useCallback(() => {
    if (fix) flyTo(fix.latitude, fix.longitude, 16.5);
    else centredOnUser.current = false;
    startLocation();
  }, [fix, flyTo, startLocation]);

  const onSelectPlace = useCallback(
    (id: string) => {
      const place = places.find((p) => p.id === id);
      if (place) select({ type: 'place', id }, place);
    },
    [places, select],
  );
  const onSelectPoi = useCallback(
    (id: string) => {
      const poi = around.places.find((p) => p.id === id);
      if (poi) select({ type: 'poi', id }, poi);
    },
    [around.places, select],
  );
  const onClearSelection = useCallback(() => setSelection(null), []);
  const onPickPlace = useCallback(
    (place: OsmPlace) => {
      setPicked(place);
      select({ type: 'picked', id: place.id }, place);
    },
    [select],
  );
  const onUserGesture = useCallback(() => setNavigating(false), []);

  const currentStep = navigating && route && fix ? nextStepIndex(fix, route.steps) : -1;

  // Dotted links: you → where the route starts on the road, road end → the actual place.
  const routeLinks = useMemo(() => {
    if (!route || !routeTarget || route.line.length < 2) return [] as LngLat[][];
    const links: LngLat[][] = [];
    const first = route.line[0];
    const last = route.line[route.line.length - 1];
    const gap = (a: LngLat, b: LngLat) =>
      distanceKm({ latitude: a[1], longitude: a[0] }, { latitude: b[1], longitude: b[0] }) * 1000;
    if (fixLatitude !== undefined && fixLongitude !== undefined) {
      const me: LngLat = [fixLongitude, fixLatitude];
      if (gap(me, first) > 8) links.push([me, first]);
    }
    const place: LngLat = [routeTarget.longitude, routeTarget.latitude];
    if (gap(last, place) > 8) links.push([last, place]);
    return links;
  }, [route, routeTarget, fixLatitude, fixLongitude]);
  const snapWarning =
    route?.snap &&
    Math.max(route.snap.startMeters, route.snap.endMeters) > SNAP_WARNING_METERS
      ? Math.round(Math.max(route.snap.startMeters, route.snap.endMeters))
      : null;
  const searchAreaVisible =
    mapCenter !== null &&
    around.status !== 'loading' &&
    (!around.origin || distanceKm(around.origin, mapCenter) > 0.6);
  const locationMessage = failureText(locale, live.failure);
  const googleHref = (target: Target) =>
    `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
  const modes: { id: RouteMode; Icon: typeof Car; label: string }[] = [
    { id: 'driving', Icon: Car, label: c('Xe máy / ô tô', 'Motorbike / car', '摩托车 / 汽车') },
    { id: 'walking', Icon: Footprints, label: c('Đi bộ', 'Walk', '步行') },
    { id: 'cycling', Icon: Bike, label: c('Xe đạp', 'Cycle', '骑行') },
  ];
  const basemaps: { id: Basemap; label: string }[] = [
    { id: 'streets', label: c('Bản đồ', 'Map', '地图') },
    { id: 'light', label: c('Tối giản', 'Light', '简洁') },
    { id: 'satellite', label: c('Vệ tinh', 'Satellite', '卫星') },
  ];

  // Info box shown on the map, anchored at the tapped place (like a phone map's place card).
  const placeCard = selectedTarget ? (
    <article className="atlas-card" aria-live="polite">
      <button
        type="button"
        className="atlas-card-close"
        onClick={() => setSelection(null)}
        aria-label={t(locale, 'close')}
      >
        <X size={15} />
      </button>
      {selectedPlace?.image ? (
        <PlaceImage
          key={selectedPlace.image}
          src={selectedPlace.image}
          alt={selectedPlace.name}
          className="atlas-card-photo"
        />
      ) : (
        // No verified photo in the archive yet: never a stock picture, but a link to real photos.
        <a
          className={`atlas-card-nophoto kind-${selectedPlace ? 'archive' : selectedPoi?.kind || 'other'}`}
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${selectedTarget.name} ${selectedPlace?.address || ''}`.trim(),
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Camera size={18} aria-hidden="true" />
          <span>
            <strong>{c('Chưa có ảnh trong THÁM VĂN', 'No photo in THÁM VĂN yet', 'THÁM VĂN 暂无照片')}</strong>
            <small>
              {c('Xem ảnh thực tế trên Google Maps', 'See real photos on Google Maps', '在 Google 地图查看实景照片')}
              <ArrowUpRight size={12} aria-hidden="true" />
            </small>
          </span>
        </a>
      )}
      <div className="atlas-card-body">
        <p className="atlas-kicker">
          {selectedPlace
            ? selectedPlace.categoryGroup
              ? labelCategoryGroup(selectedPlace.categoryGroup, locale)
              : selectedPlace.category || t(locale, selectedPlace.kind)
            : labelPoiKind(selectedPoi?.kind || 'other', locale)}
        </p>
        <h2>{selectedTarget.name}</h2>
        <p className="atlas-meta">
          <MapPin size={13} aria-hidden="true" />
          <span>
            {selectedDistance !== null && (
              <b>
                {formatDistance(selectedDistance, locale)}
                {' · '}
              </b>
            )}
            {selectedPlace ? selectedPlace.address || selectedPlace.region : (around.area ?? '')}
          </span>
        </p>
        {selectedPlace?.description && <p className="atlas-desc">{selectedPlace.description}</p>}
        <div className="atlas-card-actions">
          <button
            type="button"
            className="atlas-btn primary"
            onClick={() => requestRoute(selectedTarget, routeMode)}
          >
            <Navigation size={15} aria-hidden="true" />
            {t(locale, 'directions')}
          </button>
          {selectedPlace && (
            <Link className="atlas-btn" href={`/${locale}/explore/${selectedPlace.slug}`}>
              {t(locale, 'placeDetails')}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
        {selectedPlace && relatedChallenges.length > 0 && (
          <div className="atlas-challenges">
            {relatedChallenges.slice(0, 2).map((challenge) => (
              <Link key={challenge.id} href={`/${locale}/challenges#${challenge.id}`}>
                <span>
                  <Trophy size={11} aria-hidden="true" />
                  {challenge.points} XP
                </span>
                <strong>{textFor(challenge.translations, locale).title}</strong>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  ) : null;

  return (
    <div className="atlas">
      <aside
        className="atlas-panel"
        aria-label={c('Tìm kiếm và kết quả', 'Search and results', '搜索与结果')}
      >
        <div className="atlas-search">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="map-search">
            {t(locale, 'search')}
          </label>
          <input
            id="map-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setTab('places');
            }}
            placeholder={t(locale, 'searchPlaces')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={t(locale, 'clear')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="atlas-filters">
          <label className="atlas-select">
            <span className="sr-only">{t(locale, 'categoryFilter')}</span>
            <select value={categoryGroup} onChange={(event) => setCategoryGroup(event.target.value)}>
              <option value="">{t(locale, 'allCategories')}</option>
              {hcmCategoryGroups
                .filter((group) => group !== 'Tất cả')
                .map((group) => (
                  <option key={group} value={group}>
                    {labelCategoryGroup(group, locale)}
                  </option>
                ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
          <label className="atlas-select">
            <span className="sr-only">{t(locale, 'selectRegion')}</span>
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">{t(locale, 'allRegions')}</option>
              {regions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </div>

        {hasFix && (
          <div className="atlas-near">
            <label className="atlas-near-toggle">
              <input
                type="checkbox"
                checked={nearOnly}
                onChange={(event) => setNearOnly(event.target.checked)}
              />
              <span>
                {c('Chỉ hiện trong bán kính', 'Only within', '仅显示半径')} <b>{radius} km</b>
              </span>
            </label>
            <input
              type="range"
              aria-label={t(locale, 'radius')}
              disabled={!ready || !nearOnly}
              value={radius}
              min={3}
              max={10}
              step={1}
              onChange={(event) => store(Number(event.target.value))}
            />
          </div>
        )}

        {routeTarget && (
          <section className="atlas-route" aria-live="polite">
            <header>
              <div>
                <small>{c('Chỉ đường đến', 'Directions to', '前往')}</small>
                <strong>{routeTarget.name}</strong>
              </div>
              <button
                type="button"
                onClick={clearRoute}
                aria-label={c('Đóng chỉ đường', 'Close directions', '关闭路线')}
              >
                <X size={18} />
              </button>
            </header>
            <div
              className="atlas-modes"
              role="group"
              aria-label={c('Phương tiện', 'Travel mode', '出行方式')}
            >
              {modes.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  className={routeMode === id ? 'active' : ''}
                  aria-pressed={routeMode === id}
                  onClick={() => requestRoute(routeTarget, id)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {routeState === 'waiting' && (
              <p className={`atlas-note ${live.failure ? 'is-error' : ''}`} role="status">
                {!live.failure && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
                {live.failure
                  ? locationMessage
                  : c(
                      'Đang lấy vị trí của bạn để tính đường…',
                      'Getting your location to plan the route…',
                      '正在获取你的位置以规划路线…',
                    )}
              </p>
            )}
            {routeState === 'loading' && !route && (
              <p className="atlas-note" role="status">
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
                {c('Đang tìm đường…', 'Finding a route…', '正在规划路线…')}
              </p>
            )}
            {routeState === 'error' && (
              <>
                <p className="atlas-note is-error" role="alert">
                  {c(
                    'Máy chủ dẫn đường chưa trả về lộ trình thật nên bản đồ không vẽ đường phỏng đoán. Hãy thử lại hoặc mở Google Maps.',
                    'The routing server did not return a real route, so no guessed line is drawn. Try again or open Google Maps.',
                    '导航服务器未返回真实路线，因此不会绘制推测线路。请重试或打开 Google 地图。',
                  )}
                </p>
                <div className="atlas-actions">
                  <button
                    type="button"
                    className="atlas-btn primary"
                    onClick={() => requestRoute(routeTarget, routeMode)}
                  >
                    {c('Thử lại', 'Try again', '重试')}
                  </button>
                  <a
                    className="atlas-btn"
                    href={googleHref(routeTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Google Maps
                  </a>
                </div>
              </>
            )}
            {route && (
              <>
                <p className="atlas-route-summary">
                  <b>{formatDuration(route.durationSeconds, locale)}</b>
                  <span>{formatDistance(route.distanceMeters, locale)}</span>
                </p>
                {snapWarning !== null && (
                  <p className="atlas-note is-warning" role="status">
                    {routeMode === 'driving'
                      ? c(
                          `Không có đường xe chạy sát điểm này: lộ trình bắt đầu/kết thúc ở con đường gần nhất, cách khoảng ${formatDistance(snapWarning, locale)} (nét chấm).`,
                          `No drivable road reaches this point: the route starts/ends on the nearest road, about ${formatDistance(snapWarning, locale)} away (dotted line).`,
                          `此处没有可通行的车道：路线在约 ${formatDistance(snapWarning, locale)} 外的最近道路开始/结束（虚线）。`,
                        )
                      : c(
                          `${routeMode === 'cycling' ? 'Xe đạp' : 'Đi bộ'} không được đi trên đoạn đường sát bạn hoặc sát điểm đến, nên lộ trình nhập vào con đường gần nhất cách khoảng ${formatDistance(snapWarning, locale)} (nét chấm). Ở Việt Nam nên chọn "Xe máy / ô tô".`,
                          `${routeMode === 'cycling' ? 'Bicycles are' : 'Walking is'} not allowed on the road right by you or the destination, so the route joins the nearest permitted road about ${formatDistance(snapWarning, locale)} away (dotted line). Try "Motorbike / car".`,
                          `你或目的地旁的道路不允许${routeMode === 'cycling' ? '骑行' : '步行'}，路线从约 ${formatDistance(snapWarning, locale)} 外最近的可通行道路开始（虚线）。可尝试“摩托车 / 汽车”。`,
                        )}
                  </p>
                )}
                {arrived && (
                  <p className="atlas-note" role="status">
                    {c('Bạn đã đến nơi.', 'You have arrived.', '你已到达目的地。')}
                  </p>
                )}
                <div className="atlas-actions">
                  <button
                    type="button"
                    className="atlas-btn primary"
                    onClick={() => {
                      setArrived(false);
                      setNavigating((value) => !value);
                    }}
                  >
                    <Navigation size={16} aria-hidden="true" />
                    {navigating
                      ? c('Dừng dẫn đường', 'Stop', '停止导航')
                      : c('Bắt đầu', 'Start', '开始导航')}
                  </button>
                  <a
                    className="atlas-btn"
                    href={googleHref(routeTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Google Maps
                  </a>
                </div>
                <ol className="atlas-steps">
                  {route.steps.map((step, index) => (
                    <li
                      key={index}
                      className={index === currentStep ? 'current' : ''}
                      aria-current={index === currentStep ? 'step' : undefined}
                    >
                      <CornerUpRight size={15} aria-hidden="true" />
                      <span>{stepText(step, locale)}</span>
                      {step.distanceMeters > 0 && (
                        <small>{formatDistance(step.distanceMeters, locale)}</small>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="atlas-credit">
                  {c(
                    'Lộ trình: OSRM · dữ liệu © OpenStreetMap. Thời gian là ước tính, chưa tính kẹt xe.',
                    'Route: OSRM · data © OpenStreetMap. Times are estimates and ignore live traffic.',
                    '路线：OSRM · 数据 © OpenStreetMap。时间为估算，未计入实时路况。',
                  )}
                </p>
              </>
            )}
          </section>
        )}


        <div className="atlas-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            id="atlas-tab-places"
            aria-selected={tab === 'places'}
            aria-controls="atlas-list"
            className={tab === 'places' ? 'active' : ''}
            onClick={() => setTab('places')}
          >
            THÁM VĂN <span>{filtered.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="atlas-tab-around"
            aria-selected={tab === 'around'}
            aria-controls="atlas-list"
            className={tab === 'around' ? 'active' : ''}
            onClick={() => setTab('around')}
          >
            {c('Quanh bạn', 'Around you', '你的周围')}
            {around.status === 'ready' && <span>{around.places.length}</span>}
          </button>
        </div>

        <div
          className="atlas-list"
          id="atlas-list"
          role="tabpanel"
          aria-labelledby={tab === 'places' ? 'atlas-tab-places' : 'atlas-tab-around'}
        >
          {tab === 'places' ? (
            filtered.length ? (
              <>
                <ul>
                  {filtered.slice(0, displayCount).map(({ place, distance }) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        className={`atlas-item ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                        onClick={() => select({ type: 'place', id: place.id }, place)}
                      >
                        <span className="atlas-item-thumb">
                          <MapPin size={18} aria-hidden="true" />
                          {place.image && (
                            <PlaceImage key={place.image} src={place.image} alt="" className="" />
                          )}
                        </span>
                        <span className="atlas-item-body">
                          <strong>{place.name}</strong>
                          <small>
                            {place.categoryGroup
                              ? labelCategoryGroup(place.categoryGroup, locale)
                              : place.category}
                          </small>
                          <small>
                            {distance !== null ? `${formatDistance(distance, locale)} · ` : ''}
                            {place.address || place.region}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {filtered.length > displayCount && (
                  <button
                    type="button"
                    className="atlas-btn atlas-more"
                    onClick={() => setDisplayCount((value) => value + PAGE_SIZE)}
                  >
                    {c('Xem thêm', 'Show more', '显示更多')} ({filtered.length - displayCount})
                  </button>
                )}
              </>
            ) : (
              <p className="atlas-empty">
                {c(
                  'Không có địa điểm nào khớp bộ lọc. Thử bỏ bớt điều kiện hoặc đổi từ khóa.',
                  'No places match these filters. Try removing a filter or changing the keywords.',
                  '没有符合筛选条件的地点。请减少条件或更换关键词。',
                )}
              </p>
            )
          ) : (
            <>
              {around.area && around.status === 'ready' && (
                <p className="atlas-area">
                  <MapPin size={14} aria-hidden="true" />
                  {around.area}
                </p>
              )}
              {around.status === 'loading' && (
                <p className="atlas-note" role="status">
                  <LoaderCircle size={16} className="spin" aria-hidden="true" />
                  {c(
                    'Đang tìm địa điểm thật quanh đây…',
                    'Looking up real places nearby…',
                    '正在查找附近的真实地点…',
                  )}
                </p>
              )}
              {around.status === 'idle' && (
                <div className="atlas-empty">
                  <p>
                    {c(
                      'Bật vị trí để xem các địa điểm có thật quanh bạn (dữ liệu OpenStreetMap), hoặc kéo bản đồ rồi bấm “Tìm quanh khu vực này”.',
                      'Turn on location to see real places around you (OpenStreetMap data), or move the map and tap “Search this area”.',
                      '开启位置即可查看你周围的真实地点（OpenStreetMap 数据），或移动地图后点击“搜索此区域”。',
                    )}
                  </p>
                  <button type="button" className="atlas-btn primary" onClick={locate}>
                    <LocateFixed size={16} aria-hidden="true" />
                    {c('Bật vị trí', 'Turn on location', '开启位置')}
                  </button>
                </div>
              )}
              {around.status === 'error' && (
                <div className="atlas-empty">
                  <p role="alert">
                    {c(
                      'Dịch vụ dữ liệu địa điểm đang bận nên chưa có danh sách. Ứng dụng không hiển thị địa điểm phỏng đoán.',
                      'The place-data service is busy, so there is no list yet. The app never shows guessed places.',
                      '地点数据服务繁忙，暂无列表。应用不会显示推测的地点。',
                    )}
                  </p>
                  {around.origin && (
                    <button
                      type="button"
                      className="atlas-btn primary"
                      onClick={() => {
                        if (around.origin) void loadAround(around.origin);
                      }}
                    >
                      {c('Thử lại', 'Try again', '重试')}
                    </button>
                  )}
                </div>
              )}
              {around.status === 'ready' &&
                (around.places.length ? (
                  <ul>
                    {around.places.slice(0, displayCount).map((poi) => (
                      <li key={poi.id}>
                        <button
                          type="button"
                          className={`atlas-item ${selectedPoi?.id === poi.id ? 'selected' : ''}`}
                          onClick={() => select({ type: 'poi', id: poi.id }, poi)}
                        >
                          <span className={`atlas-item-thumb kind-${poi.kind}`}>
                            <MapPin size={18} aria-hidden="true" />
                          </span>
                          <span className="atlas-item-body">
                            <strong>{poi.name}</strong>
                            <small>{labelPoiKind(poi.kind, locale)}</small>
                            <small>{formatDistance(poi.distanceMeters, locale)}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="atlas-empty">
                    {c(
                      'OpenStreetMap chưa ghi nhận địa điểm có tên trong phạm vi này.',
                      'OpenStreetMap has no named places within this range yet.',
                      'OpenStreetMap 在此范围内暂无已命名的地点。',
                    )}
                  </p>
                ))}
              {around.status === 'ready' && around.places.length > displayCount && (
                <button
                  type="button"
                  className="atlas-btn atlas-more"
                  onClick={() => setDisplayCount((value) => value + PAGE_SIZE)}
                >
                  {c('Xem thêm', 'Show more', '显示更多')} ({around.places.length - displayCount})
                </button>
              )}
              <p className="atlas-credit">
                {c(
                  'Dữ liệu địa điểm: © OpenStreetMap',
                  'Place data: © OpenStreetMap contributors',
                  '地点数据：© OpenStreetMap 贡献者',
                )}
              </p>
            </>
          )}
        </div>
      </aside>

      <div className="atlas-map">
        <MapCanvas
          locale={locale}
          places={mapPlaces}
          pois={around.places}
          user={fix}
          selected={selectedTarget}
          routeLine={route?.line ?? null}
          routeLinks={routeLinks}
          popup={routeTarget ? null : placeCard}
          routeMode={routeMode}
          basemap={basemap}
          follow={navigating}
          view={view}
          onSelectPlace={onSelectPlace}
          onSelectPoi={onSelectPoi}
          onPickPlace={onPickPlace}
          onClearSelection={onClearSelection}
          onUserGesture={onUserGesture}
          onCenterChange={setMapCenter}
        />

        {searchAreaVisible && mapCenter && (
          <button
            type="button"
            className="atlas-search-area"
            onClick={() => {
              setTab('around');
              void loadAround(mapCenter);
            }}
          >
            <Search size={15} aria-hidden="true" />
            {c('Tìm quanh khu vực này', 'Search this area', '搜索此区域')}
          </button>
        )}

        <div className="atlas-layers" ref={layersRef}>
          <button
            type="button"
            className="atlas-fab"
            aria-expanded={layersOpen}
            aria-haspopup="menu"
            aria-label={c('Kiểu bản đồ', 'Map style', '地图样式')}
            onClick={() => setLayersOpen((value) => !value)}
          >
            <Layers size={20} />
          </button>
          {layersOpen && (
            <div role="menu" className="atlas-layers-menu">
              {basemaps.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={basemap === id}
                  className={basemap === id ? 'active' : ''}
                  onClick={() => {
                    setBasemap(id);
                    setLayersOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {fix && (
          <a
            className="atlas-fab atlas-native"
            href={`https://www.google.com/maps/@?api=1&map_action=map&center=${fix.latitude},${fix.longitude}&zoom=17`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={c(
              'Mở vị trí của bạn trong Google Maps',
              'Open your location in Google Maps',
              '在 Google 地图中打开你的位置',
            )}
            title={c('Mở trong Google Maps', 'Open in Google Maps', '在 Google 地图中打开')}
          >
            <ExternalLink size={18} />
          </a>
        )}
        <button
          type="button"
          className={`atlas-fab atlas-locate ${hasFix ? 'active' : ''}`}
          onClick={locate}
          disabled={live.status === 'locating'}
          aria-label={t(locale, 'locateMe')}
          title={t(locale, 'locateMe')}
        >
          {live.status === 'locating' ? (
            <LoaderCircle size={20} className="spin" />
          ) : (
            <LocateFixed size={20} />
          )}
        </button>

        {locationMessage && (
          <p className="atlas-location-note" role="alert">
            {locationMessage}
          </p>
        )}
      </div>
    </div>
  );
}
