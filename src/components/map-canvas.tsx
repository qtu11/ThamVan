'use client';
import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import Link from 'next/link';
import { ExternalLink, Navigation, MapPin, Sparkles, Layers, Compass } from 'lucide-react';
import type { Heritage, Locale } from '@/lib/types';
import { distanceKm, type Coordinates } from '@/lib/geo';
import { t } from '@/lib/i18n';
import 'leaflet/dist/leaflet.css';

// Tile servers
const TILE_LAYERS = {
  esriStreet: {
    name: 'Bản đồ đường phố TP.HCM',
    url: '/api/tiles?layer=esriStreet&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; Esri &mdash; Bản đồ đường bộ TP.HCM',
  },
  esriTopo: {
    name: 'Bản đồ địa hình & cảnh quan',
    url: '/api/tiles?layer=esriTopo&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; Esri &mdash; Topographic',
  },
  esriSat: {
    name: 'Ảnh vệ tinh (Satellite)',
    url: '/api/tiles?layer=esriSat&z={z}&x={x}&y={y}',
    subdomains: 'abc',
    maxZoom: 19,
    attribution: '&copy; Esri &mdash; Earthstar Geographics',
  },
};

// Singleton icons
const photoMarkerIcon = divIcon({
  className: 'heritage-marker has-photo-marker',
  html: '<span class="pin-inner"><span class="pin-photo-indicator">📷</span>✦</span>',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -42],
});

const standardMarkerIcon = divIcon({
  className: 'heritage-marker standard-marker',
  html: '<span class="pin-inner">✦</span>',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -34],
});

const userLocationIcon = divIcon({
  className: 'user-location-marker',
  html: '<div class="user-location-pulse"><div class="user-location-dot"></div></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

function MapController({
  entries,
  position,
  radius,
  selectedPlace,
  routeCoordinates,
}: {
  entries: Heritage[];
  position: Coordinates | null;
  radius: number;
  selectedPlace: Heritage | null;
  routeCoordinates?: [number, number][];
}) {
  const map = useMap();

  // Invalidate map size on mount and window resize to prevent grey blank tiles
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    // If routing line exists, fit bounds to show both user and destination
    if (routeCoordinates && routeCoordinates.length > 0) {
      map.fitBounds(latLngBounds(routeCoordinates), {
        padding: [60, 60],
        maxZoom: 16,
      });
      return;
    }

    // If a place is selected, fly to it
    if (selectedPlace?.latitude && selectedPlace?.longitude) {
      map.flyTo([selectedPlace.latitude, selectedPlace.longitude], 15, {
        duration: 1.2,
      });
      return;
    }

    // If user position is set
    if (position) {
      map.setView([position.latitude, position.longitude], 13);
      return;
    }

    // Default view for entries
    const coords = entries.flatMap((e) =>
      e.latitude !== null && e.longitude !== null
        ? [[e.latitude, e.longitude] as [number, number]]
        : [],
    );

    if (coords.length > 0) {
      if (coords.length > 200) {
        map.setView([10.776, 106.700], 11);
      } else {
        map.fitBounds(latLngBounds(coords), { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [map, entries, position, radius, selectedPlace, routeCoordinates]);

  return null;
}

export default function MapCanvas({
  entries,
  locale,
  position,
  radius,
  selectedPlace,
  userIpInfo,
  routeCoordinates,
  routeInfo,
  onSelectPlace,
  onRequestRoute,
  onClearRoute,
}: {
  entries: Heritage[];
  locale: Locale;
  position: Coordinates | null;
  radius: number;
  selectedPlace?: Heritage | null;
  userIpInfo?: {
    ip: string;
    city: string;
    region?: string;
    isp?: string;
  } | null;
  routeCoordinates?: [number, number][];
  routeInfo?: {
    distanceKm: number;
    durationMinutes: number;
  } | null;
  onSelectPlace?: (place: Heritage) => void;
  onRequestRoute?: (place: Heritage) => void;
  onClearRoute?: () => void;
}) {
  const [activeTileLayer, setActiveTileLayer] = useState<keyof typeof TILE_LAYERS>('esriStreet');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const currentTile = TILE_LAYERS[activeTileLayer];

  const markers = useMemo(() => {
    return entries.filter((e) => e.latitude !== null && e.longitude !== null);
  }, [entries]);

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
          <Layers size={16} />
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

      {/* Route Info Overlay */}
      {routeInfo && routeCoordinates && routeCoordinates.length > 0 && (
        <div className="route-banner-overlay">
          <div className="route-banner-left">
            <Compass size={18} className="route-icon" />
            <div>
              <strong>Lộ trình thực tế: {routeInfo.distanceKm} km</strong>
              <span>Khoảng {routeInfo.durationMinutes} phút lái xe qua các tuyến phố</span>
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
        center={[10.776, 106.700]}
        zoom={12}
        scrollWheelZoom={true}
        className="heritage-map"
      >
        <TileLayer
          key={activeTileLayer}
          attribution={currentTile.attribution}
          url={currentTile.url}
          subdomains={currentTile.subdomains}
          maxZoom={currentTile.maxZoom}
        />

        {/* Driving Route Polyline */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <>
            {/* Outer glow polyline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#0284c7',
                weight: 8,
                opacity: 0.45,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner primary polyline */}
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#0ea5e9',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* User / Device Location Marker */}
        {position && (
          <>
            <Marker
              position={[position.latitude, position.longitude]}
              icon={userLocationIcon}
              title="Vị trí thiết bị của bạn"
            >
              <Popup className="user-popup">
                <div className="user-popup-content">
                  <strong>Vị trí thiết bị của bạn</strong>
                  {userIpInfo && (
                    <p className="user-ip-info">
                      IP: <code>{userIpInfo.ip}</code>
                      <br />
                      Khu vực: {userIpInfo.city} ({userIpInfo.isp || 'Internet'})
                    </p>
                  )}
                  <small>
                    Tọa độ: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>

            <Circle
              center={[position.latitude, position.longitude]}
              radius={radius * 1000}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#0284c7',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '4, 6',
              }}
            />
          </>
        )}

        {/* Place Markers */}
        {markers.map((e) => {
          const hasPhoto = Boolean(e.hasImage || e.image);
          const icon = hasPhoto ? photoMarkerIcon : standardMarkerIcon;

          return (
            <Marker
              key={e.id}
              position={[e.latitude!, e.longitude!]}
              icon={icon}
              title={e.name}
              alt={e.name}
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
          radius={radius}
          selectedPlace={selectedPlace || null}
          routeCoordinates={routeCoordinates}
        />
      </MapContainer>
    </div>
  );
}
