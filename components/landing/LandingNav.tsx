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
        <div className="flex items-center gap-1 text-sm font-medium text-white/90 sm:gap-2">
          <a href="#worlds" className="hidden rounded-full px-3 py-1.5 hover:bg-white/10 sm:inline">
            Activities
          </a>
          <a href="#map" className="hidden rounded-full px-3 py-1.5 hover:bg-white/10 sm:inline">
            Map
          </a>
          <a href="#feed" className="hidden rounded-full px-3 py-1.5 hover:bg-white/10 md:inline">
            Feed
          </a>
          <a href="#schools" className="hidden rounded-full px-3 py-1.5 hover:bg-white/10 md:inline">
            For businesses
          </a>
          <Link href="/feed" className="rounded-full px-3 py-1.5 hover:bg-white/10 sm:hidden">
            Feed
          </Link>
          <Link href="/map" className="lp-btn-nav rounded-full bg-white px-4 py-1.5 font-semibold text-[#0c2b36]">
            Open map
          </Link>
        </div>
      </nav>
    </header>
  );
}
