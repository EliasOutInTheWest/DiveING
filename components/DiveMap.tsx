'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { School, Selection, Spot } from '@/lib/types';

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

const PANEL_WIDTH = 384; // same as Tailwind w-96 used by SidePanel

type Props = {
  spots: Spot[];
  schools: School[];
  selected: Selection | null;
  onSelect: (s: Selection | null) => void;
};

export default function DiveMap({ spots, schools, selected, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hadSelection = useRef(false);

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
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
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
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect({ kind, id });
      });
      markers.push(marker);
    }

    spots.forEach((s) => add('spot', s.id, s.lng, s.lat, '#0ea5e9')); // blue = dive spot
    schools.forEach((s) => add('school', s.id, s.lng, s.lat, '#f97316')); // orange = dive school

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [spots, schools, onSelect]);

  // 3) Move the map when something is selected, so the pin is not hidden behind the panel
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selected) {
      if (hadSelection.current) {
        map.easeTo({ padding: { left: 0, top: 0, right: 0, bottom: 0 } });
      }
      hadSelection.current = false;
      return;
    }
    hadSelection.current = true;

    const item =
      selected.kind === 'spot'
        ? spots.find((s) => s.id === selected.id)
        : schools.find((s) => s.id === selected.id);
    if (!item) return;

    const wide = window.innerWidth >= 640;
    map.easeTo({
      center: [item.lng, item.lat],
      padding: { left: wide ? PANEL_WIDTH : 0, top: 0, right: 0, bottom: 0 },
    });
    // only re-run when the selection changes, not when data is edited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return <div ref={container} className="h-full w-full" />;
}
