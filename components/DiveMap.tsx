'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { BoatRoute, LngLat, Mode, School, Selection, Spot } from '@/lib/types';
import { depthColorExpression } from '@/lib/depth';

// ---------------------------------------------------------------
// Basemap switch. If the normal map ever stays plain/white,
// change 'vector' to 'raster' and save: the raster map always draws.
// ---------------------------------------------------------------
const BASEMAP: 'vector' | 'raster' = 'vector';

const VECTOR_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
};

const PANEL_WIDTH = 384; // same as Tailwind w-96 used by the side panels

// Elevation + sea floor depth as tiles (coarse global data, about 450 m in the ocean)
const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

type DraftFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry:
    | { type: 'Point'; coordinates: LngLat }
    | { type: 'LineString'; coordinates: LngLat[] };
};

type Props = {
  spots: Spot[];
  schools: School[];
  selected: Selection | null;
  routes: BoatRoute[];
  mode: Mode;
  depthMap: boolean;
  terrain3d: boolean;
  onSelect: (s: Selection | null) => void;
  onMapClick: (p: LngLat) => void;
  onBackgroundClick: () => void;
};

export default function DiveMap({
  spots,
  schools,
  selected,
  routes,
  mode,
  depthMap,
  terrain3d,
  onSelect,
  onMapClick,
  onBackgroundClick,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const was3d = useRef(false);
  const markerEls = useRef(new Map<string, HTMLElement>());
  const zoomBefore = useRef<number | null>(null);

  // Latest values for listeners that live as long as the map
  const modeRef = useRef(mode);
  const clickRef = useRef(onMapClick);
  const backgroundRef = useRef(onBackgroundClick);
  useEffect(() => {
    modeRef.current = mode;
    clickRef.current = onMapClick;
    backgroundRef.current = onBackgroundClick;
  });

  // 1) Create the map once
  useEffect(() => {
    if (!container.current) return;

    // Worker file copied from node_modules into /public (see instructions)
    maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js');

    const map = new maplibregl.Map({
      container: container.current,
      style: BASEMAP === 'vector' ? VECTOR_STYLE : RASTER_STYLE,
      center: [-123.37, 48.42], // [lng, lat], change to your region
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('error', (e) => console.error('MAP ERROR:', e.error?.message ?? e));

    map.on('load', () => {
      // saved boat routes of the selected school / spot
      map.addSource('routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'routes-line',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0369a1', 'line-width': 4, 'line-opacity': 0.85 },
      });

      // what the user is drawing right now (new pin or new route)
      map.addSource('draft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#dc2626', 'line-width': 3, 'line-dasharray': [2, 1] },
      });
      map.addLayer({
        id: 'draft-points',
        type: 'circle',
        source: 'draft',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#dc2626',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      setReady(true);
    });

    // clicks on the map are only used while placing a pin or drawing a route
    map.on('click', (e) => {
      if (modeRef.current.type !== 'idle') {
        clickRef.current([e.lngLat.lng, e.lngLat.lat]);
      } else {
        backgroundRef.current(); // click on empty map: close the panel
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // 2) (Re)create the markers whenever the data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: maplibregl.Marker[] = [];

    function add(kind: 'spot' | 'school', id: string, lng: number, lat: number, color: string) {
      const marker = new maplibregl.Marker({ color }).setLngLat([lng, lat]).addTo(map!);
      const el = marker.getElement();
      el.style.cursor = 'pointer';
      el.style.transition = 'opacity 200ms';
      markerEls.current.set(`${kind}:${id}`, el);
      el.addEventListener('click', (e) => {
        if (modeRef.current.type !== 'idle') return; // let the map handle the click
        e.stopPropagation();
        onSelect({ kind, id });
      });
      markers.push(marker);
    }

    spots.forEach((s) => add('spot', s.id, s.lng, s.lat, '#0ea5e9')); // blue = dive spot
    schools.forEach((s) => add('school', s.id, s.lng, s.lat, '#f97316')); // orange = dive school

    return () => {
      markers.forEach((m) => m.remove());
      markerEls.current.clear();
    };
  }, [spots, schools, onSelect]);

  // 2b) Highlight the selected pin, make all others lighter
  useEffect(() => {
    const key = selected ? `${selected.kind}:${selected.id}` : null;
    markerEls.current.forEach((el, k) => {
      const isSelected = k === key;
      el.style.opacity = key && !isSelected ? '0.3' : '1';
      el.style.zIndex = isSelected ? '5' : '';
      const svg = el.querySelector('svg');
      if (svg) {
        svg.style.transition = 'transform 150ms';
        svg.style.transformOrigin = '50% 100%';
        svg.style.transform = isSelected ? 'scale(1.3)' : '';
      }
    });
  }, [selected, spots, schools]);

  // 3) Selecting zooms in a bit, selecting another pin only moves, deselecting zooms back out
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selected) {
      if (zoomBefore.current !== null) {
        map.easeTo({ zoom: zoomBefore.current, duration: 700 });
        zoomBefore.current = null;
      }
      return;
    }

    const item =
      selected.kind === 'spot'
        ? spots.find((s) => s.id === selected.id)
        : schools.find((s) => s.id === selected.id);
    if (!item) return;

    let zoom = map.getZoom();
    if (zoomBefore.current === null) {
      zoomBefore.current = zoom; // remember where we came from
      zoom = Math.min(Math.max(zoom + 1.5, 9), 14);
    }

    const wide = window.innerWidth >= 640;
    map.easeTo({
      center: [item.lng, item.lat],
      zoom,
      offset: [wide ? PANEL_WIDTH / 2 : 0, 0],
      duration: 700,
    });
    // only re-run when the selection changes, not when data is edited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // 4) Draw the saved boat routes of the selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource('routes') as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: 'FeatureCollection',
      features: routes.map((r) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: r.geojson,
      })),
    });

    if (routes.length > 0 && modeRef.current.type === 'idle') {
      const bounds = new maplibregl.LngLatBounds();
      routes.forEach((r) => r.geojson.coordinates.forEach((c) => bounds.extend(c)));
      const wide = window.innerWidth >= 640;
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: (wide ? PANEL_WIDTH : 0) + 50, right: 60 },
        maxZoom: 13,
        duration: 700,
      });
    }
  }, [routes, ready]);

  // 5) Draw the new pin / the route being drawn
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource('draft') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features: DraftFeature[] = [];

    if (mode.type === 'place' && mode.at) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: mode.at },
      });
    }

    if (mode.type === 'route') {
      const school = schools.find((s) => s.id === mode.schoolId);
      const spot = mode.spotId ? spots.find((s) => s.id === mode.spotId) : undefined;
      if (school) {
        const line: LngLat[] = [[school.lng, school.lat], ...mode.waypoints];
        if (spot) line.push([spot.lng, spot.lat]);
        if (line.length >= 2) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: line },
          });
        }
        mode.waypoints.forEach((p) =>
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: p },
          })
        );
      }
    }

    source.setData({ type: 'FeatureCollection', features });
  }, [mode, ready, spots, schools]);

  // 6) Crosshair cursor while placing / drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = mode.type === 'idle' ? '' : 'crosshair';
  }, [mode.type]);

  // 7) Depth map (colours + relief of the sea floor) and 3D view
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if ((depthMap || terrain3d) && !map.getSource('dem')) {
      map.addSource('dem', {
        type: 'raster-dem',
        tiles: [DEM_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 12,
        attribution: 'Terrain: Mapzen, GEBCO, ETOPO1, SRTM',
      });
    }

    if (depthMap && !map.getLayer('depth-color')) {
      // put the layers below the labels of the basemap
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
      map.addLayer(
        {
          id: 'depth-color',
          type: 'color-relief',
          source: 'dem',
          paint: {
            'color-relief-color': depthColorExpression() as never,
            'color-relief-opacity': 0.8,
          },
        },
        firstSymbol
      );
      map.addLayer(
        {
          id: 'depth-hillshade',
          type: 'hillshade',
          source: 'dem',
          paint: {
            'hillshade-exaggeration': 0.35,
            'hillshade-shadow-color': '#0b2a4a',
            'hillshade-highlight-color': '#ffffff',
          },
        },
        firstSymbol
      );
    }
    for (const id of ['depth-color', 'depth-hillshade']) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', depthMap ? 'visible' : 'none');
      }
    }

    if (terrain3d) {
      map.setTerrain({ source: 'dem', exaggeration: 2 });
      map.easeTo({ pitch: 55 });
      was3d.current = true;
    } else if (was3d.current) {
      map.setTerrain(null);
      map.easeTo({ pitch: 0 });
      was3d.current = false;
    }
  }, [depthMap, terrain3d, ready]);

  return <div ref={container} className="h-full w-full" />;
}
