import Link from 'next/link';
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { ACTIVITIES } from '@/lib/activities';
import '@/components/landing/landing.css';
import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import Worlds from '@/components/landing/Worlds';
import MapDemo from '@/components/landing/MapDemo';
import PhoneDemo from '@/components/landing/PhoneDemo';
import Contours from '@/components/landing/Contours';
import CountUp from '@/components/landing/CountUp';
import Reveal from '@/components/landing/Reveal';
import ScrollFx from '@/components/landing/ScrollFx';
import DepthGauge from '@/components/landing/DepthGauge';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-lp', display: 'swap' });

export const metadata: Metadata = {
  title: 'DiveING – your adventure map',
  description:
    'One map for diving, hiking, camping, biking, climbing and paddling. Find spots, schools and guides, and share photos and videos with the community.',
};

// the numbers are refreshed every few minutes, not on every visit
export const revalidate = 300;

// Live numbers for the start page (the page still works if this fails)
async function getCounts() {
  try {
    const [spots, schools, media] = await Promise.all([
      supabase.from('spots').select('id', { count: 'exact', head: true }),
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
    ]);
    if (spots.error || schools.error) return null;
    return { spots: spots.count ?? 0, schools: schools.count ?? 0, media: media.count ?? 0 };
  } catch {
    return null;
  }
}

const FEED_POINTS = [
  'Swipe through photos and videos, one after the other.',
  'Posts that match your favourite activities come first.',
  'Tap the pin to see the spot on the map, tap the heart to keep it.',
];

function Marquee() {
  const half = (
    <div className="lp-marquee-half" style={{ display: 'flex' }}>
      {ACTIVITIES.flatMap((a) => [
        <span key={a.value + '-spot'} className="lp-marquee-item">
          <b aria-hidden="true">{a.emoji}</b>
          {a.label}
        </span>,
        <span key={a.value + '-provider'} className="lp-marquee-item">
          <b aria-hidden="true">✦</b>
          {a.spot}s
        </span>,
      ])}
    </div>
  );
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {half}
        {half}
      </div>
    </div>
  );
}

