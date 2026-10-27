'use client';
import dynamic from 'next/dynamic';
import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Globe,
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
    focus ? entries.find((e) => e.slug === focus || e.id.toLowerCase() === focus.toLowerCase())?.region || '' : '',
  );
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with-photo' | 'without-photo'>('all');
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [userIpInfo, setUserIpInfo] = useState<{
    ip: string;
    city: string;
    region?: string;
    isp?: string;
  } | null>(null);
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

  const { radius, store, ready } = useDiscoveryPreferences(profile);

  // Extract distinct regions
  const allRegions = useMemo(() => {
    const list = [...new Set(entries.map((e) => e.region).filter(Boolean))];
    return list.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [entries]);

  // Filter places
  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return entries.filter((e) => {
      // Must have valid coordinates
      if (e.latitude === null || e.longitude === null) return false;

      // Photo status filter
      const hasPhoto = Boolean(e.hasImage || e.image);
      if (photoFilter === 'with-photo' && !hasPhoto) return false;
      if (photoFilter === 'without-photo' && hasPhoto) return false;

      // Category group filter
      if (categoryGroup && categoryGroup !== 'Tất cả' && e.categoryGroup !== categoryGroup) {
        return false;
      }

      // Region filter
      if (region && e.region !== region) {
        return false;
      }

      // Text search
      if (q) {
        const target = normalizeSearch(
          `${e.name} ${e.address || ''} ${e.category || ''} ${e.region} ${(e.aliases || []).join(' ')}`,
        );
        if (!target.includes(q)) return false;
      }

      // Geo radius filter
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

  // Auto-detect IP and device location quietly on mount
  useEffect(() => {
    fetch('/api/locate')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.ip) {
          setUserIpInfo({
            ip: data.ip,
            city: data.city || 'TP. Hồ Chí Minh',
            region: data.region,
            isp: data.isp,
          });
        }
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setPosition({ latitude: data.latitude, longitude: data.longitude });
        }
      })
      .catch(() => {});
  }, []);

  // Detect IP and device location
  const locateDevice = useCallback(async () => {
    setPending(true);
    setMessage('');

    let foundCoords: Coordinates | null = null;

    // Fetch IP and Geo from /api/locate
    try {
      const res = await fetch('/api/locate');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) {
          setUserIpInfo({
            ip: data.ip,
            city: data.city || 'TP. Hồ Chí Minh',
            region: data.region,
            isp: data.isp,
          });
        }
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          foundCoords = { latitude: data.latitude, longitude: data.longitude };
          setPosition(foundCoords);
          setRegion('');
        }
      }
    } catch {
      // Continue to try browser geolocation
    }

    // Try browser GPS for higher precision
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const highPrecisionCoords = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          };
          setPosition(highPrecisionCoords);
          setRegion('');
          setPending(false);
        },
        () => {
          // If browser denied but we got IP coords, keep IP coords
          if (!foundCoords) {
            setMessage(t(locale, 'locationDenied'));
          }
          setPending(false);
        },
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true },
      );
    } else {
      setPending(false);
    }
  }, [locale]);

  // Request actual driving route to destination
  const handleRequestRoute = useCallback(
    async (place: Heritage) => {
      if (!place.latitude || !place.longitude) return;

      // If user has no position yet, locate device first
      let currentPos = position;
      if (!currentPos) {
        setRoutingPending(true);
        try {
          const res = await fetch('/api/locate');
          if (res.ok) {
            const data = await res.json();
            currentPos = { latitude: data.latitude, longitude: data.longitude };
            setPosition(currentPos);
            setUserIpInfo({
              ip: data.ip,
              city: data.city,
              isp: data.isp,
            });
          }
        } catch {
          currentPos = { latitude: 10.822, longitude: 106.6257 };
          setPosition(currentPos);
        }
      }

      if (!currentPos) {
        setRoutingPending(false);
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
    [position],
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
              setRegion(e.target.value);
              setPosition(null);
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

      {/* Location, IP, and Radius Bar */}
      <div className="map-location">
        <div className="location-btn-group">
          <button
            type="button"
            className="button secondary small locate-btn"
            onClick={locateDevice}
            disabled={pending || routingPending}
          >
            <LocateFixed size={16} />
            {t(locale, pending ? 'loading' : 'locateMe')}
          </button>

          {position && (
            <button
              type="button"
              className="button ghost small clear-locate-btn"
              onClick={() => {
                setPosition(null);
                clearRoute();
              }}
            >
              <X size={14} /> Tắt định vị
            </button>
          )}

          {userIpInfo && (
            <div className="device-ip-badge">
              <Globe size={13} />
              <span>
                <strong>IP:</strong> {userIpInfo.ip} &middot;{' '}
                <strong>Vị trí thiết bị:</strong> {userIpInfo.city}{' '}
                {userIpInfo.isp ? `(${userIpInfo.isp})` : ''}
              </span>
            </div>
          )}

          <p className="help-text">{t(locale, 'locationPurpose')}</p>
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
          radius={radius}
          selectedPlace={selectedPlace}
          userIpInfo={userIpInfo}
          routeCoordinates={routeCoordinates}
          routeInfo={routeInfo}
          onSelectPlace={handleSelect}
          onRequestRoute={handleRequestRoute}
          onClearRoute={clearRoute}
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
                            📷
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
