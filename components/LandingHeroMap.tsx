'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ACTIVITIES } from '@/lib/activities';
import { rings } from '@/lib/contours';

// Where each kind of spot sits on the little illustration (viewBox 600 x 560)
const PINS: Record<string, { x: number; y: number }> = {
  diving: { x: 138, y: 400 },
  paddling: { x: 262, y: 318 },
  camping: { x: 352, y: 232 },
  hiking: { x: 452, y: 150 },
  climbing: { x: 506, y: 262 },
  biking: { x: 396, y: 372 },
};

const LAND = rings(430, 210, 7, 26, 24, 1.2);
const SEA = rings(170, 420, 7, 22, 24, 4.1);

// The hero's one moving part: pick activities and watch the pins on the map react.
export default function LandingHeroMap() {
  const [chosen, setChosen] = useState<string[]>([]);

  function toggle(v: string) {
    setChosen((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
  }

  const link = chosen.length === 1 ? `/map?activity=${chosen[0]}` : '/map';

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[28px] bg-[#0f3b47] ring-1 ring-white/15">
        <svg viewBox="0 0 600 560" className="block w-full" role="img" aria-label="Illustrated map with one pin for each activity">
          {/* sea and land */}
          <rect width="600" height="560" fill="#0f3b47" />
          <path
            d="M600,0 L600,560 L520,560 C470,470 420,470 380,420 C330,360 270,380 230,320 C190,260 240,210 210,150 C190,100 150,70 170,0 Z"
            fill="#1b5b45"
          />
          <path
            d="M520,560 C470,470 420,470 380,420 C330,360 270,380 230,320 C190,260 240,210 210,150 C190,100 150,70 170,0"
            fill="none"
            stroke="#f1f5f2"
            strokeOpacity="0.55"
            strokeWidth="2"
          />

          {/* depth lines in the sea, height lines on land */}
          <g fill="none" stroke="#7fd0dd" strokeOpacity="0.35" strokeWidth="1.2">
            {SEA.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <g fill="none" stroke="#bfe8c9" strokeOpacity="0.4" strokeWidth="1.2">
            {LAND.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* pins */}
          {ACTIVITIES.map((a) => {
            const p = PINS[a.value];
            if (!p) return null;
            const on = chosen.length === 0 || chosen.includes(a.value);
            const picked = chosen.includes(a.value);
            return (
              <g
                key={a.value}
                transform={`translate(${p.x} ${p.y})`}
                style={{ opacity: on ? 1 : 0.18, transition: 'opacity 250ms ease' }}
              >
                {picked && <circle r="30" fill={a.color} className="hero-pulse" />}
                <g style={{ transform: picked ? 'scale(1.25)' : 'scale(1)', transition: 'transform 250ms ease' }}>
                  <circle r="21" fill="#f1f5f2" />
                  <circle r="17" fill={a.color} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="18">
                    {a.emoji}
                  </text>
                </g>
              </g>
            );
          })}

          {/* scale bar */}
          <g transform="translate(36 522)" stroke="#f1f5f2" strokeOpacity="0.7" strokeWidth="2">
            <path d="M0 0 H90 M0 -5 V5 M45 -3 V3 M90 -5 V5" />
          </g>
        </svg>
      </div>

      {/* picker */}
      <div className="mt-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
        <p className="text-sm text-[#cfe4e3]">Try it: pick what you are into.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Activities">
          {ACTIVITIES.map((a) => {
            const on = chosen.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggle(a.value)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2a33] ${
                  on ? 'border-transparent text-white' : 'border-white/25 text-[#e7f2f1] hover:bg-white/10'
                }`}
                style={on ? { backgroundColor: a.color } : undefined}
              >
                <span aria-hidden="true">{a.emoji}</span> {a.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[#9fc3c4]">
            {chosen.length === 0 ? 'Nothing picked: you see everything.' : `${chosen.length} picked: only these show up.`}
          </p>
          <Link
            href={link}
            className="shrink-0 rounded-full bg-[#ff5b2e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff7249] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Open the map
          </Link>
        </div>
      </div>
    </div>
  );
}
