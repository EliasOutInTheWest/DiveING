'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { activityOf } from '@/lib/activities';
import { usePrefersReducedMotion } from '@/components/landing/hooks';

// ---------------------------------------------------------------------------
// One landscape, cut in half: mountains above the waterline, the sea below.
// Every activity has a pin in it. The headline stem (Div, Hik, Camp ...) follows the pin
// that is active, and a click on a pin makes it the active one.
// ---------------------------------------------------------------------------

type Scene = { value: string; stem: string; blurb: string; pin: { x: number; y: number }; card: { title: string; meta: string } };

const SCENES: Scene[] = [
  { value: 'diving', stem: 'Div', blurb: 'Reefs, wrecks and walls, and the boat ride from the school to the spot.', pin: { x: 770, y: 612 }, card: { title: 'Easy Reef', meta: '12 m deep · beginner friendly' } },
  { value: 'hiking', stem: 'Hik', blurb: 'Summits, viewpoints and waterfalls, rated by the people who walked up.', pin: { x: 400, y: 206 }, card: { title: 'Summit Trail', meta: '8.4 km · 640 m climb' } },
  { value: 'camping', stem: 'Camp', blurb: 'Campsites and huts with reviews, so you know the ground before you pitch.', pin: { x: 230, y: 404 }, card: { title: 'Pine Camp', meta: 'Lakeside · 12 pitches' } },
  { value: 'biking', stem: 'Bik', blurb: 'Trails and bike parks, plus shops that rent you a bike for the day.', pin: { x: 1330, y: 400 }, card: { title: 'Ridge Loop', meta: '14 km · flowy descent' } },
  { value: 'climbing', stem: 'Climb', blurb: 'Crags and gyms, with the grade and the people to climb with.', pin: { x: 1160, y: 248 }, card: { title: 'Granite Crag', meta: '40 routes · 5a to 7b' } },
  { value: 'paddling', stem: 'Paddl', blurb: 'Put-ins and quiet bays for kayaks, canoes and boards.', pin: { x: 900, y: 466 }, card: { title: 'Calm Bay', meta: 'Sheltered · kayak friendly' } },
];

const VB_W = 1600;
const VB_H = 800;
const WATER = 500; // y of the waterline in the drawing

const cv = (vars: Record<string, string | number>) => vars as unknown as CSSProperties;

// the same numbers on the server and in the browser: a tiny seeded random generator
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function wavePath(y: number, amp: number, period: number, width: number, bottom: number) {
  let d = `M0 ${bottom} L0 ${y}`;
  for (let x = 0; x <= width; x += 20) d += ` L${x} ${(y + Math.sin((x / period) * Math.PI * 2) * amp).toFixed(1)}`;
  return `${d} L${width} ${bottom} Z`;
}

// the two hills in front of the mountains
const leftY = (x: number) => WATER - 54 * Math.exp(-(((x - 130) / 240) ** 2));
const rightY = (x: number) => WATER - 78 * Math.exp(-(((x - 1400) / 270) ** 2));
function hillPath(from: number, to: number, fn: (x: number) => number) {
  let d = `M${from} ${WATER}`;
  for (let x = from; x <= to; x += 20) d += ` L${x} ${fn(x).toFixed(1)}`;
  return `${d} L${to} ${WATER} Z`;
}
const LEFT_HILL = hillPath(0, 620, leftY);
const RIGHT_HILL = hillPath(980, 1600, rightY);

function pine(x: number, y: number, h: number) {
  const w = h * 0.34;
  return `M${x.toFixed(1)} ${(y - h).toFixed(1)} L${(x - w).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x - w * 0.5).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x - w * 1.1).toFixed(1)} ${y.toFixed(1)} L${(x + w * 1.1).toFixed(1)} ${y.toFixed(1)} L${(x + w * 0.5).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x + w).toFixed(1)} ${(y - h * 0.3).toFixed(1)} Z`;
}
function makeTrees() {
  const rnd = seeded(7);
  const out: string[] = [];
  for (let x = 14; x < 560; x += 20 + rnd() * 10) {
    if (x > 190 && x < 330) {
      rnd();
      rnd();
      continue; // the camp stays open
    }
    out.push(pine(x, leftY(x) + 3, 26 + rnd() * 22));
  }
  for (let x = 1020; x < 1590; x += 20 + rnd() * 12) {
    out.push(pine(x, rightY(x) + 3, 26 + rnd() * 24));
  }
  return out.join(' ');
}
const TREES = makeTrees();

