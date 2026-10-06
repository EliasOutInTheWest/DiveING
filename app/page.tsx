import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'DiveING – find your first dives',
  description:
    'Discover dive spots and dive schools, see how to get there by boat, and share photos and reviews with the diving community.',
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
    icon: '🗺️',
    title: 'Interactive dive map',
    text: 'Browse dive spots and dive schools around you, with details like depth, level and best season.',
  },
  {
    icon: '⛵',
    title: 'Boat routes',
    text: 'See how long the boat ride from a dive school to a spot takes and which way it goes.',
  },
  {
    icon: '🌊',
    title: 'Depth map and 3D',
    text: 'Switch on the depth view and tilt the map to see the shape of the sea floor.',
  },
  {
    icon: '⭐',
    title: 'Ratings and reviews',
    text: 'Read honest reviews from other divers and share your own experience.',
  },
  {
    icon: '📷',
    title: 'Photos and videos',
    text: 'Look at photos and short videos of a spot before you go, and add your own after the dive.',
  },
  {
    icon: '🎬',
    title: 'Reels-style feed',
    text: 'Swipe through photos and videos from the community. The feed shows you posts that fit your level and the spots you like.',
  },
  {
    icon: '♥',
    title: 'Likes and favourites',
    text: 'Like spots, photos and videos, and find them again in your profile.',
  },
  {
    icon: '🏫',
    title: 'Dive school pages',
    text: 'Schools look after their own page and boat routes, so the information stays up to date.',
  },
];

const STEPS = [
  { title: 'Explore the map', text: 'Find dive spots and dive schools near you or in the place you will travel to.' },
  { title: 'Check the details', text: 'Read about depth and level, look at photos and reviews, and see the boat route.' },
  { title: 'Join the community', text: 'Create a free account, add spots, upload photos and rate your dives.' },
];

export default async function Landing() {
  const counts = await getCounts();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ---------- hero ---------- */}
      <section
        className="relative overflow-hidden px-6 pb-32 pt-6 text-white"
        style={{ background: 'linear-gradient(to bottom, #082f49, #075985 55%, #0284c7)' }}
      >
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute left-10 top-64 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-1/3 top-96 h-24 w-24 rounded-full bg-white/5" />

        <nav className="relative mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight">🤿 DiveING</span>
          <div className="flex items-center gap-5 text-sm">
            <a href="#features" className="hidden text-sky-100 hover:text-white sm:inline">
              Features
            </a>
            <a href="#how" className="hidden text-sky-100 hover:text-white sm:inline">
              How it works
            </a>
            <a href="#schools" className="hidden text-sky-100 hover:text-white sm:inline">
              For dive schools
            </a>
            <Link href="/feed" className="text-sky-100 hover:text-white">
              Feed
            </Link>
            <Link
              href="/map"
              className="rounded-full bg-white px-4 py-1.5 font-medium text-sky-900 hover:bg-sky-50"
            >
              Open map
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto mt-20 max-w-5xl">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Find your first dives.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sky-100">
            DiveING helps new divers discover dive spots and dive schools, see how to get there by
            boat, and share photos and reviews with the community.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="rounded-full bg-white px-6 py-3 font-semibold text-sky-900 shadow hover:bg-sky-50"
            >
              Open the map →
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Watch the feed
            </Link>
          </div>
        </div>

        <svg
          className="absolute inset-x-0 bottom-0 h-16 w-full text-white"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0,40 C240,100 480,0 720,40 C960,80 1200,10 1440,50 L1440,100 L0,100 Z" />
        </svg>
      </section>

      {/* ---------- live numbers ---------- */}
      {counts && (
        <section className="relative z-10 mx-auto -mt-20 max-w-3xl px-6">
          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-5 text-center shadow-lg ring-1 ring-slate-100">
            <div>
              <div className="text-3xl font-bold text-sky-700">{counts.spots}</div>
              <div className="text-sm text-slate-500">dive spots</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500">{counts.schools}</div>
              <div className="text-sm text-slate-500">dive schools</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-sky-700">{counts.photos}</div>
              <div className="text-sm text-slate-500">photos and videos</div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- features ---------- */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Everything for your first dives</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          One place to find where to dive, who to dive with and what others experienced.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 p-5">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-700 text-xl font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- dive schools ---------- */}
      <section id="schools" className="mx-auto max-w-5xl px-6 py-20">
        <div className="rounded-2xl bg-sky-50 p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Are you a dive school?</h2>
          <p className="mt-3 max-w-2xl text-slate-700">
            Show your school on the map, keep your details up to date and draw the boat routes to
            your dive spots. Create an account on the map and ask an admin to link your school to
            it.
          </p>
          <Link
            href="/map"
            className="mt-6 inline-block rounded-full bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800"
          >
            Go to the map
          </Link>
        </div>
      </section>

      {/* ---------- safety note ---------- */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Please note:</strong> The information on DiveING is provided by the community and
          meant for orientation only. It does not replace a briefing by a certified dive
          professional. The depth map uses coarse global data and is not suitable for dive
          planning or navigation.
        </p>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="bg-slate-900 px-6 py-10 text-sm text-slate-300">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-bold text-white">🤿 DiveING</div>
            <p className="mt-1 text-slate-400">A student project to help new divers.</p>
          </div>
          <div className="max-w-md text-xs leading-relaxed text-slate-400">
            Map data © OpenStreetMap contributors, map tiles by OpenFreeMap / OpenMapTiles. Depth
            data: GEBCO / ETOPO1 via Mapzen Terrain Tiles.
          </div>
          <Link href="/map" className="font-medium text-white hover:underline">
            Open the map →
          </Link>
        </div>
      </footer>
    </div>
  );
}
