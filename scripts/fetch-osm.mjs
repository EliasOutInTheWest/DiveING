// Fetches spots and providers from OpenStreetMap (Overpass API)
// and writes a seed file, which you paste into the Supabase SQL Editor.
//
// Run from the project folder:
//   node scripts/fetch-osm.mjs hiking
//   node scripts/fetch-osm.mjs camping --country=CA
//   node scripts/fetch-osm.mjs biking --bbox=48.2,-124.5,48.9,-123.0
//
// Activities: diving, hiking, camping, biking, climbing, paddling (default: diving)
// Options:    --bbox=south,west,north,east   area to search (default: southern Vancouver Island)
//             --country=CA                   two-letter country code stored with every row
//
// Data (c) OpenStreetMap contributors, licensed under ODbL.

import { writeFileSync } from 'node:fs';

// ---------- what to look for ----------
// spots:     OSM tags that make a spot of this activity
// providers: OSM tags that make a school / guide / shop of this activity
const PRESETS = {
  diving: {
    spots: [['sport', 'scuba_diving']],
    providers: [['amenity', 'dive_centre'], ['shop', 'scuba_diving'], ['club', 'scuba_diving']],
  },
  hiking: {
    spots: [['tourism', 'viewpoint'], ['natural', 'peak'], ['waterway', 'waterfall'], ['highway', 'trailhead']],
    providers: [['shop', 'outdoor']],
  },
  camping: {
    spots: [['tourism', 'camp_site']],
    providers: [],
  },
  biking: {
    spots: [['sport', 'cycling'], ['sport', 'mtb'], ['sport', 'bmx']],
    providers: [['shop', 'bicycle'], ['amenity', 'bicycle_rental']],
  },
  climbing: {
    spots: [['sport', 'climbing']],
    providers: [['club', 'climbing'], ['leisure', 'sports_centre']],
  },
  paddling: {
    spots: [['sport', 'canoe'], ['sport', 'kayak']],
    providers: [['amenity', 'boat_rental']],
  },
};

// ---------- settings ----------
const args = process.argv.slice(2);
const activity = args.find((a) => !a.startsWith('--')) ?? 'diving';
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

if (!PRESETS[activity]) {
  console.error(`Unknown activity "${activity}". Use one of: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}

// [south, west, north, east]
const BBOX = (option('bbox') ?? '48.2,-124.5,48.9,-123.0').split(',').map(Number);
if (BBOX.length !== 4 || BBOX.some((n) => !Number.isFinite(n))) {
  console.error('--bbox needs four numbers: south,west,north,east');
  process.exit(1);
}
const COUNTRY = (option('country') ?? '').toUpperCase();
if (COUNTRY && !/^[A-Z]{2}$/.test(COUNTRY)) {
  console.error('--country needs a two-letter code, for example CA');
  process.exit(1);
}
const OUT_FILE = `seed-${activity}.sql`;
// ----------------------------

const preset = PRESETS[activity];
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const bbox = BBOX.join(',');
const selectors = [...preset.spots, ...preset.providers]
  .map(([k, v]) => `  nwr["${k}"="${v}"]["name"](${bbox});`)
  .join('\n');
const query = `
[out:json][timeout:90];
(
${selectors}
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
          'User-Agent': 'diveing-student-project',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }
  throw new Error('All Overpass servers failed. Wait a minute and try again, or use a smaller --bbox.');
}

// Escape a value for SQL ('' for quotes), or return null
const sql = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
// First tag that exists
const pick = (tags, ...keys) => {
  for (const k of keys) if (tags[k]) return tags[k];
  return null;
};
const matches = (tags, list) => list.some(([k, v]) => tags[k] === v);

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
  const country = COUNTRY ? sql(COUNTRY) : 'null';
  const act = sql(activity);

  if (matches(tags, preset.providers)) {
    schools.push(
      `(${sql(name)}, ${sql(tags.description)}, ${point}, ` +
        `${sql(pick(tags, 'website', 'contact:website'))}, ` +
        `${sql(pick(tags, 'phone', 'contact:phone'))}, ` +
        `${sql(pick(tags, 'email', 'contact:email'))}, ${sql(osmId)}, ${act}, ${country})`
    );
  } else if (matches(tags, preset.spots)) {
    const depth = activity === 'diving' ? parseInt(pick(tags, 'maxdepth', 'scuba_diving:maxdepth') ?? '', 10) : NaN;
    spots.push(
      `(${sql(name)}, ${sql(tags.description)}, ${point}, ` +
        `${Number.isFinite(depth) ? depth : 'null'}, ${sql(osmId)}, ${act}, ${country})`
    );
  }
}

let out = `-- Generated from OpenStreetMap data (c) OpenStreetMap contributors, ODbL\n`;
out += `-- Activity: ${activity}. Bounding box (south,west,north,east): ${bbox}\n`;
out += `-- Needs activities.sql to be run first.\n\n`;

out += `-- OSM does not tell us the difficulty level, so allow it to be empty\n`;
out += `alter table public.spots alter column level drop not null;\n`;
out += `alter table public.spots alter column level drop default;\n\n`;

if (activity === 'diving') {
  out += `-- Remove the two test rows from the schema step\n`;
  out += `delete from public.spots where name = 'Test Reef';\n`;
  out += `delete from public.schools where name = 'Test Dive Club';\n\n`;
}

if (spots.length) {
  out += `insert into public.spots (name, description, location, max_depth_m, osm_id, activity, country_code) values\n`;
  out += spots.join(',\n') + `\non conflict (osm_id) do nothing;\n\n`;
}
if (schools.length) {
  out += `insert into public.schools (name, description, location, website, phone, email, osm_id, activity, country_code) values\n`;
  out += schools.join(',\n') + `\non conflict (osm_id) do nothing;\n`;
}

// imported spots count as checked (same as the first import)
out += `\n-- imported spots count as checked\nupdate public.spots set is_verified = true where created_by is null and is_verified = false;\n`;

writeFileSync(OUT_FILE, out);
console.log(`Done: ${spots.length} spots and ${schools.length} providers (${activity}) written to ${OUT_FILE}`);
