'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, latLngBounds, type DivIcon } from 'leaflet';
import Link from 'next/link';
import {
  ExternalLink,
  Navigation,
  MapPin,
  Sparkles,
  Layers,
  Compass,
  LocateFixed,
} from 'lucide-react';
import type { Heritage, Locale } from '@/lib/types';
import { distanceKm, type Coordinates } from '@/lib/geo';
import { t } from '@/lib/i18n';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = {
  esriStreet: {
    name: 'Bản đồ đường phố sắc nét',
    url: '/api/tiles?layer=esriStreet&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
  },
  heritageLight: {
    name: 'Bản đồ di sản tối giản',
    url: '/api/tiles?layer=heritageLight&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
  },
  esriTopo: {
    name: 'Bản đồ địa hình & cảnh quan',
    url: '/api/tiles?layer=esriTopo&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
  },
  esriSat: {
    name: 'Ảnh vệ tinh (Satellite)',
    url: '/api/tiles?layer=esriSat&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
  },
};

const CAMERA_PIN_SVG =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.2"/></svg>';

const COMPASS_PIN_SVG =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z"/></svg>';

const photoMarkerIcon = divIcon({
  className: 'heritage-marker has-photo-marker',
  html: `<span class="pin-inner"><span class="pin-glyph">${CAMERA_PIN_SVG}</span></span>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -38],
});

const standardMarkerIcon = divIcon({
  className: 'heritage-marker standard-marker',
  html: `<span class="pin-inner"><span class="pin-glyph">${COMPASS_PIN_SVG}</span></span>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -32],
});

const selectedMarkerIcon = divIcon({
  className: 'heritage-marker selected-marker',
  html: `<span class="pin-selected-halo"></span><span class="pin-inner"><span class="pin-glyph">${CAMERA_PIN_SVG}</span></span>`,
  iconSize: [38, 46],
  iconAnchor: [19, 46],
  popupAnchor: [0, -44],
});

