'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ACTIVITIES } from '@/lib/activities';

// what you find in each world
const INSIDE: Record<string, string> = {
  diving: 'Dive spots, wrecks, dive schools and the boat routes that lead to them.',
  hiking: 'Viewpoints, peaks, waterfalls and trailheads, plus outdoor shops and guides.',
  camping: 'Campsites, caravan sites and mountain huts.',
  biking: 'Bike parks, mountain bike spots, bike shops and rentals.',
  climbing: 'Crags and climbing gyms.',
  paddling: 'Kayak and canoe spots, and boat rentals.',
};

// Six panels. The open one grows and shows what is inside.
export default function Worlds() {
  const [open, setOpen] = useState(0);

  return (
    <div className="lp-worlds">
      {ACTIVITIES.map((a, i) => {
        const isOpen = i === open;
        return (
          <article
            key={a.value}
            className={`lp-world lp-sky-${a.value}`}
            data-open={isOpen}
            tabIndex={0}
            aria-label={a.label}
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            onClick={() => setOpen(i)}
          >
            <span className="lp-world-emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <span className="lp-world-name lp-display" aria-hidden={isOpen}>
              {a.label}
            </span>
            <div className="lp-world-body" aria-hidden={!isOpen}>
              <h3 className="lp-display">{a.label}</h3>
              <p>{INSIDE[a.value]}</p>
              <Link href={`/map?activity=${a.value}`} tabIndex={isOpen ? 0 : -1} className="lp-btn lp-btn-light">
                Show {a.label.toLowerCase()} on the map
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
