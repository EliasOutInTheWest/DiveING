import type maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------
// "Adventure" map colours (warm, friendly, like an explorer map) put on top
// of the normal basemap. Only layers that are part of the basemap
// are touched; the original colours are remembered, so switching
// back to "Classic" restores them exactly.
// Change the colours here if you want a different mood.
// ---------------------------------------------------------------
const C = {
  land: '#f6eedb', // warm parchment
  water: '#8fd3e3',
  waterLine: '#8fd3e3',
  park: '#cfe5b0',
  wood: '#b7d796',
  sand: '#f8e7c0',
  building: '#eadfc9',
  built: '#f1e6cf',
  aero: '#e8e3d6',
  roadMajor: '#f7b267',
  roadMain: '#fbd9a0',
  road: '#fffaf0',
  casing: '#e3d3b4',
  path: '#d9b98c',
  rail: '#cbbfa8',
  boundary: '#c98f6b',
  text: '#6b4f3a',
  textWater: '#2f7f9c',
  halo: 'rgba(255,248,232,0.95)',
};

type Saved = Map<string, unknown>;
const saved = new WeakMap<maplibregl.Map, Saved>();

function colourFor(id: string, type: string): { prop: string; value: string } | null {
  const n = id.toLowerCase();
  const has = (...w: string[]) => w.some((x) => n.includes(x));

  if (type === 'background') return { prop: 'background-color', value: C.land };

  if (type === 'fill') {
    if (has('water', 'ocean', 'sea', 'lake')) return { prop: 'fill-color', value: C.water };
    if (has('wood', 'forest')) return { prop: 'fill-color', value: C.wood };
    if (has('park', 'grass', 'green', 'nature', 'golf', 'garden', 'pitch', 'recreation', 'cemetery', 'landcover'))
      return { prop: 'fill-color', value: C.park };
    if (has('sand', 'beach')) return { prop: 'fill-color', value: C.sand };
    if (has('building')) return { prop: 'fill-color', value: C.building };
    if (has('aero', 'airport', 'runway')) return { prop: 'fill-color', value: C.aero };
    if (has('residential', 'landuse', 'commercial', 'industrial', 'retail', 'school', 'hospital'))
      return { prop: 'fill-color', value: C.built };
    return null;
  }

  if (type === 'fill-extrusion') return { prop: 'fill-extrusion-color', value: C.building };

  if (type === 'line') {
    if (has('waterway', 'river', 'stream', 'canal')) return { prop: 'line-color', value: C.waterLine };
    if (has('boundary', 'admin')) return { prop: 'line-color', value: C.boundary };
    if (has('rail', 'transit', 'subway')) return { prop: 'line-color', value: C.rail };
    if (has('casing')) return { prop: 'line-color', value: C.casing };
    if (has('path', 'pedestrian', 'track', 'footway', 'cycleway', 'steps'))
      return { prop: 'line-color', value: C.path };
    if (has('motorway', 'trunk')) return { prop: 'line-color', value: C.roadMajor };
    if (has('primary', 'secondary')) return { prop: 'line-color', value: C.roadMain };
    if (has('road', 'street', 'tertiary', 'minor', 'service', 'bridge', 'tunnel', 'highway'))
      return { prop: 'line-color', value: C.road };
    return null;
  }

  return null;
}

export function applyMapTheme(map: maplibregl.Map, baseLayerIds: string[], soft: boolean) {
  let memory = saved.get(map);
  if (!memory) {
    memory = new Map();
    saved.set(map, memory);
  }
  const mem = memory;

  const set = (id: string, prop: string, value: unknown, layout = false) => {
    const key = `${layout ? 'l' : 'p'}|${id}|${prop}`;
    try {
      if (soft) {
        if (!mem.has(key)) mem.set(key, layout ? map.getLayoutProperty(id, prop) : map.getPaintProperty(id, prop));
        if (layout) map.setLayoutProperty(id, prop, value as never);
        else map.setPaintProperty(id, prop, value as never);
      } else if (mem.has(key)) {
        const old = mem.get(key);
        if (layout) map.setLayoutProperty(id, prop, old as never);
        else map.setPaintProperty(id, prop, old as never);
      }
    } catch {
      // a layer without this property: ignore
    }
  };

  for (const id of baseLayerIds) {
    const layer = map.getLayer(id);
    if (!layer) continue;
    const type = layer.type as string;

    if (type === 'raster') {
      set(id, 'raster-saturation', -0.2);
      set(id, 'raster-contrast', -0.12);
      set(id, 'raster-brightness-min', 0.08);
      continue;
    }

    if (type === 'symbol') {
      const water = /water|ocean|sea|lake|river/i.test(id);
      set(id, 'text-color', water ? C.textWater : C.text);
      set(id, 'text-halo-color', C.halo);
      set(id, 'text-halo-width', 1.6);
      continue;
    }

    const c = colourFor(id, type);
    if (c) set(id, c.prop, c.value);

    if (type === 'line' && /road|street|motorway|trunk|primary|secondary|tertiary|path|bridge|tunnel/i.test(id)) {
      set(id, 'line-cap', 'round', true); // rounded road ends feel friendlier
      set(id, 'line-join', 'round', true);
    }
  }
}
