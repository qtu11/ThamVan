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
} from 'lucide-react';
import type { Heritage, Locale, Profile } from '@/lib/types';
import { distanceKm, normalizeSearch, type Coordinates } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useDiscoveryPreferences } from './discovery';
import { Empty, Status } from './ui';
import { hcmCategoryGroups } from '@/data/hcm-places';

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
}: {
  entries: Heritage[];
  locale: Locale;
  focus?: string;
  profile?: Profile;
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
    const q = normalizeSearch(query.trim());
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

      if (q) {
        const target = normalizeSearch(
          `${e.name} ${e.address || ''} ${e.category || ''} ${e.region} ${(e.aliases || []).join(' ')}`,
        );
        if (!target.includes(q)) return false;
      }

      if (position) {
        const d = distanceKm(position, { latitude: e.latitude, longitude: e.longitude });
        if (d > radius) return false;
      }

      return true;
    });
  }, [entries, photoFilter, categoryGroup, region, query, position, radius]);

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
          }
        }
      } catch (err) {
        console.error('Route error:', err);
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
              aria-label="Clear"
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
            {hcmCategoryGroups.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
            max={25}
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
                    <div
                      key={e.id}
                      className={`nearby-item hcm-place-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(e)}
                    >
                      <div className="place-thumb-container">
                        {hasPhoto && e.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={e.image}
                            alt={e.name}
                            className="place-thumb"
                            loading="lazy"
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
                            {e.categoryGroup || e.category}
                          </span>
                          {hasPhoto ? (
                            <span className="verified-pill">Ảnh thực tế</span>
                          ) : (
                            <span className="pending-pill">Đang cập nhật</span>
                          )}
                        </div>

                        <strong className="place-name">{e.name}</strong>

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
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRequestRoute(e);
                            }}
                          >
                            <Compass size={13} /> Hiện đường
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
                    </div>
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
                    Xem thêm ({Math.min(PAGE_SIZE, filtered.length - displayCount)}/{filtered.length - displayCount} địa điểm còn lại)
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
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setDetailModal(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {detailModal.hasImage && detailModal.image && (
              <div className="modal-hero-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detailModal.image}
                  alt={detailModal.name}
                  className="modal-img"
                />
                <div className="modal-photo-credit">
                  <Sparkles size={12} />
                  <span>
                    Ảnh: {detailModal.image_author} · {detailModal.image_license}
                  </span>
                </div>
              </div>
            )}

            <div className="modal-body">
              <div className="modal-tags">
                <span className="pill primary">{detailModal.category}</span>
                <span className="pill">{detailModal.region}</span>
                {detailModal.hasImage ? (
                  <span className="pill verified">Ảnh thực tế đã kiểm chứng</span>
                ) : (
                  <span className="pill warning">Đang cập nhật ảnh</span>
                )}
              </div>

              <h2>{detailModal.name}</h2>

              {detailModal.address && (
                <p className="modal-address">
                  <MapPin size={16} />
                  <span>{detailModal.address}</span>
                </p>
              )}

              {detailModal.description && (
                <div className="modal-section">
                  <h3>Mô tả</h3>
                  <p>{detailModal.description}</p>
                </div>
              )}

              {detailModal.history && (
                <div className="modal-section">
                  <h3>Lịch sử & Nguồn gốc</h3>
                  <p>{detailModal.history}</p>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    handleRequestRoute(detailModal);
                    setDetailModal(null);
                  }}
                >
                  <Compass size={16} />
                  Hiện tuyến đường đến đây
                </button>

                {detailModal.latitude && detailModal.longitude && (
                  <a
                    className="button secondary"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${detailModal.latitude},${detailModal.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation size={16} />
                    Mở Google Maps
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
