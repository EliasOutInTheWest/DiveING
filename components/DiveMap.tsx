'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '@/lib/supabase';

type Spot = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  max_depth_m: number | null;
  level: string;
};

type School = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  website: string | null;
};

// Builds popup content as DOM nodes (textContent = safe against HTML injection)
function popupContent(title: string, lines: string[]) {
  const wrap = document.createElement('div');
  const h = document.createElement('strong');
  h.textContent = title;
  wrap.appendChild(h);
  lines.filter(Boolean).forEach((line) => {
    const p = document.createElement('div');
    p.textContent = line;
    wrap.appendChild(p);
  });
  return wrap;
}

export default function DiveMap() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
   

    const map = new maplibregl.Map({
      container: container.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-123.37, 48.42], // [lng, lat], change to your region
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    async function load() {
      const [spotsRes, schoolsRes] = await Promise.all([
        supabase.from('spots').select('id,name,description,lat,lng,max_depth_m,level'),
        supabase.from('schools').select('id,name,description,lat,lng,website'),
      ]);
      if (cancelled) return;

      if (spotsRes.error) console.error('spots error:', spotsRes.error.message);
      if (schoolsRes.error) console.error('schools error:', schoolsRes.error.message);

      ((spotsRes.data as Spot[]) ?? []).forEach((s) => {
        const lines = [
          `Level: ${s.level}`,
          s.max_depth_m ? `Max depth: ${s.max_depth_m} m` : '',
          s.description ?? '',
        ];
        new maplibregl.Marker({ color: '#0ea5e9' }) // blue = dive spot
          .setLngLat([s.lng, s.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setDOMContent(popupContent(s.name, lines)))
          .addTo(map);
      });

      ((schoolsRes.data as School[]) ?? []).forEach((s) => {
        const lines = [s.description ?? '', s.website ?? ''];
        new maplibregl.Marker({ color: '#f97316' }) // orange = dive school
          .setLngLat([s.lng, s.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setDOMContent(popupContent(s.name, lines)))
          .addTo(map);
      });
    }

    map.on('load', load);

    return () => {
      cancelled = true;
      map.remove();
    };
  }, []);

  return <div ref={container} className="h-full w-full" />;
}
