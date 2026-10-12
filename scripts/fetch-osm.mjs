// Fetches spots and providers (schools, guides, shops) from OpenStreetMap (Overpass API)
// and writes a seed file, which you paste into the Supabase SQL Editor.
// OpenStreetMap is free and open (ODbL licence), so the data may be stored in your own database.
// (Google Maps data must NOT be copied into your own database: its terms forbid that.)
//
// Run from the project folder:
//   node scripts/fetch-osm.mjs all --country=CA                    every activity, one file
//   node scripts/fetch-osm.mjs hiking                              one activity
//   node scripts/fetch-osm.mjs camping --bbox=48.2,-124.5,48.9,-123.0 --limit=800
//   node scripts/fetch-osm.mjs all --region=vancouver-island       a ready-made area (sets the country too)
//
// Activities: diving, hiking, camping, biking, climbing, paddling, or "all" (default: all)
// Options:    --bbox=south,west,north,east   area to search (default: southern Vancouver Island)
//             --country=CA                   two-letter country code stored with every row
//             --region=NAME                  ready-made area, see REGIONS below (sets bbox + country)
//             --tile=1                       big areas are searched in squares of this size (degrees)
//             --limit=1500                   max. spots and max. providers per activity;
//                                            the best documented ones come first
//
// Big areas take a while (a pause between the requests keeps the free servers happy).
// If a square gets no answer it is skipped, run the script again later to fill the gaps.
// Data (c) OpenStreetMap contributors, licensed under ODbL.

import { writeFileSync } from 'node:fs';

// ---------- what to look for ----------
// Every entry is a group of OSM tags that must ALL match, so
//   [['sport', 'climbing'], ['leisure', 'sports_centre']]  = a climbing gym
// "providers" are checked first, everything else that matches "spots" becomes a spot.
const PRESETS = {
  diving: {
    spots: [[['sport', 'scuba_diving']], [['historic', 'wreck']]],
    providers: [[['amenity', 'dive_centre']], [['shop', 'scuba_diving']], [['club', 'scuba_diving']]],
  },
  hiking: {
    spots: [
      [['tourism', 'viewpoint']],
      [['natural', 'peak']],
      [['waterway', 'waterfall']],
      [['highway', 'trailhead']],
      [['natural', 'hot_spring']],
      [['natural', 'cave_entrance']],
    ],
    providers: [[['shop', 'outdoor']]],
  },
  camping: {
    spots: [
      [['tourism', 'camp_site']],
      [['tourism', 'caravan_site']],
      [['tourism', 'alpine_hut']],
      [['tourism', 'wilderness_hut']],
    ],
    providers: [],
  },
  biking: {
    spots: [[['sport', 'cycling']], [['sport', 'mtb']], [['sport', 'bmx']]],
    providers: [[['shop', 'bicycle']], [['amenity', 'bicycle_rental']]],
  },
  climbing: {
    spots: [[['sport', 'climbing']]],
    providers: [[['club', 'climbing']], [['sport', 'climbing'], ['leisure', 'sports_centre']]],
  },
  paddling: {
    spots: [[['sport', 'canoe']], [['sport', 'kayak']]],
    providers: [[['amenity', 'boat_rental']]],
  },
};

// ---------- ready-made areas: [south, west, north, east] ----------
const REGIONS = {
  'greater-victoria': { bbox: [48.3, -123.7, 48.75, -123.2], country: 'CA' },
  'vancouver-island': { bbox: [48.2, -128.5, 50.9, -123.0], country: 'CA' },
  'british-columbia': { bbox: [48.2, -139.1, 60.0, -114.0], country: 'CA' },
  austria: { bbox: [46.37, 9.53, 49.02, 17.16], country: 'AT' },
  switzerland: { bbox: [45.82, 5.96, 47.81, 10.49], country: 'CH' },
};