const STARS = (() => {
  const rnd = seeded(21);
  return Array.from({ length: 46 }, () => ({
    x: Number((rnd() * 100).toFixed(2)),
    y: Number((rnd() * 46).toFixed(2)),
    s: Number((1 + rnd() * 2).toFixed(2)),
    d: Number((2.4 + rnd() * 4).toFixed(2)),
    o: Number((-rnd() * 6).toFixed(2)),
  }));
})();

const FISH = [
  { y: 560, dur: 26, delay: -3, c: '#ffd166', s: 1 },
  { y: 574, dur: 26, delay: -4.2, c: '#ffd166', s: 0.8 },
  { y: 551, dur: 26, delay: -5, c: '#ffd166', s: 0.9 },
  { y: 566, dur: 26, delay: -6.1, c: '#ffd166', s: 0.7 },
  { y: 640, dur: 34, delay: -14, c: '#ff8c42', s: 1.5 },
  { y: 676, dur: 41, delay: -27, c: '#9bd1e5', s: 1.2 },
  { y: 612, dur: 31, delay: -19, c: '#ff8c42', s: 1.1 },
  { y: 700, dur: 38, delay: -8, c: '#ffd166', s: 1.3 },
];

const BUBBLES = Array.from({ length: 14 }, (_, i) => {
  const rnd = seeded(40 + i);
  return {
    x: Number((735 + rnd() * 80 + (i % 3 === 0 ? 330 : 0)).toFixed(1)),
    r: Number((2 + rnd() * 4).toFixed(1)),
    dur: Number((5 + rnd() * 5).toFixed(1)),
    delay: Number((-rnd() * 9).toFixed(1)),
    dx: Number(((rnd() - 0.5) * 30).toFixed(1)),
  };
});

const CORALS = [
  { x: 210, c: '#ff7f50' },
  { x: 330, c: '#ff5d8f' },
  { x: 560, c: '#ffd166' },
  { x: 1010, c: '#ff5d8f' },
  { x: 1130, c: '#ff7f50' },
  { x: 1260, c: '#ffd166' },
  { x: 1440, c: '#ff5d8f' },
];
const KELP = [90, 130, 480, 640, 1330, 1380, 1520];

// ---------------------------------------------------------------------------

type PinProps = { scene: Scene; active: boolean; onSelect: (value: string) => void };

