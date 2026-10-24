'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Fixed top bar: clear at the top, frosted glass after scrolling
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? 'lp-nav-solid' : ''}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
        <Link href="/" className="lp-display flex items-center gap-2 text-xl font-extrabold text-white">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="lp-compass">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
            <g className="lp-needle">
              <path d="M16 5 L19.5 16 L16 14.2 L12.5 16 Z" fill="#fb923c" />
              <path d="M16 27 L12.5 16 L16 17.8 L19.5 16 Z" fill="currentColor" />
            </g>
          </svg>
          DiveING
        </Link>
      </nav>
    </header>
  );
}
