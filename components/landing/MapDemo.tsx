'use client';

import { useMemo, useState } from 'react';
import ActivityChips from '@/components/ActivityChips';
import { activityOf } from '@/lib/activities';
import { useInView, usePrefersReducedMotion } from '@/components/landing/hooks';

// Example spots on a drawn map. Nothing here comes from the database.
const PINS = [
  { id: 'd1', act: 'diving', x: 190, y: 190, name: 'Easy Reef' },
  { id: 'd2', act: 'diving', x: 108, y: 330, name: 'Kelp Garden' },
  { id: 'd3', act: 'diving', x: 262, y: 412, name: 'Wreck Point' },
  { id: 'p1', act: 'paddling', x: 268, y: 96, name: 'Calm Bay' },
  { id: 'p2', act: 'paddling', x: 640, y: 178, name: 'Mirror Lake' },
  { id: 'h1', act: 'hiking', x: 566, y: 92, name: 'Summit Trail' },
  { id: 'h2', act: 'hiking', x: 700, y: 304, name: 'Falls Walk' },
  { id: 'c1', act: 'camping', x: 520, y: 308, name: 'Pine Camp' },
  { id: 'c2', act: 'camping', x: 690, y: 440, name: 'Lakeshore Camp' },
  { id: 'b1', act: 'biking', x: 468, y: 196, name: 'Ridge Loop' },
  { id: 'b2', act: 'biking', x: 584, y: 430, name: 'Forest Park' },
  { id: 'k1', act: 'climbing', x: 622, y: 64, name: 'Granite Crag' },
];

const LAND =
  'M360 0 C402 70 330 122 380 192 C432 262 350 332 396 402 C432 462 402 500 424 520 L800 520 L800 0 Z';
const ROUTE = 'M352 256 C300 252 262 214 192 190';

export default function MapDemo() {
  const [chosen, setChosen] = useState<string[]>([]);
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const reduced = usePrefersReducedMotion();

  const visible = (act: string) => chosen.length === 0 || chosen.includes(act);
  const shown = useMemo(() => PINS.filter((p) => visible(p.act)).length, [chosen]); // eslint-disable-line react-hooks/exhaustive-deps
  const showRoute = visible('diving');

  return (
    <div className="lp-mapdemo">
      <div className="lp-mapdemo-side">
        <h2 className="lp-display lp-h2">Only what you love stays on the map.</h2>
        <p className="lp-lead">
          Switch an activity on and the pins for everything else fade out. Your choice is saved to your profile, and the
          feed follows it too.
        </p>
        <ActivityChips value={chosen} onChange={setChosen} className="mt-5" />
        <p className="lp-count" aria-live="polite">
          {shown} of {PINS.length} example spots shown
        </p>
        <p className="lp-fine">Preview with example spots, not real places.</p>
      </div>

      <div ref={ref} className="lp-mapframe">
        <svg viewBox="0 0 800 520" role="img" aria-label="Example map with spots for six activities" className="lp-map">
          <defs>
            <linearGradient id="lpWater" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0f6c97" />
              <stop offset="1" stopColor="#0a4466" />
            </linearGradient>
            <pattern id="lpGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
            </pattern>
          </defs>

          <rect width="800" height="520" fill="url(#lpWater)" />
          <rect width="800" height="520" fill="url(#lpGrid)" />

          {/* shallows along the coast */}
          <path d={LAND} fill="none" stroke="#7fd0e8" strokeOpacity="0.35" strokeWidth="26" strokeLinejoin="round" />
          <path d={LAND} fill="#c9deb8" stroke="#eaf3dc" strokeWidth="3" />

          {/* mountains, lake, road */}
          <g fill="#97b883">
            <path d="M520 130 L566 60 L612 130 Z" />
            <path d="M580 130 L640 40 L700 130 Z" />
            <path d="M650 150 L690 100 L730 150 Z" />
          </g>
          <ellipse cx="640" cy="182" rx="48" ry="26" fill="#2c8bb3" stroke="#eaf3dc" strokeWidth="3" />
          <path
            d="M392 300 C470 260 470 210 520 200 C580 190 600 260 690 250 C740 246 760 300 800 310"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.85"
            strokeWidth="3"
            strokeDasharray="2 9"
            strokeLinecap="round"
          />

          {/* boat route from the harbour to the dive spot */}
          <g className={`lp-route ${showRoute ? 'is-on' : ''}`}>
            <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="3 10" className="lp-route-line" />
            {!reduced && (
              <text fontSize="22" textAnchor="middle" dominantBaseline="central">
                🚤
                <animateMotion dur="5s" repeatCount="indefinite" path={ROUTE} />
              </text>
            )}
          </g>

          {/* the school at the harbour */}
          <g transform="translate(352 256)">
            <rect x="-11" y="-11" width="22" height="22" rx="5" fill="#f97316" stroke="#fff" strokeWidth="3" />
            <text y="1" fontSize="13" textAnchor="middle" dominantBaseline="central">
              🏫
            </text>
          </g>

          {/* pins */}
          {PINS.map((p, i) => {
            const a = activityOf(p.act);
            const on = visible(p.act);
            return (
              <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
                <g className={`lp-pin-vis ${on ? '' : 'is-off'}`}>
                  <g
                    className={`lp-pin ${seen ? 'is-dropped' : 'is-pre'}`}
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <title>{`${a.label}: ${p.name}`}</title>
                    <path
                      d="M0 0 C-9 -13 -15 -21 -15 -29 a15 15 0 1 1 30 0 C15 -21 9 -13 0 0 Z"
                      fill={a.color}
                      stroke="#fff"
                      strokeWidth="2.5"
                    />
                    <text y="-29" fontSize="15" textAnchor="middle" dominantBaseline="central">
                      {a.emoji}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
        <span className="lp-mapframe-tag">Preview</span>
      </div>
    </div>
  );
}
