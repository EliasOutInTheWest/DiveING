import Link from 'next/link';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { ACTIVITIES } from '@/lib/activities';
import { rings } from '@/lib/contours';
import LandingHeroMap from '@/components/LandingHeroMap';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'DiveING – your adventure map',
  description:
    'Discover dive spots, hiking spots, campsites and bike spots, find guides and schools, and share photos and videos with the community.',
};

// Live numbers for the start page (the page still works if this fails)
async function getCounts() {
  try {
    const [spots, schools, photos] = await Promise.all([
      supabase.from('spots').select('id', { count: 'exact', head: true }),
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
    ]);
    if (spots.error || schools.error) return null;
    return { spots: spots.count ?? 0, schools: schools.count ?? 0, photos: photos.count ?? 0 };
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    title: 'An adventure map you can filter',
    text: 'Browse dive spots, hiking spots, campsites and more, with level, season and country on every pin.',
  },
  {
    title: 'Only what you love',
    text: 'Choose your favourite activities once. The map and the feed then show only those.',
  },
  {
    title: 'Boat routes',
    text: 'See how long the boat ride from a dive school to a spot takes and which way it goes.',
  },
  {
    title: 'Depth view and 3D',
    text: 'Switch on the depth map, or tilt the map to see the shape of the sea floor and the mountains.',
  },
  {
    title: 'Honest reviews',
    text: 'Read what other people experienced and share your own rating.',
  },
  {
    title: 'Photos and videos',
    text: 'Look at a spot before you go, and add your own pictures afterwards.',
  },
  {
    title: 'A feed made for you',
    text: 'Swipe through community posts that fit your activities and the spots you like.',
  },
  {
    title: 'Likes and favourites',
    text: 'Like spots, photos and videos, and find them again in your profile.',
  },
];

const STEPS = [
  { title: 'Pick your activities', text: 'Diving, hiking, camping, biking, climbing or paddling. Choose any mix.' },
  { title: 'Explore the map', text: 'Find spots, schools and guides near you or where you will travel, and read reviews.' },
  { title: 'Join in', text: 'Create a free account, add spots, upload photos and videos and rate your trips.' },
];

const INK = '#0a2a33';
const PAPER = '#f1f5f2';
const FLAG = '#ff5b2e';

const fontDisplay: CSSProperties = { fontFamily: 'var(--font-display), system-ui, sans-serif' };
const fontBody: CSSProperties = { fontFamily: 'var(--font-body), system-ui, sans-serif' };

