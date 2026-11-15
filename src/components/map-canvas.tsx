'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
// maplibre-gl 6 ships named exports only (no default export).
import * as maplibregl from 'maplibre-gl';
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  Popup,
  StyleSpecification,
} from 'maplibre-gl';
import type { FeatureCollection as GeoFeatureCollection, Geometry, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Locale } from '@/lib/types';
import type { LiveFix } from '@/lib/device-location';
import type { Basemap, MapPlace, MapView, OsmPlace } from '@/lib/map-types';
import type { LngLat, RouteMode } from '@/lib/routing';
import { copy } from '@/lib/locale-copy';

/**
 * Vector basemap (OpenFreeMap / OpenStreetMap data) rendered with MapLibre GL.
 * This component only draws: places, the visitor's live position and a routed line.
 */
const BASEMAP_HOST = 'https://tiles.openfreemap.org';
const HCM_CENTER: LngLat = [106.7009, 10.7769];
const HIT_LAYERS = ['tv-places-point', 'tv-places-cluster', 'tv-pois-dot'];
const FONT_REGULAR = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];

type FeatureCollection = GeoFeatureCollection<Geometry>;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

function styleFor(basemap: Basemap): string | StyleSpecification {
  if (basemap === 'satellite')
    return {
      version: 8,
      glyphs: `${BASEMAP_HOST}/fonts/{fontstack}/{range}.pbf`,
      sources: {
        satellite: {
          type: 'raster',
          tiles: [`${window.location.origin}/api/tiles?layer=esriSat&z={z}&x={x}&y={y}`],
          tileSize: 256,
          maxzoom: 19,
          attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
        },
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
    };
  if (basemap === 'light') return `${BASEMAP_HOST}/styles/positron`;
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || `${BASEMAP_HOST}/styles/liberty`;
}

const pointCollection = <T extends { id: string; name: string; latitude: number; longitude: number }>(
  items: T[],
  extra: (item: T) => Record<string, string | number> = () => ({}),
): FeatureCollection => ({
  type: 'FeatureCollection',
  features: items.map((item) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
    properties: { id: item.id, name: item.name, ...extra(item) },
  })),
});

/** Accuracy halo: a metre-true circle around the fix. */
function accuracyCircle(fix: LiveFix | null): FeatureCollection {
  if (!fix || fix.accuracy <= 12) return EMPTY;
  const radius = Math.min(fix.accuracy, 1500);
  const ring: LngLat[] = [];
  const kx = 111_320 * Math.cos((fix.latitude * Math.PI) / 180);
  for (let i = 0; i <= 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    ring.push([
      fix.longitude + (Math.cos(angle) * radius) / kx,
      fix.latitude + (Math.sin(angle) * radius) / 110_574,
    ]);
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }],
  };
}

const linkCollection = (links: LngLat[][]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: links
    .filter((link) => link.length > 1)
    .map((link) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: link },
      properties: {},
    })),
});

const routeCollection = (line: LngLat[] | null): FeatureCollection =>
  line && line.length > 1
    ? {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: {} },
        ],
      }
    : EMPTY;

function element(className: string, html = '') {
  const node = document.createElement('div');
  node.className = className;
  node.innerHTML = html;
  return node;
}

export type MapCanvasProps = {
  locale: Locale;
  places: MapPlace[];
  pois: OsmPlace[];
  user: LiveFix | null;
  selected: { id: string; name: string; latitude: number; longitude: number } | null;
  routeLine: LngLat[] | null;
  /** Dotted links between the real start/destination and where the route joins the road. */
  routeLinks: LngLat[][];
  /** Place card rendered inside a map popup anchored at `selected`. */
  popup: ReactNode | null;
  routeMode: RouteMode;
  basemap: Basemap;
  follow: boolean;
  view: MapView | null;
  onSelectPlace: (id: string) => void;
  onSelectPoi: (id: string) => void;
  /** A place icon drawn by the basemap itself (OpenStreetMap), tapped by the visitor. */
  onPickPlace: (place: OsmPlace) => void;
  onClearSelection: () => void;
  onUserGesture: () => void;
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
};

