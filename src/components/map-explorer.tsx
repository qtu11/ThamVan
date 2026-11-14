'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LocateFixed,
  Search,
  MapPin,
  ArrowUpRight,
  Sparkles,
  Camera,
  ChevronDown,
  X,
  Navigation,
  Info,
  Compass,
  Trophy,
} from 'lucide-react';
import type { Challenge, Heritage, Locale, Profile } from '@/lib/types';
import { textFor } from '@/lib/types';
import { distanceKm, normalizeSearch, type Coordinates } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { copy } from '@/lib/locale-copy';
import { useDiscoveryPreferences } from './discovery';
import { Empty, Status } from './ui';
import { hcmCategoryGroups } from '@/data/hcm-places';

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

function labelCategoryGroup(group: string, locale: Locale): string {
  if (locale === 'vi') return group;
  return CATEGORY_GROUP_LABELS[group]?.[locale] ?? group;
}

function MapPlaceImg({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const MapCanvas = dynamic(() => import('./map-canvas'), {
  ssr: false,
  loading: () => <div className="skeleton skeleton-hero" />,
});

const PAGE_SIZE = 40;

export function MapExplorer({
  entries,
  locale,
  focus,
  profile,
  challenges = [],
}: {
  entries: Heritage[];
  locale: Locale;
  focus?: string;
  profile?: Profile;
  challenges?: Challenge[];
}) {
  const [query, setQuery] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('');
  const [region, setRegion] = useState(
    focus
      ? entries.find((e) => e.slug === focus || e.id.toLowerCase() === focus.toLowerCase())
          ?.region || ''
      : '',
  );
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with-photo' | 'without-photo'>('all');
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [routingPending, setRoutingPending] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Heritage | null>(() => {
    if (!focus) return null;
    return (
      entries.find(
        (e) => e.slug === focus || e.id.toLowerCase() === focus.toLowerCase(),
      ) || null
    );
  });
  const [detailModal, setDetailModal] = useState<Heritage | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const watchIdRef = useRef<number | null>(null);
  const gpsActiveRef = useRef<boolean>(!focus);
  const bestAccuracyRef = useRef<number>(Infinity);

  const { radius, store, ready } = useDiscoveryPreferences(profile);

  const stopGpsWatch = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation &&
      typeof navigator.geolocation.clearWatch === 'function'
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const applyGpsFix = useCallback((coords: GeolocationCoordinates, forceCenter = false) => {
    if (!gpsActiveRef.current) return;
    const accuracy = typeof coords.accuracy === 'number' && coords.accuracy > 0 ? coords.accuracy : 50;
    // Ignore sudden degraded coarse network fixes if we already have a much sharper GPS lock
    if (!forceCenter && accuracy > bestAccuracyRef.current * 2.5 && bestAccuracyRef.current < 100) {
      return;
    }
    if (accuracy < bestAccuracyRef.current) {
      bestAccuracyRef.current = accuracy;
    }
    setPosition({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setAccuracyMeters(accuracy);
    if (forceCenter) {
      setLocateTrigger((n) => n + 1);
    }
  }, []);

  const startGpsWatch = useCallback(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      typeof navigator.geolocation.watchPosition !== 'function'
    ) {
      return;
    }
    stopGpsWatch();
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (p) => {
          applyGpsFix(p.coords, false);
        },
        () => {
          // Keep current fix if watch encounters a transient timeout
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        },
      );
    } catch {
      // Ignore if watchPosition is unsupported in test mocks
    }
  }, [applyGpsFix, stopGpsWatch]);

  // Acquire true hardware/browser GPS location (never overwrite with coarse ISP IP)
  const locateDevice = useCallback(
    (isManual = true) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (isManual) {
          setMessage(t(locale, 'locationDenied'));
        }
        return;
      }

      gpsActiveRef.current = true;
      bestAccuracyRef.current = Infinity;
      if (isManual) {
        setPending(true);
        setMessage('');
      }

      navigator.geolocation.getCurrentPosition(
        (p) => {
          setRegion('');
          setMessage('');
          applyGpsFix(p.coords, true);
          setPending(false);
          startGpsWatch();
        },
        () => {
          setPending(false);
          if (isManual) {
            setMessage(t(locale, 'locationDenied'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        },
      );
    },
    [locale, applyGpsFix, startGpsWatch],
  );

  // Auto-request real GPS on mount when not focusing a specific place
  useEffect(() => {
    if (focus) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (cancelled || !gpsActiveRef.current) return;
        applyGpsFix(p.coords, true);
        startGpsWatch();
      },
      () => {
        // Silent on initial mount; user can click the GPS icon or pick a district
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );

    return () => {
      cancelled = true;
      stopGpsWatch();
    };
  }, [focus, applyGpsFix, startGpsWatch, stopGpsWatch]);

  // Extract distinct regions
  const allRegions = useMemo(() => {
    const list = [...new Set(entries.map((e) => e.region).filter(Boolean))];
    return list.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [entries]);

  // Filter places
  const filtered = useMemo(() => {
    const tokens = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
    return entries.filter((e) => {
      if (e.latitude === null || e.longitude === null) return false;

      const hasPhoto = Boolean(e.hasImage || e.image);
      if (photoFilter === 'with-photo' && !hasPhoto) return false;
      if (photoFilter === 'without-photo' && hasPhoto) return false;

      if (categoryGroup && categoryGroup !== 'Tất cả' && e.categoryGroup !== categoryGroup) {
        return false;
      }

      if (region && e.region !== region) {
        return false;
      }

      if (tokens.length > 0) {
        const summary = textFor(e.translations, locale).summary;
        const target = normalizeSearch(
          `${e.name} ${e.address || ''} ${e.category || ''} ${e.categoryGroup || ''} ${e.region} ${(e.aliases || []).join(' ')} ${summary}`,
        );
        if (!tokens.every((tok) => target.includes(tok))) return false;
      }

      if (position) {
        const d = distanceKm(position, { latitude: e.latitude, longitude: e.longitude });
        if (d > radius) return false;
      }

      return true;
    });
  }, [entries, photoFilter, categoryGroup, region, query, position, radius, locale]);

  // Reset pagination count on filter change
  const filterKey = `${photoFilter}-${categoryGroup}-${region}-${query}-${position ? 'pos' : ''}-${radius}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setDisplayCount(PAGE_SIZE);
  }

  // Statistics
  const totalWithPhotos = useMemo(
    () => entries.filter((e) => e.hasImage || e.image).length,
    [entries],
  );
  const filteredWithPhotos = useMemo(
    () => filtered.filter((e) => e.hasImage || e.image).length,
    [filtered],
  );

  // Request actual driving route to destination using accurate GPS first
  const handleRequestRoute = useCallback(
    async (place: Heritage) => {
      if (!place.latitude || !place.longitude) return;

      let currentPos = position;
      if (!currentPos && typeof navigator !== 'undefined' && navigator.geolocation) {
        setRoutingPending(true);
        currentPos = await new Promise<Coordinates | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const coords = {
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
              };
              gpsActiveRef.current = true;
              applyGpsFix(p.coords, true);
              startGpsWatch();
              resolve(coords);
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        });
      }

      if (!currentPos) {
        setRoutingPending(false);
        setMessage(t(locale, 'locationDenied'));
        return;
      }

      setRoutingPending(true);
      setMessage('');
      try {
        const routeRes = await fetch(
          `/api/route?fromLat=${currentPos.latitude}&fromLon=${currentPos.longitude}&toLat=${place.latitude}&toLon=${place.longitude}`,
        );
        if (routeRes.ok) {
          const routeData = await routeRes.json();
          if (routeData.ok && routeData.coordinates?.length > 0) {
            setRouteCoordinates(routeData.coordinates);
            setRouteInfo({
              distanceKm: routeData.distanceKm,
              durationMinutes: routeData.durationMinutes,
            });
            setSelectedPlace(place);
            return;
          }
        }
        setMessage(
          copy(
            locale,
            'Chưa thể tải tuyến đường lúc này. Bạn có thể mở chỉ đường trực tiếp qua Google Maps.',
            'Could not load street directions right now. You can open direct navigation in Google Maps.',
            '暂时无法加载街道路线，可直接通过 Google Maps 开启导航。',
          ),
        );
      } catch {
        setMessage(
          copy(
            locale,
            'Không thể kết nối dịch vụ vẽ tuyến đường lúc này.',
            'Unable to connect to the routing service right now.',
            '当前无法连接路线规划服务。',
          ),
        );
      } finally {
        setRoutingPending(false);
      }
    },
    [position, locale, applyGpsFix, startGpsWatch],
  );

  function clearRoute() {
    setRouteCoordinates([]);
    setRouteInfo(null);
  }

  function handleSelect(place: Heritage) {
    setSelectedPlace(place);
  }

  function handleOpenDetail(place: Heritage, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setDetailModal(place);
  }

  useEffect(() => {
    if (!detailModal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDetailModal(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailModal]);

  const relatedChallenges = useMemo(
    () => (selectedPlace ? challenges.filter((c) => c.entry_id === selectedPlace.id) : []),
    [challenges, selectedPlace],
  );

  return (
    <>
      {/* Photo status tab bar */}
      <div className="map-photo-tabs">
        <button
          type="button"
          className={`map-photo-tab ${photoFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPhotoFilter('all')}
        >
          <span>{t(locale, 'photoFilterAll')}</span>
          <span className="tab-count">{entries.length}</span>
        </button>

        <button
          type="button"
          className={`map-photo-tab has-photo-tab ${photoFilter === 'with-photo' ? 'active' : ''}`}
          onClick={() => setPhotoFilter('with-photo')}
        >
          <Camera size={15} />
          <span>{t(locale, 'photoFilterWith')}</span>
          <span className="tab-count highlight">{totalWithPhotos}</span>
        </button>

        <button
          type="button"
          className={`map-photo-tab ${photoFilter === 'without-photo' ? 'active' : ''}`}
          onClick={() => setPhotoFilter('without-photo')}
        >
          <span>{t(locale, 'photoFilterWithout')}</span>
          <span className="tab-count">{entries.length - totalWithPhotos}</span>
        </button>
      </div>

      {/* Selected place detail + related challenges */}
      {selectedPlace && (
        <section className="map-selected-card" aria-live="polite">
          <div className="map-selected-media">
            {selectedPlace.hasImage && selectedPlace.image ? (
              <MapPlaceImg
                key={selectedPlace.image}
                src={selectedPlace.image}
                alt={selectedPlace.name}
                className="map-selected-img"
                fallback={
                  <span className="map-selected-placeholder">
                    <MapPin size={22} />
                  </span>
                }
              />
            ) : (
              <span className="map-selected-placeholder">
                <MapPin size={22} />
              </span>
            )}
            <span className="map-selected-category">
              {selectedPlace.categoryGroup
                ? labelCategoryGroup(selectedPlace.categoryGroup, locale)
                : selectedPlace.category || t(locale, selectedPlace.kind)}
            </span>
          </div>
          <div className="map-selected-body">
            <h3>{selectedPlace.name}</h3>
            <p className="map-selected-meta">
              <MapPin size={13} />
              {selectedPlace.address || selectedPlace.region}
              {position &&
                selectedPlace.latitude !== null &&
                selectedPlace.longitude !== null && (
                  <span className="map-selected-distance">
                    ·{' '}
                    {distanceKm(position, {
                      latitude: selectedPlace.latitude,
                      longitude: selectedPlace.longitude,
                    }).toFixed(1)}{' '}
                    km
                  </span>
                )}
            </p>
            {selectedPlace.description && (
              <p className="map-selected-desc">{selectedPlace.description}</p>
            )}
            {selectedPlace.history &&
              normalizeSearch(selectedPlace.history) !==
                normalizeSearch(selectedPlace.description || '') && (
                <p className="map-selected-desc">{selectedPlace.history}</p>
              )}
            <div className="map-selected-actions">
              <button
                type="button"
                className="text-btn"
                onClick={() => handleOpenDetail(selectedPlace)}
              >
                <Info size={13} /> {t(locale, 'placeDetails')}
              </button>
              <button
                type="button"
                className="text-btn route-btn"
                disabled={routingPending}
                onClick={() => handleRequestRoute(selectedPlace)}
              >
                <Compass size={13} /> {copy(locale, 'Hiện đường', 'Route', '显示路线')}
              </button>
              <Link
                className="text-btn explore-link-btn"
                href={`/${locale}/explore/${selectedPlace.slug}`}
              >
                {t(locale, 'open')}
                <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="map-selected-challenges">
              <h4>
                <Trophy size={15} />
                {t(locale, 'relatedChallenges')}
              </h4>
              {relatedChallenges.length ? (
                relatedChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    className="map-selected-challenge"
                    href={`/${locale}/challenges#${challenge.id}`}
                  >
                    <span className="map-selected-challenge-xp">
                      <Sparkles size={11} />
                      {challenge.points} XP
                    </span>
                    <strong>
                      {textFor(challenge.translations, locale).title}
                    </strong>
                    <ArrowUpRight size={14} />
                  </Link>
                ))
              ) : (
                <p className="map-selected-empty">{t(locale, 'noRelatedChallenges')}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="map-selected-close"
            onClick={() => setSelectedPlace(null)}
            aria-label={t(locale, 'close')}
          >
            <X size={16} />
          </button>
        </section>
      )}

      {/* Main control panel */}
      <div className="map-controls">
        <div className="search-box">
          <Search size={18} />
          <label className="sr-only" htmlFor="map-search">
            {t(locale, 'search')}
          </label>
          <input
            id="map-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, 'searchPlaces')}
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery('')}
              aria-label={t(locale, 'clear')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <label className="select-wrapper">
          <span className="sr-only">{t(locale, 'categoryFilter')}</span>
          <select
            value={categoryGroup}
            onChange={(e) => setCategoryGroup(e.target.value)}
          >
            <option value="">{t(locale, 'allCategories')}</option>
            {hcmCategoryGroups
              .filter((cat) => cat !== 'Tất cả')
              .map((cat) => (
                <option key={cat} value={cat}>
                  {labelCategoryGroup(cat, locale)}
                </option>
              ))}
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </label>

        <label className="select-wrapper">
          <span className="sr-only">{t(locale, 'selectRegion')}</span>
          <select
            value={region}
            onChange={(e) => {
              const nextRegion = e.target.value;
              setRegion(nextRegion);
              gpsActiveRef.current = false;
              stopGpsWatch();
              setPosition(null);
              setAccuracyMeters(null);
            }}
          >
            <option value="">{t(locale, 'allRegions')}</option>
            {allRegions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </label>
      </div>

      {/* Clean Compact GPS & Discovery Radius Toolbar */}
      <div className="map-location">
        <div className="location-btn-group">
          <button
            type="button"
            className={`icon-locate-btn ${position ? 'active' : ''}`}
            onClick={() => locateDevice(true)}
            disabled={pending || routingPending}
            aria-label={t(locale, 'locateMe')}
            title={t(locale, 'locateMe')}
          >
            <LocateFixed size={17} />
          </button>

          {position && (
            <div className="gps-coords-pill">
              <span className="gps-live-dot" aria-hidden="true" />
              <span>
                GPS {position.latitude.toFixed(4)}°N, {position.longitude.toFixed(4)}°E
                {typeof accuracyMeters === 'number' && accuracyMeters > 0
                  ? ` (±${Math.max(1, Math.round(accuracyMeters))}m)`
                  : ''}
              </span>
              <button
                type="button"
                className="gps-reset-icon-btn"
                onClick={() => {
                  gpsActiveRef.current = false;
                  stopGpsWatch();
                  setPosition(null);
                  setAccuracyMeters(null);
                  clearRoute();
                }}
                aria-label={t(locale, 'clear')}
                title={t(locale, 'clear')}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        <label className="radius-field">
          <span>
            {t(locale, 'radius')} <b>{radius} km</b>
          </span>
          <input
            type="range"
            disabled={!ready}
            value={radius}
            min={3}
            max={10}
            step={1}
            onChange={(e) => store(Number(e.target.value))}
          />
        </label>
      </div>

      <Status message={message} error />

      {/* Map Layout */}
      <div className="map-layout">
        <MapCanvas
          entries={filtered}
          locale={locale}
          position={position}
          accuracyMeters={accuracyMeters}
          locateTrigger={locateTrigger}
          radius={radius}
          selectedPlace={selectedPlace}
          routeCoordinates={routeCoordinates}
          routeInfo={routeInfo}
          onSelectPlace={handleSelect}
          onRequestRoute={handleRequestRoute}
          onClearRoute={clearRoute}
          onLocateMe={() => locateDevice(true)}
        />

        <div className="map-results">
          <div className="results-header">
            <p className="result-meta">
              <strong>{filtered.length}</strong> {t(locale, 'resultCount')}
              <span className="photo-count-badge">
                <Sparkles size={12} />
                {filteredWithPhotos} {t(locale, 'placesWithPhotos')}
              </span>
            </p>
          </div>

          {filtered.length ? (
            <>
              <div className="places-scroll-list">
                {filtered.slice(0, displayCount).map((e) => {
                  const hasPhoto = Boolean(e.hasImage || e.image);
                  const isSelected = selectedPlace?.id === e.id;

                  return (
                    <article
                      key={e.id}
                      className={`nearby-item hcm-place-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div
                        className="place-thumb-container"
                        onClick={() => handleSelect(e)}
                      >
                        {hasPhoto && e.image ? (
                          <MapPlaceImg
                            key={e.image}
                            src={e.image}
                            alt={e.name}
                            className="place-thumb"
                            fallback={
                              <div className="place-thumb-placeholder">
                                <MapPin size={20} />
                              </div>
                            }
                          />
                        ) : (
                          <div className="place-thumb-placeholder">
                            <MapPin size={20} />
                          </div>
                        )}
                        {hasPhoto && (
                          <span className="thumb-photo-tag" title={t(locale, 'photoFilterVerified')}>
                            <Camera size={11} />
                          </span>
                        )}
                      </div>

                      <div className="place-info">
                        <div className="place-top-row">
                          <span className="place-category-tag">
                            {e.categoryGroup
                              ? labelCategoryGroup(e.categoryGroup, locale)
                              : e.category || t(locale, e.kind)}
                          </span>
                          {hasPhoto ? (
                            <span className="verified-pill">
                              {copy(locale, 'Ảnh thực tế', 'Verified photo', '实景照片')}
                            </span>
                          ) : (
                            <span className="pending-pill">
                              {copy(locale, 'Đang cập nhật', 'Updating photo', '照片待补充')}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="place-name-btn"
                          onClick={() => handleSelect(e)}
                        >
                          {e.name}
                        </button>

                        <small className="place-address">
                          <MapPin size={12} />
                          {position
                            ? `${distanceKm(position, { latitude: e.latitude!, longitude: e.longitude! }).toFixed(1)} km · ${e.region}`
                            : e.address || e.region}
                        </small>

                        <div className="place-card-actions">
                          <button
                            type="button"
                            className="text-btn quick-view-btn"
                            onClick={(ev) => handleOpenDetail(e, ev)}
                          >
                            <Info size={13} /> {t(locale, 'placeDetails')}
                          </button>

                          <button
                            type="button"
                            className="text-btn route-btn"
                            disabled={routingPending}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRequestRoute(e);
                            }}
                          >
                            <Compass size={13} /> {copy(locale, 'Hiện đường', 'Route', '显示路线')}
                          </button>

                          <Link
                            className="text-btn explore-link-btn"
                            href={`/${locale}/explore/${e.slug}`}
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {t(locale, 'open')}
                            <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filtered.length > displayCount && (
                <div className="load-more-container">
                  <button
                    type="button"
                    className="button secondary small load-more-btn"
                    onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                  >
                    {copy(
                      locale,
                      `Xem thêm (${Math.min(PAGE_SIZE, filtered.length - displayCount)}/${filtered.length - displayCount} địa điểm còn lại)`,
                      `Load more (${Math.min(PAGE_SIZE, filtered.length - displayCount)} of ${filtered.length - displayCount} remaining)`,
                      `加载更多（剩余 ${filtered.length - displayCount} 处中的 ${Math.min(PAGE_SIZE, filtered.length - displayCount)} 处）`,
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Empty locale={locale} />
          )}
        </div>
      </div>

      {/* Quick View Place Modal */}
      {detailModal && (
        <div className="place-modal-overlay" onClick={() => setDetailModal(null)}>
          <div
            className="place-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setDetailModal(null)}
              aria-label={t(locale, 'close')}
            >
              <X size={20} />
            </button>

            {detailModal.hasImage && detailModal.image && (
              <div className="modal-hero-photo">
                <MapPlaceImg
                  key={detailModal.image}
                  src={detailModal.image}
                  alt={detailModal.name}
                  className="modal-img"
                  fallback={null}
                />
                {(detailModal.image_author || detailModal.image_license) && (
                  <div className="modal-photo-credit">
                    <Sparkles size={12} />
                    <span>
                      {t(locale, 'photoCredit')}:{' '}
                      {[detailModal.image_author, detailModal.image_license]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="modal-body">
              <div className="modal-tags">
                <span className="pill primary">
                  {detailModal.category || t(locale, detailModal.kind)}
                </span>
                <span className="pill">{detailModal.region}</span>
                {detailModal.hasImage ? (
                  <span className="pill verified">{t(locale, 'photoFilterVerified')}</span>
                ) : (
                  <span className="pill warning">{t(locale, 'photoFilterWithout')}</span>
                )}
              </div>

              <h2 id="map-modal-title">{detailModal.name}</h2>

              {detailModal.address && (
                <p className="modal-address">
                  <MapPin size={16} />
                  <span>{detailModal.address}</span>
                </p>
              )}

              {detailModal.description && (
                <div className="modal-section">
                  <h3>{copy(locale, 'Mô tả', 'Overview', '地点简介')}</h3>
                  <p>{detailModal.description}</p>
                </div>
              )}

              {detailModal.history && (
                <div className="modal-section">
                  <h3>{copy(locale, 'Lịch sử & Nguồn gốc', 'History & Origin', '历史与渊源')}</h3>
                  <p>{detailModal.history}</p>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={routingPending}
                  onClick={() => {
                    handleRequestRoute(detailModal);
                    setDetailModal(null);
                  }}
                >
                  <Compass size={16} />
                  {copy(
                    locale,
                    'Hiện tuyến đường đến đây',
                    'Show street route here',
                    '显示前往此地的路线',
                  )}
                </button>

                {detailModal.latitude && detailModal.longitude && (
                  <a
                    className="button secondary"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${detailModal.latitude},${detailModal.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation size={16} />
                    {copy(locale, 'Mở Google Maps', 'Open Google Maps', '打开 Google 地图')}
                  </a>
                )}

                <Link
                  className="button ghost"
                  href={`/${locale}/explore/${detailModal.slug}`}
                  onClick={() => setDetailModal(null)}
                >
                  {t(locale, 'open')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
