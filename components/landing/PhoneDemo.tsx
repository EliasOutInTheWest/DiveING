'use client';

import { useEffect, useState } from 'react';
import { ACTIVITIES } from '@/lib/activities';
import { usePrefersReducedMotion } from '@/components/landing/hooks';

// Example posts for the phone preview. Nothing here comes from the database.
const POSTS = [
  { act: 'diving', user: 'mika', text: 'Calm morning, 12 m, the kelp was glowing.', spot: 'Easy Reef', likes: 128 },
  { act: 'hiking', user: 'jonas', text: 'Clouds below us at the summit.', spot: 'Summit Trail', likes: 342 },
  { act: 'camping', user: 'ava', text: 'Fire, stars, nobody else here.', spot: 'Pine Camp', likes: 87 },
  { act: 'biking', user: 'leo', text: 'The last descent, 6 minutes of flow.', spot: 'Ridge Loop', likes: 215 },
];
const SLIDE_MS = 3600;

export default function PhoneDemo() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setIndex((v) => (v + 1) % POSTS.length), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [index, reduced]);

  return (
    <div className="lp-phone" role="img" aria-label="Example of the feed: full-screen photos and videos you swipe through">
      <div className="lp-phone-screen">
        <div className="lp-phone-dots" aria-hidden="true">
          {POSTS.map((_, i) => (
            <button key={i} type="button" tabIndex={-1} onClick={() => setIndex(i)} className={i === index ? 'on' : ''} />
          ))}
        </div>
        <div className="lp-track" style={{ transform: `translateY(-${index * 100}%)` }}>
          {POSTS.map((p, i) => {
            const a = ACTIVITIES.find((x) => x.value === p.act) ?? ACTIVITIES[0];
            return (
              <div key={p.user} className={`lp-slide lp-sky-${p.act}`} data-on={i === index}>
                <span className="lp-slide-emoji" aria-hidden="true">
                  {a.emoji}
                </span>
                <div className="lp-slide-rail" aria-hidden="true">
                  <span className="lp-heart">
                    ♥<i>{p.likes}</i>
                  </span>
                  <span className="lp-pinbtn">📍</span>
                </div>
                <span className="lp-burst" aria-hidden="true">
                  ♥
                </span>
                <div className="lp-slide-text">
                  <b>@{p.user}</b>
                  <p>{p.text}</p>
                  <span>
                    {a.emoji} {p.spot}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <span className="lp-phone-notch" aria-hidden="true" />
    </div>
  );
}