const userLocationIcon = divIcon({
  className: 'user-location-marker',
  html: '<div class="user-location-pulse"><div class="user-location-dot"></div></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const clusterIconCache = new Map<string, DivIcon>();

function getClusterIcon(count: number, hasPhoto: boolean): DivIcon {
  const key = `${count}:${hasPhoto ? 1 : 0}`;
  const cached = clusterIconCache.get(key);
  if (cached) return cached;

  const size = count >= 50 ? 46 : count >= 15 ? 40 : 35;
  const icon = divIcon({
    className: `heritage-cluster-marker ${hasPhoto ? 'has-photo-cluster' : 'standard-cluster'}`,
    html: `<div class="cluster-badge" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  clusterIconCache.set(key, icon);
  return icon;
}

type ClusterGroup = {
  id: string;
  latitude: number;
  longitude: number;
  items: Heritage[];
  hasPhoto: boolean;
};

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

function ClusterMarkerItem({ cluster }: { cluster: ClusterGroup }) {
  const map = useMap();
  const icon = useMemo(
    () => getClusterIcon(cluster.items.length, cluster.hasPhoto),
    [cluster.items.length, cluster.hasPhoto],
  );

  return (
    <Marker
      position={[cluster.latitude, cluster.longitude]}
      icon={icon}
      title={`${cluster.items.length} địa điểm di sản — Nhấn để phóng to`}
      eventHandlers={{
        click: () => {
          const bounds = latLngBounds(
            cluster.items.map((item) => [item.latitude!, item.longitude!] as [number, number]),
          );
          map.flyToBounds(bounds, {
            padding: [56, 56],
            maxZoom: Math.min(map.getZoom() + 3, 17),
            duration: 0.65,
          });
        },
      }}
    />
  );
}

function MapController({
  entries,
  position,
  selectedPlace,
  routeCoordinates,
  locateTrigger,
}: {
  entries: Heritage[];
  position: Coordinates | null;
  selectedPlace: Heritage | null;
  routeCoordinates?: [number, number][];
  locateTrigger?: number;
}) {
  const map = useMap();
  const lastPositionKeyRef = useRef<string>('');
  const lastSelectedIdRef = useRef<string>('');
  const initializedBoundsRef = useRef(false);

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      map.fitBounds(latLngBounds(routeCoordinates), {
        padding: [60, 60],
        maxZoom: 16,
      });
    }
  }, [map, routeCoordinates]);

  useEffect(() => {
    if (!selectedPlace?.latitude || !selectedPlace?.longitude) {
      lastSelectedIdRef.current = '';
      return;
    }
    if (lastSelectedIdRef.current === selectedPlace.id) return;
    lastSelectedIdRef.current = selectedPlace.id;
    map.flyTo([selectedPlace.latitude, selectedPlace.longitude], 16, {
      duration: 0.9,
    });
  }, [map, selectedPlace]);

  useEffect(() => {
    if (!position) {
      lastPositionKeyRef.current = '';
      return;
    }
    const posKey = `${position.latitude.toFixed(5)}:${position.longitude.toFixed(5)}:${locateTrigger || 0}`;
    if (lastPositionKeyRef.current === posKey) return;
    lastPositionKeyRef.current = posKey;
    map.flyTo([position.latitude, position.longitude], 15, {
      duration: 0.85,
    });
  }, [map, position, locateTrigger]);

  useEffect(() => {
    if (position || selectedPlace || (routeCoordinates && routeCoordinates.length > 0)) {
      return;
    }
    const coords = entries.flatMap((e) =>
      e.latitude !== null && e.longitude !== null
        ? [[e.latitude, e.longitude] as [number, number]]
        : [],
    );

    if (coords.length > 0) {
      if (coords.length > 200) {
        if (!initializedBoundsRef.current) {
          initializedBoundsRef.current = true;
          map.setView([10.7769, 106.7009], 12);
        }
      } else {
        map.fitBounds(latLngBounds(coords), { padding: [44, 44], maxZoom: 15 });
      }
    }
  }, [map, entries, position, selectedPlace, routeCoordinates]);

  return null;
}

export default function MapCanvas({
  entries,
  locale,
  position,
  accuracyMeters,
  locateTrigger,
  radius,
  selectedPlace,
  routeCoordinates,
  routeInfo,
  onSelectPlace,
  onRequestRoute,
  onClearRoute,
  onLocateMe,
}: {
  entries: Heritage[];
  locale: Locale;
  position: Coordinates | null;
  accuracyMeters?: number | null;
  locateTrigger?: number;
  radius: number;
  selectedPlace?: Heritage | null;
  routeCoordinates?: [number, number][];
  routeInfo?: {
    distanceKm: number;
    durationMinutes: number;
  } | null;
  onSelectPlace?: (place: Heritage) => void;
  onRequestRoute?: (place: Heritage) => void;
  onClearRoute?: () => void;
  onLocateMe?: () => void;
}) {
  const [activeTileLayer, setActiveTileLayer] = useState<keyof typeof TILE_LAYERS>('esriStreet');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [zoom, setZoom] = useState(12);
  const currentTile = TILE_LAYERS[activeTileLayer];

  const validEntries = useMemo(() => {
    return entries.filter((e) => e.latitude !== null && e.longitude !== null);
  }, [entries]);

  // Spatial clustering at lower zoom levels so pins never pile into an illegible blob
  const { singleMarkers, clusters } = useMemo(() => {
    if (zoom >= 15 || validEntries.length <= 24) {
      return { singleMarkers: validEntries, clusters: [] as ClusterGroup[] };
    }

    const cellSize = 0.055 / Math.pow(2, Math.max(0, zoom - 11));
    const buckets = new Map<string, Heritage[]>();
    const singles: Heritage[] = [];

    for (const item of validEntries) {
      if (selectedPlace && item.id === selectedPlace.id) {
        singles.push(item);
        continue;
      }
      const gx = Math.floor(item.longitude! / cellSize);
      const gy = Math.floor(item.latitude! / cellSize);
      const key = `${gx}:${gy}`;
      const list = buckets.get(key);
      if (list) {
        list.push(item);
      } else {
        buckets.set(key, [item]);
      }
    }

    const clusterList: ClusterGroup[] = [];
    for (const [key, list] of buckets.entries()) {
      if (list.length <= 2) {
        singles.push(...list);
      } else {
        let sumLat = 0;
        let sumLng = 0;
        let hasPhoto = false;
        for (const item of list) {
          sumLat += item.latitude!;
          sumLng += item.longitude!;
          if (item.hasImage || item.image) hasPhoto = true;
        }
        clusterList.push({
          id: `cluster-${key}`,
          latitude: sumLat / list.length,
          longitude: sumLng / list.length,
          items: list,
          hasPhoto,
        });
      }
    }

    return { singleMarkers: singles, clusters: clusterList };
  }, [validEntries, zoom, selectedPlace]);

  return (
    <div className="map-wrapper">
      {/* Tile Layer Switcher */}
      <div className="map-layer-switcher">
        <button
          type="button"
          className="layer-toggle-btn"
          onClick={() => setShowLayerMenu((v) => !v)}
          title="Đổi kiểu bản đồ"
        >
          <Layers size={15} />
          <span>Lớp bản đồ</span>
        </button>
        {showLayerMenu && (
          <div className="layer-menu">
            {(Object.keys(TILE_LAYERS) as (keyof typeof TILE_LAYERS)[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`layer-option-btn ${activeTileLayer === key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTileLayer(key);
                  setShowLayerMenu(false);
                }}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating GPS Recenter Action Button */}
      {onLocateMe && (
        <button
          type="button"
          className={`map-gps-fab ${position ? 'active' : ''}`}
          onClick={onLocateMe}
          tabIndex={-1}
          aria-hidden="true"
          title="Định vị chính xác vị trí GPS của tôi"
        >
          <LocateFixed size={18} />
        </button>
      )}

      {/* Route Info Overlay */}
      {routeInfo && routeCoordinates && routeCoordinates.length > 0 && (
        <div className="route-banner-overlay">
          <div className="route-banner-left">
            <Compass size={18} className="route-icon" />
            <div>
              <strong>Lộ trình thực tế: {routeInfo.distanceKm} km</strong>
              <span>Khoảng {routeInfo.durationMinutes} phút di chuyển qua các tuyến phố</span>
            </div>
          </div>
          {onClearRoute && (
            <button
              type="button"
              className="route-clear-btn"
              onClick={onClearRoute}
            >
              Ẩn tuyến đường
            </button>
          )}
        </div>
      )}

      <MapContainer
        center={[10.7769, 106.7009]}
        zoom={12}
        scrollWheelZoom={true}
        attributionControl={false}
        className="heritage-map"
      >
        <ZoomTracker onZoomChange={setZoom} />

        <TileLayer
          key={activeTileLayer}
          url={currentTile.url}
          subdomains={currentTile.subdomains}
          maxZoom={currentTile.maxZoom}
        />

        {/* Driving Route Polyline */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#114436',
                weight: 9,
                opacity: 0.28,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#963a1b',
                weight: 4.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* User Exact GPS Location Marker */}
        {position && (
          <>
            {typeof accuracyMeters === 'number' && accuracyMeters > 10 && (
              <Circle
                center={[position.latitude, position.longitude]}
                radius={Math.min(accuracyMeters, 450)}
                pathOptions={{
                  color: '#0284c7',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.12,
                  weight: 1,
                }}
              />
            )}

            <Marker
              position={[position.latitude, position.longitude]}
              icon={userLocationIcon}
              title="Vị trí GPS của bạn"
            >
              <Popup className="user-popup">
                <div className="user-popup-content">
                  <strong>Vị trí hiện tại của bạn</strong>
                  <small>
                    Tọa độ GPS: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </small>
                  {typeof accuracyMeters === 'number' && accuracyMeters > 0 && (
                    <small className="user-accuracy-note">
                      Độ chính xác: ±{Math.max(1, Math.round(accuracyMeters))} m
                    </small>
                  )}
                </div>
              </Popup>
            </Marker>

            <Circle
              center={[position.latitude, position.longitude]}
              radius={radius * 1000}
              pathOptions={{
                color: '#114436',
                fillColor: '#114436',
                fillOpacity: 0.045,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            />
          </>
        )}

        {/* Cluster Markers */}
        {clusters.map((cluster) => (
          <ClusterMarkerItem key={cluster.id} cluster={cluster} />
        ))}

        {/* Individual Place Markers */}
        {singleMarkers.map((e) => {
          const hasPhoto = Boolean(e.hasImage || e.image);
          const isSelected = selectedPlace?.id === e.id;
          const icon = isSelected
            ? selectedMarkerIcon
            : hasPhoto
              ? photoMarkerIcon
              : standardMarkerIcon;

          return (
            <Marker
              key={e.id}
              position={[e.latitude!, e.longitude!]}
              icon={icon}
              title={e.name}
              alt={e.name}
              zIndexOffset={isSelected ? 1000 : hasPhoto ? 200 : 0}
              eventHandlers={{
                click: () => onSelectPlace?.(e),
              }}
            >
              <Popup className="hcm-map-popup" maxWidth={320} minWidth={260}>
                <div className="popup-card">
                  {hasPhoto && e.image ? (
                    <div className="popup-photo-box">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.image}
                        alt={e.name}
                        className="popup-photo"
                        loading="lazy"
                      />
                      <span className="popup-photo-badge">
                        <Sparkles size={11} />
                        {t(locale, 'photoFilterVerified')}
                      </span>
                    </div>
                  ) : (
                    <div className="popup-no-photo-badge">
                      <MapPin size={12} />
                      <span>{t(locale, 'photoFilterWithout')}</span>
                    </div>
                  )}

                  <div className="popup-body">
                    <div className="popup-pills">
                      <span className="popup-cat-pill">
                        {e.category || t(locale, e.kind)}
                      </span>
                      <span className="popup-region-pill">{e.region}</span>
                    </div>

                    <h3 className="popup-title">{e.name}</h3>

                    {e.address && (
                      <p className="popup-address">
                        <MapPin size={13} />
                        <span>{e.address}</span>
                      </p>
                    )}

                    {position && e.latitude && e.longitude && (
                      <p className="popup-distance">
                        <Navigation size={12} />
                        <span>
                          Cách bạn{' '}
                          {distanceKm(position, {
                            latitude: e.latitude,
                            longitude: e.longitude,
                          }).toFixed(1)}{' '}
                          km
                        </span>
                      </p>
                    )}

                    <div className="popup-actions">
                      <Link
                        className="button primary small popup-btn"
                        href={`/${locale}/explore/${e.slug}`}
                      >
                        {t(locale, 'open')}
                      </Link>

                      {onRequestRoute && (
                        <button
                          type="button"
                          className="button secondary small popup-btn route-btn-action"
                          onClick={() => onRequestRoute(e)}
                          title="Vẽ tuyến đường thực tế đến đây"
                        >
                          <Compass size={14} />
                          Hiện đường
                        </button>
                      )}

                      <a
                        className="button secondary small popup-btn"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${e.latitude},${e.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t(locale, 'directions')}
                      >
                        <ExternalLink size={14} />
                        Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController
          entries={entries}
          position={position}
          selectedPlace={selectedPlace || null}
          routeCoordinates={routeCoordinates}
          locateTrigger={locateTrigger}
        />
      </MapContainer>
    </div>
  );
}