function Pin({ scene, active, onSelect }: PinProps) {
  const a = activityOf(scene.value);
  return (
    <g
      className="lp-hpin"
      data-active={active}
      transform={`translate(${scene.pin.x} ${scene.pin.y})`}
      role="button"
      tabIndex={0}
      aria-label={`Show ${a.label.toLowerCase()}`}
      aria-pressed={active}
      onClick={() => onSelect(scene.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(scene.value);
        }
      }}
    >
      <circle className="lp-hpin-hit" cx="0" cy="-30" r="38" />
      <ellipse className="lp-ring" cx="0" cy="0" rx="16" ry="6" stroke={a.color} />
      <ellipse className="lp-ring lp-ring-2" cx="0" cy="0" rx="16" ry="6" stroke={a.color} />
      <g className="lp-hpin-body">
        <path
          d="M0 0 C-6 -12 -22 -24 -22 -40 A22 22 0 1 1 22 -40 C22 -24 6 -12 0 0 Z"
          fill={a.color}
          stroke="#ffffff"
          strokeWidth="3"
        />
        <circle cx="0" cy="-40" r="15" fill="#ffffff" fillOpacity="0.95" />
        <text x="0" y="-40" textAnchor="middle" dominantBaseline="central" fontSize="19">
          {a.emoji}
        </text>
      </g>
    </g>
  );
}

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [vw, setVw] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const stemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pausedUntil = useRef(0);

  const scene = SCENES[active];
  const activity = activityOf(scene.value);

  // start the opening sequence
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setLoaded(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // the viewport width (the scene pans on small screens)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // measure the width of every stem, so "ING" always sits right next to the word
  useEffect(() => {
    function measure() {
      setWidths(stemRefs.current.map((el) => (el ? el.offsetWidth : 0)));
    }
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, []);

  // switch to the next activity every few seconds (a click on a pin pauses this for a while)
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setActive((i) => (i + 1) % SCENES.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [reduced]);

  function select(value: string) {
    const i = SCENES.findIndex((s) => s.value === value);
    if (i < 0) return;
    pausedUntil.current = Date.now() + 12000;
    setActive(i);
  }

  // the mouse moves the layers a little (not for touch screens or reduced motion)
  function onPointerMove(e: React.PointerEvent) {
    if (reduced || e.pointerType === 'touch') return;
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  }

  // on narrow screens the scene is wider than the screen: slide it so the active pin stays in view
  const SCENE_MIN = 960;
  const narrow = vw > 0 && vw < SCENE_MIN;
  const pan = useMemo(() => {
    if (!narrow) return 0;
    const k = SCENE_MIN / VB_W;
    return Math.min(0, Math.max(vw - SCENE_MIN, vw / 2 - scene.pin.x * k));
  }, [narrow, vw, scene.pin.x]);

  const waves = useMemo(
    () => ({ back: wavePath(WATER, 5, 400, 3200, WATER + 24), front: wavePath(WATER + 7, 7, 320, 3200, WATER + 30) }),
    []
  );

  const stemWidth = widths[active] || undefined;

  return (
    <section
      ref={heroRef}
      className={`lp-hero ${loaded || reduced ? 'lp-loaded' : ''}`}
      style={cv({ '--accent': activity.color })}
      onPointerMove={onPointerMove}
    >
      {/* stars of the pre-dawn sky */}
      <div className="lp-stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            style={cv({ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, '--d': `${s.d}s`, '--o': `${s.o}s` })}
          />
        ))}
        <i className="lp-shoot lp-shoot-1" />
        <i className="lp-shoot lp-shoot-2" />
      </div>

      {/* an example card for the active activity (not a real place) */}
      <aside key={`card-${scene.value}`} className="lp-card" aria-hidden="true">
        <span className="lp-card-emoji">{activity.emoji}</span>
        <span className="lp-card-text">
          <b>{scene.card.title}</b>
          <span>{scene.card.meta}</span>
        </span>
        <i className="lp-card-tag">Example</i>
      </aside>

      {/* ---------- the words ---------- */}
      <div className="lp-hero-text">
        <h1 className="lp-h1" aria-label="Diving, hiking, camping, biking, climbing and paddling">
          <span className="lp-h1-row" aria-hidden="true">
            <span className="lp-stem-window" style={{ width: stemWidth }}>
              <span className="lp-stem-track" style={{ transform: `translateY(${(-active * 100) / SCENES.length}%)` }}>
                {SCENES.map((s, i) => (
                  <span key={s.value} className="lp-stem" style={{ color: activityOf(s.value).color }}>
                    <span
                      ref={(el) => {
                        stemRefs.current[i] = el;
                      }}
                    >
                      {s.stem}
                    </span>
                  </span>
                ))}
              </span>
            </span>
            <span className="lp-ing">ING</span>
          </span>
        </h1>

        <p className="lp-lede">
          One map for diving, hiking, camping, biking, climbing and paddling. Pick your favourites and see only those.
        </p>

        <div className="lp-cta-row">
          <Link href={`/map?activity=${scene.value}`} className="lp-btn lp-btn-primary">
            Open the map
          </Link>
          <Link href="/feed" className="lp-btn lp-btn-ghost">
            Watch the feed
          </Link>
        </div>

        <p key={scene.value} className="lp-blurb" aria-live="polite">
          <strong style={{ color: activity.color }}>{activity.label}.</strong> {scene.blurb}
        </p>

        <a href="#worlds" className="lp-cue">
          <span>Scroll to dive</span>
          <i aria-hidden="true" />
        </a>
      </div>

      {/* ---------- the landscape ---------- */}
      <div className="lp-scene" style={narrow ? { width: SCENE_MIN, transform: `translateX(${pan}px)` } : undefined}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="lp-svg"
          role="img"
          aria-label="A coast with mountains above the waterline and a reef below it. Click a pin to switch the activity."
        >
          <defs>
            <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1f33" />
              <stop offset="0.5" stopColor="#1a4766" />
              <stop offset="0.85" stopColor="#4d94a0" />
              <stop offset="1" stopColor="#f4b266" />
            </linearGradient>
            <radialGradient id="lp-sunglow">
              <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.85" />
              <stop offset="0.4" stopColor="#f4b266" stopOpacity="0.28" />
              <stop offset="1" stopColor="#f4b266" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lp-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b9bb5" />
              <stop offset="0.25" stopColor="#14627b" />
              <stop offset="0.6" stopColor="#0a3a4d" />
              <stop offset="1" stopColor="#061c27" />
            </linearGradient>
            <linearGradient id="lp-ray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lp-lantern">
              <stop offset="0" stopColor="#ffb347" stopOpacity="0.8" />
              <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
            <path id="lp-bikepath" d="M1590 436 C1520 416 1470 432 1400 421 C1340 411 1290 435 1230 443" />
          </defs>

          {/* sky + sun */}
          <rect x="0" y="0" width={VB_W} height={WATER + 4} fill="url(#lp-sky)" />
          <g className="lp-sun">
            <circle cx="900" cy="372" r="260" fill="url(#lp-sunglow)" />
            <circle cx="900" cy="372" r="62" fill="#ffe2b0" />
          </g>

          {/* clouds */}
          <g className="lp-cloud lp-cloud-1" opacity="0.16" fill="#ffffff">
            <ellipse cx="260" cy="160" rx="120" ry="16" />
            <ellipse cx="330" cy="148" rx="70" ry="14" />
          </g>
          <g className="lp-cloud lp-cloud-2" opacity="0.12" fill="#ffffff">
            <ellipse cx="1180" cy="120" rx="150" ry="18" />
            <ellipse cx="1110" cy="108" rx="80" ry="13" />
          </g>

          {/* far mountains */}
          <g className="lp-layer lp-mtn-far">
            <path
              fill="#2a5c7c"
              d="M0 500 L0 400 L110 350 L200 395 L300 330 L420 410 L540 360 L650 430 L780 350 L900 424 L1010 340 L1120 410 L1240 330 L1340 395 L1450 345 L1600 410 L1600 500 Z"
            />
          </g>

          {/* near mountains: the hiking summit on the left, the climbing wall on the right */}
          <g className="lp-layer lp-mtn-mid">
            <path
              fill="#1c4a63"
              d="M0 500 L0 430 L120 390 L240 320 L330 270 L400 245 L470 300 L560 350 L640 420 L760 396 L860 444 L960 404 L1040 320 L1110 275 L1160 262 L1220 310 L1300 330 L1400 380 L1500 350 L1600 380 L1600 500 Z"
            />
            <path fill="#e8f4f1" fillOpacity="0.9" d="M372 262 L400 245 L428 266 L412 258 L400 270 L388 258 Z" />
            <path fill="#e8f4f1" fillOpacity="0.9" d="M1135 280 L1160 262 L1188 284 L1172 276 L1160 288 L1148 277 Z" />
            {/* climbing wall + rope */}
            <path fill="#113043" fillOpacity="0.85" d="M1160 262 L1222 312 L1204 424 L1148 432 Z" />
            <path stroke="#ffd166" strokeWidth="2" d="M1160 278 L1176 392" />
            <g className="lp-climber">
              <circle cx="1166" cy="304" r="5" fill="#ff6b6b" stroke="#ffffff" strokeWidth="1.5" />
            </g>
            {/* hiking trail up to the summit, with a flag */}
            <path
              className="lp-trail"
              fill="none"
              stroke="#ffd166"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M560 466 C520 442 590 412 520 384 C470 358 540 332 474 304 C432 284 452 264 405 252"
            />
            <path stroke="#ffffff" strokeWidth="2" d="M400 246 L400 216" />
            <path className="lp-flag" fill="#ff6b6b" d="M400 216 L424 224 L400 232 Z" />
          </g>

          {/* hills with pine trees + the camp */}
          <g className="lp-layer lp-hills">
            <path fill="#123f45" d={LEFT_HILL} />
            <path fill="#123f45" d={RIGHT_HILL} />
            <path fill="#0a2c31" d={TREES} />
            {/* tent + campfire */}
            <ellipse className="lp-lantern" cx="230" cy="440" rx="60" ry="42" fill="url(#lp-lantern)" />
            <path fill="#ff9f1c" d="M200 459 L230 418 L260 459 Z" />
            <path fill="#7a3b00" d="M230 418 L217 459 L243 459 Z" />
            <path className="lp-fire" fill="#ff7a1a" d="M284 459 C276 450 282 442 285 434 C289 442 296 450 284 459 Z" />
            {/* bike trail with a rider */}
            <use
              href="#lp-bikepath"
              fill="none"
              stroke="#e8f4f1"
              strokeOpacity="0.4"
              strokeWidth="2"
              strokeDasharray="2 5"
              strokeLinecap="round"
            />
            {!reduced && (
              <circle r="5" fill="#b980f0" stroke="#ffffff" strokeWidth="1.5">
                <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#lp-bikepath" />
                </animateMotion>
              </circle>
            )}
          </g>

          {/* the sea */}
          <g className="lp-layer lp-hsea">
            <rect x="0" y={WATER} width={VB_W} height={VB_H - WATER} fill="url(#lp-water)" />
            <g className="lp-wave lp-wave-back">
              <path d={waves.back} fill="#2b9bb5" />
            </g>

            {/* light from above */}
            <g className="lp-sunrays">
              <polygon points="300,505 380,505 520,790 380,790" fill="url(#lp-ray)" opacity="0.1" />
              <polygon points="640,505 700,505 780,790 650,790" fill="url(#lp-ray)" opacity="0.08" />
              <polygon points="980,505 1060,505 1180,790 1020,790" fill="url(#lp-ray)" opacity="0.1" />
              <polygon points="1300,505 1350,505 1420,790 1320,790" fill="url(#lp-ray)" opacity="0.07" />
            </g>

            {/* dive boat and its route to the spot */}
            <path
              className="lp-droute"
              fill="none"
              stroke="#ff9f1c"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 9"
              d="M652 514 C 650 562 722 570 770 598"
            />
            <g className="lp-boat">
              <path fill="#e8f4f1" d="M612 497 L674 497 L660 513 L626 513 Z" />
              <rect x="634" y="480" width="24" height="17" rx="2" fill="#f97316" />
              <rect x="639" y="485" width="6" height="6" fill="#0b1f33" fillOpacity="0.55" />
            </g>

            {/* paddler */}
            <g className="lp-kayak">
              <path fill="#ffd166" d="M866 498 Q900 513 934 498 Z" />
              <circle cx="900" cy="489" r="5" fill="#e8f4f1" />
              <path className="lp-paddle" stroke="#e8f4f1" strokeWidth="2" strokeLinecap="round" d="M880 487 L920 505" />
            </g>

            <g className="lp-wave lp-wave-front">
              <path d={waves.front} fill="#1e86a0" fillOpacity="0.5" />
            </g>

            {/* life under water */}
            {FISH.map((f, i) => (
              <g key={i} transform={`translate(0 ${f.y})`}>
                <g className="lp-fish" style={cv({ '--dur': `${f.dur}s`, '--delay': `${f.delay}s` })}>
                  <g transform={`scale(${f.s})`} fill={f.c}>
                    <ellipse cx="0" cy="0" rx="11" ry="5" />
                    <path d="M9 0 L20 -6 L20 6 Z" />
                  </g>
                </g>
              </g>
            ))}
            {BUBBLES.map((b, i) => (
              <circle
                key={i}
                className="lp-bubble"
                cx={b.x}
                cy="742"
                r={b.r}
                style={cv({ '--dur': `${b.dur}s`, '--delay': `${b.delay}s`, '--dx': `${b.dx}px` })}
              />
            ))}

            {/* sea floor */}
            <path
              fill="#0a2f3d"
              d="M0 800 L0 738 C60 712 120 730 180 748 C260 768 330 744 400 754 C520 772 600 746 700 758 C800 770 900 742 1000 754 C1100 766 1200 738 1300 750 C1400 762 1500 732 1600 746 L1600 800 Z"
            />
            {KELP.map((x, i) => (
              <path
                key={x}
                className="lp-kelp"
                d={`M${x} 770 C${x - 14} 745 ${x + 14} 725 ${x} 700 C${x - 12} 680 ${x + 10} 668 ${x} 650`}
                fill="none"
                stroke="#2f8f5b"
                strokeWidth="6"
                strokeLinecap="round"
                style={cv({ '--delay': `${-i * 0.9}s` })}
              />
            ))}
            {CORALS.map((c) => (
              <path
                key={c.x}
                d={`M${c.x} 770 L${c.x} 738 M${c.x} 754 L${c.x - 15} 740 M${c.x} 748 L${c.x + 15} 733`}
                fill="none"
                stroke={c.c}
                strokeWidth="8"
                strokeLinecap="round"
              />
            ))}
            <path
              fill="#051820"
              d="M0 800 L0 774 C100 760 220 782 360 772 C520 760 640 784 800 774 C960 764 1120 784 1280 772 C1420 762 1520 780 1600 770 L1600 800 Z"
            />
          </g>

          {/* the pins: one per activity */}
          <g className="lp-layer lp-pins">
            {SCENES.map((s) => (
              <Pin key={s.value} scene={s} active={s.value === scene.value} onSelect={select} />
            ))}
          </g>
        </svg>

        {/* where the sea starts (the depth gauge reads this) */}
        <div className="lp-waterline" data-waterline="" aria-hidden="true" />
      </div>
    </section>
  );
}