export default async function Landing() {
  const counts = await getCounts();

  return (
    <div className={`lp-page ${display.variable}`}>
      {/* the page stays readable when scripts are blocked */}
      <noscript>
        <style>{`.lp-reveal,.lp-h1-row,.lp-lede,.lp-cta-row,.lp-blurb,.lp-cue,.lp-svg,.lp-stars,.lp-hpin{opacity:1!important;translate:none!important;filter:none!important}`}</style>
      </noscript>
      <div className="lp-progress" aria-hidden="true" />
      <ScrollFx />
      <DepthGauge />
      <LandingNav />

      <main>
        <Hero />
        <Marquee />

        {/* ---------- six worlds ---------- */}
        <section id="worlds" className="lp-section lp-dark">
          <div className="lp-wrap">
            <Reveal className="lp-section-head">
              <h2 className="lp-display lp-h2">Six worlds. One map.</h2>
              <p className="lp-lead">
                From a kelp forest to a granite wall. Open a world to see what you can find in it.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <Worlds />
            </Reveal>
          </div>
        </section>

        {/* ---------- map ---------- */}
        <section id="map" className="lp-section lp-light">
          <div className="lp-wrap">
            <Reveal>
              <MapDemo />
            </Reveal>
          </div>
        </section>

        {/* ---------- feed ---------- */}
        <section id="feed" className="lp-section lp-night">
          <div className="lp-wrap lp-feed">
            <Reveal>
              <h2 className="lp-display lp-h2">See it before you go.</h2>
              <p className="lp-lead">
                A feed made of real photos and short videos from the people who were there, filtered to the
                adventures you picked.
              </p>
              <ul className="lp-feed-list">
                {FEED_POINTS.map((t) => (
                  <li key={t}>
                    <span aria-hidden="true">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/feed" className="lp-btn lp-btn-light">
                Open the feed
              </Link>
            </Reveal>
            <Reveal delay={200}>
              <div className="lp-phone-stage">
                <span className="lp-chip lp-chip-1" aria-hidden="true">
                  ♥ 342
                </span>
                <span className="lp-chip lp-chip-2" aria-hidden="true">
                  📍 Summit Trail
                </span>
                <span className="lp-chip lp-chip-3" aria-hidden="true">
                  ▶ 0:42
                </span>
                <PhoneDemo />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------- what else is inside ---------- */}
        <section className="lp-section lp-light">
          <div className="lp-wrap">
            <Reveal className="lp-section-head">
              <h2 className="lp-display lp-h2">Everything for the trip.</h2>
              <p className="lp-lead">The small things that make planning easier.</p>
            </Reveal>
            <div className="lp-facts">
              <Reveal delay={0}>
                <article className="lp-fact">
                  <div className="lp-ico lp-ico-route" aria-hidden="true">
                    <svg viewBox="0 0 200 108">
                      <path d="M24 80 C 70 10, 120 100, 180 30" fill="none" stroke="#0369a1" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="24" cy="80" r="6" fill="#f97316" stroke="#fff" strokeWidth="2.5" />
                      <circle cx="180" cy="30" r="6" fill="#0ea5e9" stroke="#fff" strokeWidth="2.5" />
                    </svg>
                    <span className="lp-ico-dot">🚤</span>
                  </div>
                  <h3 className="lp-display">Boat routes</h3>
                  <p>See how long the boat ride from a dive school to a spot takes, and which way it goes.</p>
                </article>
              </Reveal>
              <Reveal delay={120}>
                <article className="lp-fact">
                  <div className="lp-ico lp-ico-depth" aria-hidden="true">
                    <svg viewBox="0 0 200 108" preserveAspectRatio="none">
                      <path d="M0 40 Q30 28 60 40 T120 40 T180 40 T240 40 T300 40 V108 H0Z" fill="rgba(255,255,255,0.16)" />
                      <path d="M0 62 Q30 50 60 62 T120 62 T180 62 T240 62 T300 62 V108 H0Z" fill="rgba(255,255,255,0.14)" />
                      <path d="M0 84 Q30 72 60 84 T120 84 T180 84 T240 84 T300 84 V108 H0Z" fill="rgba(0,0,0,0.25)" />
                    </svg>
                  </div>
                  <h3 className="lp-display">Depth map and 3D</h3>
                  <p>Switch on the depth view, or tilt the map to see the shape of the sea floor and the mountains.</p>
                </article>
              </Reveal>
              <Reveal delay={240}>
                <article className="lp-fact">
                  <div className="lp-ico lp-ico-stars" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className="lp-star" style={{ ['--i' as string]: i }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <h3 className="lp-display">Honest reviews</h3>
                  <p>Read what other people experienced, and add your own rating after you go.</p>
                </article>
              </Reveal>
              <Reveal delay={360}>
                <article className="lp-fact">
                  <div className="lp-ico lp-ico-like" aria-hidden="true">
                    <span>♥</span>
                  </div>
                  <h3 className="lp-display">Favourites and people</h3>
                  <p>Keep the spots you like, follow other adventurers and see their posts on their profile.</p>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- live numbers ---------- */}
        {counts && (counts.spots > 0 || counts.schools > 0) && (
          <section className="lp-section lp-dark" aria-label="DiveING in numbers">
            <div className="lp-wrap">
              <div className="lp-stats">
                <Reveal delay={0}>
                  <span className="lp-stat-num">
                    <CountUp value={counts.spots} />
                  </span>
                  <span className="lp-stat-label">spots on the map</span>
                </Reveal>
                <Reveal delay={150}>
                  <span className="lp-stat-num">
                    <CountUp value={counts.schools} />
                  </span>
                  <span className="lp-stat-label">schools, shops and guides</span>
                </Reveal>
                <Reveal delay={300}>
                  <span className="lp-stat-num">
                    <CountUp value={counts.media} />
                  </span>
                  <span className="lp-stat-label">photos and videos</span>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* ---------- for businesses ---------- */}
        <section id="schools" className="lp-section lp-cta">
          <Contours className="lp-contours" seed={3} rings={17} />
          <div className="lp-wrap">
            <Reveal className="lp-cta-box">
              <h2 className="lp-display lp-h2">Run a dive school or an outdoor shop?</h2>
              <p className="lp-lead">
                Get found by people who are already looking at the map. Add your business, keep your details up to
                date and let your guests leave reviews.
              </p>
              <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/map" className="lp-btn lp-btn-light">
                  Add your business
                </Link>
                <Link href="/people" className="lp-btn lp-btn-ghost">
                  Find people
                </Link>
              </div>
              <p className="lp-safety">
                Diving and other outdoor activities carry risk. DiveING helps you plan, it does not replace training,
                local knowledge or the weather forecast. Spots on the map can be wrong or out of date, so check
                before you go.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <ul className="lp-footer-links">
            <li>
              <Link href="/map">Map</Link>
            </li>
            <li>
              <Link href="/feed">Feed</Link>
            </li>
            <li>
              <Link href="/people">People</Link>
            </li>
            <li>
              <Link href="/settings">Settings</Link>
            </li>
          </ul>
          <small>
            Map data © OpenStreetMap contributors. Base map by OpenFreeMap and OpenMapTiles. Depth data from GEBCO.
          </small>
          <span className="lp-wordmark lp-display" aria-hidden="true">
            DiveING
          </span>
        </div>
      </footer>
    </div>
  );
}
