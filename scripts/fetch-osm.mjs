// Fetches dive spots and dive centres from OpenStreetMap (Overpass API)
// and writes seed.sql, which you paste into the Supabase SQL Editor.
//
// Run from the project folder:   node scripts/fetch-osm.mjs
//
// Data (c) OpenStreetMap contributors, licensed under ODbL.

import { writeFileSync } from 'node:fs';

// ---------- CONFIG ----------
// Bounding box: [south, west, north, east]
const BBOX = [48.2, -124.5, 48.9, -123.0]; // southern Vancouver Island
const OUT_FILE = 'seed.sql';
// ----------------------------

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const bbox = BBOX.join(',');
const query = `
[out:json][timeout:90];
(
  nwr["sport"="scuba_diving"](${bbox});
  nwr["amenity"="dive_centre"](${bbox});
  nwr["shop"="scuba_diving"](${bbox});
  nwr["club"="scuba_diving"](${bbox});
);
out center tags;
`;

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      console.log('Asking', url, '...');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'divemap-student-project',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }
  throw new Error('All Overpass servers failed. Wait a minute and try again.');
}

// Escape a value for SQL ('' for quotes), or return null
const sql = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
// First tag that exists
const pick = (tags, ...keys) => {
  for (const k of keys) if (tags[k]) return tags[k];
  return null;
};

const data = await fetchOverpass();
const spots = [];
const schools = [];
const seen = new Set();

for (const el of data.elements) {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) continue; // skip unnamed objects

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) continue;

  const osmId = `${el.type}/${el.id}`;
  if (seen.has(osmId)) continue;
  seen.add(osmId);

  const point = `st_point(${lon}, ${lat})::geography`; // st_point(longitude, latitude)
  const isSchool =
    tags.amenity === 'dive_centre' || tags.shop === 'scuba_diving' || tags.club === 'scuba_diving';

  if (isSchool) {
    schools.push(
      `(${sql(name)}, ${sql(tags.description)}, ${point}, ` +
        `${sql(pick(tags, 'website', 'contact:website'))}, ` +
        `${sql(pick(tags, 'phone', 'contact:phone'))}, ` +
        `${sql(pick(tags, 'email', 'contact:email'))}, ${sql(osmId)})`
    );
  } else {
    const depth = parseInt(pick(tags, 'maxdepth', 'scuba_diving:maxdepth') ?? '', 10);
    spots.push(
      `(${sql(name)}, ${sql(tags.description)}, ${point}, ` +
        `${Number.isFinite(depth) ? depth : 'null'}, ${sql(osmId)})`
    );
  }
}

let out = `-- Generated from OpenStreetMap data (c) OpenStreetMap contributors, ODbL\n`;
out += `-- Bounding box (south,west,north,east): ${bbox}\n\n`;

out += `-- OSM does not tell us the difficulty level, so allow it to be empty\n`;
out += `alter table public.spots alter column level drop not null;\n`;
out += `alter table public.spots alter column level drop default;\n\n`;

out += `-- Remove the two test rows from the schema step\n`;
out += `delete from public.spots where name = 'Test Reef';\n`;
out += `delete from public.schools where name = 'Test Dive Club';\n\n`;

if (spots.length) {
  out += `insert into public.spots (name, description, location, max_depth_m, osm_id) values\n`;
  out += spots.join(',\n') + `\non conflict (osm_id) do nothing;\n\n`;
}
if (schools.length) {
  out += `insert into public.schools (name, description, location, website, phone, email, osm_id) values\n`;
  out += schools.join(',\n') + `\non conflict (osm_id) do nothing;\n`;
}

writeFileSync(OUT_FILE, out);
console.log(`Done: ${spots.length} dive spots and ${schools.length} dive centres written to ${OUT_FILE}`);