export default function MapCanvas(props: MapCanvasProps) {
  const {
    locale,
    places,
    pois,
    user,
    selected,
    routeLine,
    routeLinks,
    popup,
    routeMode,
    basemap,
    follow,
    view,
  } = props;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const userMarker = useRef<Marker | null>(null);
  const selectedMarker = useRef<Marker | null>(null);
  const latest = useRef(props);
  const firstStyle = useRef(true);
  const basemapPoiLayers = useRef<string[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const [popupNode, setPopupNode] = useState<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [styleEpoch, setStyleEpoch] = useState(0);

  useEffect(() => {
    latest.current = props;
  });

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    maplibregl.setWorkerUrl('/website/maplibre-gl-worker.mjs');
    let loaded = false;
    const instance = new maplibregl.Map({
      container: container.current,
      style: styleFor(latest.current.basemap),
      center: HCM_CENTER,
      zoom: 12.4,
      maxZoom: 19.5,
      maxPitch: 65,
      attributionControl: { compact: true },
    });
    map.current = instance;
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right',
    );
    instance.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');

    const install = () => {
      const current = latest.current;
      const add = (id: string, data: FeatureCollection, options: object = {}) => {
        if (!instance.getSource(id)) instance.addSource(id, { type: 'geojson', data, ...options });
      };
      add('tv-accuracy', accuracyCircle(current.user));
      add('tv-route', routeCollection(current.routeLine));
      add('tv-route-links', linkCollection(current.routeLinks));
      add('tv-pois', pointCollection(current.pois, (poi) => ({ kind: poi.kind })));
      add('tv-places', pointCollection(current.places), {
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 14,
      });
      if (instance.getLayer('tv-places-point')) return;
      instance.addLayer({
        id: 'tv-accuracy-fill',
        type: 'fill',
        source: 'tv-accuracy',
        paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.12 },
      });
      instance.addLayer({
        id: 'tv-accuracy-line',
        type: 'line',
        source: 'tv-accuracy',
        paint: { 'line-color': '#1a73e8', 'line-opacity': 0.4, 'line-width': 1 },
      });
      instance.addLayer({
        id: 'tv-route-links',
        type: 'line',
        source: 'tv-route-links',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#5f6368',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 17, 5],
          'line-dasharray': [0.1, 2],
        },
      });
      instance.addLayer({
        id: 'tv-route-casing',
        type: 'line',
        source: 'tv-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0b4fb3',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 17, 13],
        },
      });
      instance.addLayer({
        id: 'tv-route-line',
        type: 'line',
        source: 'tv-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b8bff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 17, 9],
        },
      });
      instance.addLayer({
        id: 'tv-pois-dot',
        type: 'circle',
        source: 'tv-pois',
        minzoom: 10,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 14, 6, 17, 9],
          'circle-color': [
            'match',
            ['get', 'kind'],
            ['heritage', 'museum', 'attraction', 'culture'],
            '#8a5d18',
            'worship',
            '#6b4fa3',
            ['park'],
            '#2e7d4f',
            ['cafe', 'food', 'market'],
            '#c2571a',
            '#4a6fa5',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      });
      instance.addLayer({
        id: 'tv-pois-label',
        type: 'symbol',
        source: 'tv-pois',
        minzoom: 14,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_REGULAR,
          'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13],
          'text-offset': [0, 1],
          'text-anchor': 'top',
          'text-max-width': 9,
          'text-optional': true,
        },
        paint: { 'text-color': '#30383f', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
      });
      instance.addLayer({
        id: 'tv-places-cluster',
        type: 'circle',
        source: 'tv-places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#114436',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 40, 26],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        },
      });
      instance.addLayer({
        id: 'tv-places-count',
        type: 'symbol',
        source: 'tv-places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': FONT_BOLD,
          'text-size': 12.5,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      instance.addLayer({
        id: 'tv-places-point',
        type: 'circle',
        source: 'tv-places',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#963a1b',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 17, 10],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
        },
      });
      instance.addLayer({
        id: 'tv-places-label',
        type: 'symbol',
        source: 'tv-places',
        filter: ['!', ['has', 'point_count']],
        minzoom: 13.2,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_BOLD,
          'text-size': 12.5,
          'text-offset': [0, 1.05],
          'text-anchor': 'top',
          'text-max-width': 10,
          'text-optional': true,
        },
        paint: { 'text-color': '#6e2610', 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 },
      });
    };

    instance.on('style.load', () => {
      install();
      // Show the basemap's own place icons (schools, clinics, cafés, bus stops…) from street level.
      const poiLayers: string[] = [];
      for (const layer of instance.getStyle().layers || []) {
        const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
        if (layer.type !== 'symbol' || (sourceLayer !== 'poi' && sourceLayer !== 'aerodrome_label'))
          continue;
        poiLayers.push(layer.id);
        try {
          instance.setLayerZoomRange(layer.id, Math.min(layer.minzoom ?? 14, 13.5), 24);
        } catch {
          /* Layer without a zoom range: leave it as the style defines. */
        }
      }
      basemapPoiLayers.current = poiLayers;
      setFailed(false);
      setStyleEpoch((value) => value + 1);
    });
    instance.on('load', () => {
      loaded = true;
    });
    // Start with the credits folded into the (i) button. MapLibre opens them once the source
    // attribution arrives, which is after 'load', so fold on the first idle frame instead.
    instance.once('idle', () => {
      container.current
        ?.querySelector('.maplibregl-ctrl-attrib')
        ?.classList.remove('maplibregl-compact-show');
    });
    instance.on('error', () => {
      // Before the first successful load an error means the basemap itself is unreachable.
      if (!loaded) setFailed(true);
    });

    const hit = (point: { x: number; y: number }) => {
      const layers = HIT_LAYERS.filter((id) => instance.getLayer(id));
      if (!layers.length) return undefined;
      return instance.queryRenderedFeatures(
        [
          [point.x - 7, point.y - 7],
          [point.x + 7, point.y + 7],
        ],
        { layers },
      )[0];
    };
    const basemapHit = (point: { x: number; y: number }) => {
      const layers = basemapPoiLayers.current.filter((id) => instance.getLayer(id));
      if (!layers.length) return undefined;
      return instance
        .queryRenderedFeatures(
          [
            [point.x - 10, point.y - 10],
            [point.x + 10, point.y + 10],
          ],
          { layers },
        )
        .find((feature) => feature.geometry.type === 'Point' && feature.properties?.name);
    };
    instance.on('click', (event) => {
      const feature = hit(event.point);
      if (!feature) {
        const poi = basemapHit(event.point);
        if (poi) {
          const [lng, lat] = (poi.geometry as Point).coordinates;
          const props = poi.properties || {};
          const name = String(props['name:vi'] || props.name).slice(0, 160);
          const here = latest.current.user;
          latest.current.onPickPlace({
            id: `b${String(poi.id ?? `${lng.toFixed(5)},${lat.toFixed(5)}`)}`,
            name,
            kind: String(props.class || 'other'),
            latitude: lat,
            longitude: lng,
            distanceMeters: here
              ? Math.round(
                  Math.hypot(
                    (lat - here.latitude) * 110_574,
                    (lng - here.longitude) * 111_320 * Math.cos((here.latitude * Math.PI) / 180),
                  ),
                )
              : 0,
          });
          return;
        }
        latest.current.onClearSelection();
        return;
      }
      if (feature.layer.id === 'tv-places-cluster') {
        const source = instance.getSource('tv-places') as GeoJSONSource | undefined;
        const clusterId = Number(feature.properties?.cluster_id);
        const centre = (feature.geometry as Point).coordinates as LngLat;
        void source
          ?.getClusterExpansionZoom(clusterId)
          .then((zoom) => instance.easeTo({ center: centre, zoom: Math.min(zoom + 0.3, 18) }))
          .catch(() => instance.easeTo({ center: centre, zoom: instance.getZoom() + 2 }));
        return;
      }
      const id = String(feature.properties?.id || '');
      if (!id) return;
      if (feature.layer.id === 'tv-pois-dot') latest.current.onSelectPoi(id);
      else latest.current.onSelectPlace(id);
    });
    instance.on('mousemove', (event) => {
      instance.getCanvas().style.cursor =
        hit(event.point) || basemapHit(event.point) ? 'pointer' : '';
    });
    for (const type of ['dragstart', 'rotatestart', 'pitchstart'] as const)
      instance.on(type, (event) => {
        if ((event as { originalEvent?: unknown }).originalEvent) latest.current.onUserGesture();
      });
    instance.on('moveend', () => {
      const centre = instance.getCenter();
      latest.current.onCenterChange({ latitude: centre.lat, longitude: centre.lng });
    });

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      userMarker.current = null;
      selectedMarker.current = null;
      map.current = null;
      instance.remove();
    };
  }, []);

  // Basemap switch: the style is replaced, `style.load` re-installs our layers.
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    map.current?.setStyle(styleFor(basemap));
  }, [basemap]);

  // Data → sources. `styleEpoch` re-runs these after a style swap.
  useEffect(() => {
    (map.current?.getSource('tv-places') as GeoJSONSource | undefined)?.setData(
      pointCollection(places),
    );
  }, [places, styleEpoch]);
  useEffect(() => {
    (map.current?.getSource('tv-pois') as GeoJSONSource | undefined)?.setData(
      pointCollection(pois, (poi) => ({ kind: poi.kind })),
    );
  }, [pois, styleEpoch]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    (instance.getSource('tv-route') as GeoJSONSource | undefined)?.setData(
      routeCollection(routeLine),
    );
    (instance.getSource('tv-route-links') as GeoJSONSource | undefined)?.setData(
      linkCollection(routeLinks),
    );
    if (instance.getLayer('tv-route-line'))
      // Walking routes are drawn dotted, as on most consumer maps.
      instance.setPaintProperty(
        'tv-route-line',
        'line-dasharray',
        routeMode === 'walking' ? [0.2, 1.6] : [1],
      );
  }, [routeLine, routeLinks, routeMode, styleEpoch]);

  // Live position: blue dot, heading wedge and accuracy halo.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    (instance.getSource('tv-accuracy') as GeoJSONSource | undefined)?.setData(accuracyCircle(user));
    if (!user) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      userMarker.current = new maplibregl.Marker({
        element: element(
          'atlas-me',
          '<span class="atlas-me-heading"></span><span class="atlas-me-pulse"></span><span class="atlas-me-dot"></span>',
        ),
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat([user.longitude, user.latitude])
        .addTo(instance);
      userMarker.current
        .getElement()
        .setAttribute(
          'aria-label',
          copy(locale, 'Vị trí của bạn', 'Your location', '你的位置'),
        );
    }
    userMarker.current.setLngLat([user.longitude, user.latitude]);
    userMarker.current.setRotation(user.heading ?? 0);
    userMarker.current.getElement().classList.toggle('has-heading', user.heading !== null);
  }, [user, locale, styleEpoch]);

  // Selected place pin.
  useEffect(() => {
    const instance = map.current;
    selectedMarker.current?.remove();
    selectedMarker.current = null;
    if (!instance || !selected) return;
    selectedMarker.current = new maplibregl.Marker({
      element: element('atlas-pin', '<span></span>'),
      anchor: 'bottom',
    })
      .setLngLat([selected.longitude, selected.latitude])
      .addTo(instance);
    selectedMarker.current.getElement().setAttribute('aria-label', selected.name);
  }, [selected]);

  // Place card on the map, anchored above the pin; the map pans so the whole card is visible.
  const hasPopup = Boolean(popup);
  useEffect(() => {
    const instance = map.current;
    popupRef.current?.remove();
    popupRef.current = null;
    if (!instance || !selected || !hasPopup) return;
    const node = document.createElement('div');
    const narrow = (container.current?.clientWidth ?? 600) < 520;
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: 46,
      maxWidth: narrow ? '260px' : '300px',
      className: 'atlas-popup',
      padding: { top: 70, bottom: 30, left: 20, right: 70 },
    } as ConstructorParameters<typeof maplibregl.Popup>[0])
      .setLngLat([selected.longitude, selected.latitude])
      .setDOMContent(node)
      .addTo(instance);
    // Portal target is created imperatively by MapLibre; hand it to React on the next tick.
    const timer = window.setTimeout(() => setPopupNode(node), 0);
    return () => {
      window.clearTimeout(timer);
      popupRef.current?.remove();
      popupRef.current = null;
      setPopupNode((current) => (current === node ? null : current));
    };
  }, [selected, hasPopup]);

  // One-shot camera moves requested by the explorer.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !view) return;
    if (view.type === 'point') {
      instance.flyTo({
        center: [view.longitude, view.latitude],
        // Leave room above the point for the place card.
        offset: [0, Math.min(140, instance.getContainer().clientHeight * 0.22)],
        zoom: Math.max(view.zoom, Math.min(instance.getZoom(), 17)),
        duration: 900,
        essential: true,
      });
      return;
    }
    if (view.line.length < 2) return;
    const bounds = new maplibregl.LngLatBounds(view.line[0], view.line[0]);
    for (const point of view.line) bounds.extend(point);
    instance.fitBounds(bounds, { padding: 70, maxZoom: 16.5, duration: 900 });
  }, [view]);

  // Navigation mode: keep the traveller centred and the map turned the way they move.
  useEffect(() => {
    const instance = map.current;
    if (!instance || !follow || !user) return;
    instance.easeTo({
      center: [user.longitude, user.latitude],
      zoom: Math.max(instance.getZoom(), 16.6),
      pitch: 50,
      bearing: user.heading ?? instance.getBearing(),
      duration: 700,
    });
  }, [follow, user]);

  return (
    <div className="atlas-canvas">
      <div
        ref={container}
        className="atlas-canvas-map"
        role="application"
        aria-label={copy(
          locale,
          'Bản đồ tương tác TP. Hồ Chí Minh',
          'Interactive map of Ho Chi Minh City',
          '胡志明市互动地图',
        )}
      />
      {popupNode && popup ? createPortal(popup, popupNode) : null}
      {failed && (
        <p className="atlas-canvas-error" role="alert">
          {copy(
            locale,
            'Chưa tải được bản đồ nền. Hãy kiểm tra kết nối mạng rồi tải lại trang.',
            'The basemap could not be loaded. Check your connection and reload the page.',
            '底图加载失败，请检查网络后刷新页面。',
          )}
        </p>
      )}
    </div>
  );
}