// Decorative contour lines used behind dark sections
function Contours({ cx, cy, seed, className }: { cx: number; cy: number; seed: number; className?: string }) {
  const lines = rings(cx, cy, 14, 30, 34, seed);
  return (
    <svg className={className} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default async function Landing() {
  const counts = await getCounts();

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen text-[#12303a]`}
      style={{ ...fontBody, backgroundColor: PAPER }}
    >
      <style>{`
        .hero-pulse { transform-box: fill-box; transform-origin: center; animation: heroPulse 2s ease-out infinite; }
        @keyframes heroPulse { from { opacity: .45; transform: scale(.7); } to { opacity: 0; transform: scale(1.6); } }
        .drift { animation: drift 40s ease-in-out infinite alternate; }
        @keyframes drift { from { transform: translate3d(0,0,0) scale(1.02); } to { transform: translate3d(-16px,10px,0) scale(1.06); } }
        @media (prefers-reduced-motion: reduce) { .hero-pulse, .drift { animation: none; } }
      `}</style>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden px-5 pb-20 pt-5 text-white sm:px-8 sm:pb-28" style={{ backgroundColor: INK }}>
        <Contours cx={900} cy={260} seed={2} className="drift pointer-events-none absolute inset-0 h-full w-full text-[#7fd0dd]/[0.13]" />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" style={fontDisplay}>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="13" fill="none" stroke="#f1f5f2" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="8" fill="none" stroke="#7fd0dd" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="3.5" fill={FLAG} />
            </svg>
            <span className="text-xl font-bold tracking-tight">DiveING</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="hidden text-[#cfe4e3] hover:text-white sm:inline">
              Features
            </a>
            <a href="#how" className="hidden text-[#cfe4e3] hover:text-white sm:inline">
              How it works
            </a>
            <a href="#schools" className="hidden text-[#cfe4e3] hover:text-white md:inline">
              For schools and guides
            </a>
            <Link href="/feed" className="text-[#cfe4e3] hover:text-white">
              Feed
            </Link>
            <Link
              href="/map"
              className="rounded-full bg-white px-4 py-2 font-semibold text-[#0a2a33] transition hover:bg-[#dff1ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e]"
            >
              Open map
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto mt-14 grid max-w-6xl items-center gap-12 lg:mt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <h1
              className="text-5xl font-bold leading-[0.98] tracking-[-0.03em] sm:text-7xl"
              style={fontDisplay}
            >
              Find your next adventure.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#cfe4e3]">
              A map for diving, hiking, camping, biking, climbing and paddling. Discover spots, find schools and
              guides, and share photos, videos and reviews with the community.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="rounded-full px-7 py-3.5 font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2a33]"
                style={{ backgroundColor: FLAG }}
              >
                Open the map
              </Link>
              <Link
                href="/feed"
                className="rounded-full border border-white/35 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Watch the feed
              </Link>
            </div>
            {counts && (
              <p className="mt-10 max-w-md text-sm leading-relaxed text-[#9fc3c4]">
                Already on the map: <span className="font-semibold text-white">{fmt(counts.spots)}</span> spots,{' '}
                <span className="font-semibold text-white">{fmt(counts.schools)}</span> schools and guides and{' '}
                <span className="font-semibold text-white">{fmt(counts.photos)}</span> photos and videos from the
                community.
              </p>
            )}
          </div>

          <LandingHeroMap />
        </div>
      </section>

      {/* ---------- activities ---------- */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={fontDisplay}>
            Choose your adventures
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-[#3d5c64]">
            Six activities, one map. Tap one to open the map with only those spots.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ACTIVITIES.map((a) => (
            <Link
              key={a.value}
              href={`/map?activity=${a.value}`}
              style={{ '--c': a.color } as CSSProperties}
              className="group relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-[#0a2a33]/10 transition hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--c)_9%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c)]"
            >
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: a.color }} aria-hidden="true" />
              <div className="mt-2 text-4xl transition group-hover:scale-110" aria-hidden="true">
                {a.emoji}
              </div>
              <div className="mt-5 text-lg font-semibold leading-tight" style={fontDisplay}>
                {a.label}
              </div>
              <div className="mt-0.5 text-sm text-[#5b7a80]">{a.spot}s</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={fontDisplay}>
              Everything for your next trip
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-[#3d5c64]">
              Where to go, who to go with and what others experienced, all in one place.
            </p>
            <Link
              href="/map"
              className="mt-7 inline-block rounded-full bg-[#0a2a33] px-6 py-3 font-semibold text-white transition hover:bg-[#0f3b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e] focus-visible:ring-offset-2"
            >
              Try the map
            </Link>
          </div>
          <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-t border-[#0a2a33]/15 pt-5">
                <dt className="text-xl font-semibold leading-snug" style={fontDisplay}>
                  {f.title}
                </dt>
                <dd className="mt-2 leading-relaxed text-[#3d5c64]">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="bg-[#dff1ee] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={fontDisplay}>
            How it works
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative md:pr-10">
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute left-14 right-4 top-6 hidden border-t-2 border-dashed border-[#0a2a33]/25 md:block"
                    aria-hidden="true"
                  />
                )}
                <div
                  className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0a2a33] text-xl font-bold text-white"
                  style={fontDisplay}
                >
                  {i + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold" style={fontDisplay}>
                  {s.title}
                </h3>
                <p className="mt-2 max-w-xs leading-relaxed text-[#3d5c64]">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- schools and providers ---------- */}
      <section id="schools" className="px-5 py-20 sm:px-8 sm:py-28">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] p-8 text-white sm:p-14"
          style={{ backgroundColor: INK }}
        >
          <Contours cx={980} cy={420} seed={6} className="pointer-events-none absolute inset-0 h-full w-full text-[#bfe8c9]/[0.14]" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={fontDisplay}>
              Are you a school, guide or provider?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#cfe4e3]">
              Put your dive school, guiding business, campground, bike shop or rental on the map and keep your
              details up to date. Dive schools can also draw boat routes to their dive spots. Create an account on
              the map and ask an admin to link your page to it.
            </p>
            <Link
              href="/map"
              className="mt-8 inline-block rounded-full px-7 py-3.5 font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ backgroundColor: FLAG }}
            >
              Go to the map
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- safety note ---------- */}
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <p className="rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <strong>Please note:</strong> The information on DiveING is provided by the community and meant for
          orientation only. It does not replace a briefing by a certified dive professional, a mountain guide or local
          authorities. Check weather, conditions and your own skills before you go. The depth map uses coarse global
          data and is not suitable for dive planning or navigation.
        </p>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="px-5 py-12 text-sm text-[#cfe4e3] sm:px-8" style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-bold text-white" style={fontDisplay}>
              DiveING
            </div>
            <p className="mt-1 text-[#9fc3c4]">A student project for people who love the outdoors.</p>
          </div>
          <div className="max-w-md text-xs leading-relaxed text-[#9fc3c4]">
            Map data © OpenStreetMap contributors, map tiles by OpenFreeMap / OpenMapTiles. Depth data: GEBCO / ETOPO1
            via Mapzen Terrain Tiles.
          </div>
          <Link href="/map" className="font-semibold text-white hover:underline">
            Open the map
          </Link>
        </div>
      </footer>
    </div>
  );
}