// ---------- settings ----------
const args = process.argv.slice(2);
const choice = args.find((a) => !a.startsWith('--')) ?? 'all';
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const activities = choice === 'all' ? Object.keys(PRESETS) : [choice];
if (!activities.every((a) => PRESETS[a])) {
  console.error(`Unknown activity "${choice}". Use one of: all, ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}

const regionName = option('region');
const region = regionName ? REGIONS[regionName] : null;
if (regionName && !region) {
  console.error(`Unknown region "${regionName}". Use one of: ${Object.keys(REGIONS).join(', ')}`);
  process.exit(1);
}

// [south, west, north, east]
const BBOX = option('bbox') ? option('bbox').split(',').map(Number) : (region?.bbox ?? [48.2, -124.5, 48.9, -123.0]);
if (BBOX.length !== 4 || BBOX.some((n) => !Number.isFinite(n)) || BBOX[0] >= BBOX[2] || BBOX[1] >= BBOX[3]) {
  console.error('--bbox needs four numbers: south,west,north,east (south < north and west < east)');
  process.exit(1);
}
const TILE = Number(option('tile') ?? 1);
if (!(TILE >= 0.05 && TILE <= 20)) {
  console.error('--tile needs a number between 0.05 and 20 (degrees)');
  process.exit(1);
}
const PAUSE_MS = Number(process.env.OSM_PAUSE_MS ?? 3000); // pause between requests
const COUNTRY = (option('country') ?? region?.country ?? '').toUpperCase();
if (COUNTRY && !/^[A-Z]{2}$/.test(COUNTRY)) {
  console.error('--country needs a two-letter code, for example CA');
  process.exit(1);
}
const LIMIT = Number(option('limit') ?? 1500);
if (!Number.isInteger(LIMIT) || LIMIT < 1 || LIMIT > 20000) {
  console.error('--limit needs a whole number between 1 and 20000');
  process.exit(1);
}
const OUT_FILE = `seed-${choice}.sql`;
const BATCH = 250; // rows per INSERT, keeps the SQL Editor happy
// ----------------------------

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const bbox = BBOX.join(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Split the area into small squares so the free server does not time out
function tiles([s, w, n, e], size) {
  const out = [];
  for (let la = s; la < n; la += size) {
    for (let lo = w; lo < e; lo += size) {
      out.push([la, lo, Math.min(la + size, n), Math.min(lo + size, e)].map((x) => Number(x.toFixed(5))));
    }
  }
  return out;
}
const boxes = tiles(BBOX, TILE);

function buildQuery(preset, box) {
  const groups = [...preset.spots, ...preset.providers];
  const selectors = groups
    .map((g) => `  nwr${g.map(([k, v]) => `["${k}"="${v}"]`).join('')}["name"](${box.join(',')});`)
    .join('\n');
  return `\n[out:json][timeout:90];\n(\n${selectors}\n);\nout center tags;\n`;
}

// Returns the list of elements, or null when the servers did not answer (that square is skipped)
async function fetchOverpass(query) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'diveing-student-project',
          },
          body: 'data=' + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        return json.elements ?? [];
      } catch (err) {
        console.log(`    ${url.split('/')[2]} failed (${err.message})`);
      }
    }
    if (attempt < 3) {
      console.log(`    waiting, then trying again (${attempt}/3)`);
      await sleep(PAUSE_MS * attempt * 3);
    }
  }
  return null;
}

// Escape a value for SQL ('' for quotes), or return null
const sql = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const pick = (tags, ...keys) => {
  for (const k of keys) if (tags[k]) return tags[k];
  return null;
};
const matches = (tags, groups) => groups.some((g) => g.every(([k, v]) => tags[k] === v));

// A short description from the tags (OSM mostly has none)
function describe(tags) {
  if (tags.description) return String(tags.description).slice(0, 500);
  const parts = [];
  if (tags.ele && /^\d+(\.\d+)?$/.test(tags.ele)) parts.push(`Elevation: ${Math.round(Number(tags.ele))} m.`);
  if (tags.capacity && /^\d+$/.test(tags.capacity)) parts.push(`Capacity: ${tags.capacity}.`);
  if (tags.fee === 'yes' || tags.fee === 'no') parts.push(tags.fee === 'yes' ? 'Fee required.' : 'Free.');
  if (tags.opening_hours) parts.push(`Open: ${String(tags.opening_hours).slice(0, 80)}.`);
  return parts.join(' ') || null;
}

// Better documented entries first (when --limit cuts the list)
function score(tags) {
  return (
    (tags.wikidata ? 3 : 0) +
    (tags.wikipedia ? 3 : 0) +
    (pick(tags, 'website', 'contact:website') ? 2 : 0) +
    (tags.description ? 2 : 0) +
    (tags.ele || tags.capacity ? 1 : 0) +
    (tags.opening_hours ? 1 : 0)
  );
}

const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

const seenOsm = new Set();
const country = COUNTRY ? sql(COUNTRY) : 'null';
let out = `-- Generated from OpenStreetMap data (c) OpenStreetMap contributors, ODbL\n`;
out += `-- Activities: ${activities.join(', ')}. Bounding box (south,west,north,east): ${bbox}\n`;
out += `-- Needs activities.sql to be run first. Safe to run more than once.\n\n`;
out += `-- OSM does not tell us the difficulty level, so allow it to be empty\n`;
out += `alter table public.spots alter column level drop not null;\n`;
out += `alter table public.spots alter column level drop default;\n\n`;
if (activities.includes('diving')) {
  out += `-- Remove the two test rows from the schema step\n`;
  out += `delete from public.spots where name = 'Test Reef';\n`;
  out += `delete from public.schools where name = 'Test Dive Club';\n\n`;
}

let totalSpots = 0;
let totalSchools = 0;
let skipped = 0;

for (let n = 0; n < activities.length; n++) {
  const activity = activities[n];
  const preset = PRESETS[activity];
  console.log(`[${n + 1}/${activities.length}] ${activity}`);
  const elements = [];
  for (let b = 0; b < boxes.length; b++) {
    if (n > 0 || b > 0) await sleep(PAUSE_MS); // be nice to the free servers
    if (boxes.length > 1) console.log(`  square ${b + 1} of ${boxes.length}`);
    const part = await fetchOverpass(buildQuery(preset, boxes[b]));
    if (part === null) {
      skipped++;
      console.log('    no answer, square skipped');
    } else {
      elements.push(...part);
    }
  }

  const spots = [];
  const schools = [];
  const seenName = new Set();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = String(tags.name ?? '').trim();
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const osmId = `${el.type}/${el.id}`;
    if (seenOsm.has(osmId)) continue; // already used (by this or another activity)

    // same name within ~100 m = duplicate (e.g. a node and the area around it)
    const nameKey = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    if (seenName.has(nameKey)) continue;

    const isProvider = matches(tags, preset.providers);
    if (!isProvider && !matches(tags, preset.spots)) continue;

    seenOsm.add(osmId);
    seenName.add(nameKey);
    const point = `st_point(${lon}, ${lat})::geography`; // st_point(longitude, latitude)
    const act = sql(activity);

    if (isProvider) {
      schools.push({
        s: score(tags),
        row:
          `(${sql(name)}, ${sql(describe(tags))}, ${point}, ` +
          `${sql(pick(tags, 'website', 'contact:website'))}, ` +
          `${sql(pick(tags, 'phone', 'contact:phone'))}, ` +
          `${sql(pick(tags, 'email', 'contact:email'))}, ${sql(osmId)}, ${act}, ${country})`,
      });
    } else {
      const depth = activity === 'diving' ? parseInt(pick(tags, 'maxdepth', 'scuba_diving:maxdepth') ?? '', 10) : NaN;
      spots.push({
        s: score(tags),
        row:
          `(${sql(name)}, ${sql(describe(tags))}, ${point}, ` +
          `${Number.isFinite(depth) && depth >= 0 ? depth : 'null'}, ${sql(osmId)}, ${act}, ${country})`,
      });
    }
  }

  const best = (list) => list.sort((a, b) => b.s - a.s).slice(0, LIMIT).map((x) => x.row);
  const spotRows = best(spots);
  const schoolRows = best(schools);
  totalSpots += spotRows.length;
  totalSchools += schoolRows.length;
  console.log(`  found ${spots.length} spots and ${schools.length} providers, using ${spotRows.length} and ${schoolRows.length}`);

  if (spotRows.length) {
    out += `-- ${activity}: spots\n`;
    for (const part of chunks(spotRows, BATCH)) {
      out += `insert into public.spots (name, description, location, max_depth_m, osm_id, activity, country_code) values\n`;
      out += part.join(',\n') + `\non conflict (osm_id) do nothing;\n\n`;
    }
  }
  if (schoolRows.length) {
    out += `-- ${activity}: schools / providers\n`;
    for (const part of chunks(schoolRows, BATCH)) {
      out += `insert into public.schools (name, description, location, website, phone, email, osm_id, activity, country_code) values\n`;
      out += part.join(',\n') + `\non conflict (osm_id) do nothing;\n\n`;
    }
  }
}

// imported spots count as checked (same as the first import)
out += `-- imported spots count as checked\nupdate public.spots set is_verified = true where created_by is null and is_verified = false;\n`;

writeFileSync(OUT_FILE, out);
console.log(`Done: ${totalSpots} spots and ${totalSchools} providers written to ${OUT_FILE}`);
if (skipped) console.log(`${skipped} request(s) got no answer. Run the script again later to fill the gaps (it is safe to run twice).`);
