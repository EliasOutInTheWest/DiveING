'use client';

import { useEffect } from 'react';
import { usePrefersReducedMotion } from '@/components/landing/hooks';

// Writes the scroll position into two CSS variables on <html>:
//   --sy  pixels scrolled (the landscape layers use it for parallax)
//   --sp  0 to 1 for the progress bar at the top
export default function ScrollFx() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    if (reduced) {
      root.style.setProperty('--sy', '0');
      root.style.setProperty('--sp', '0');
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty('--sy', String(Math.round(window.scrollY)));
      root.style.setProperty('--sp', (window.scrollY / max).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty('--sy');
      root.style.removeProperty('--sp');
    };
  }, [reduced]);

  return null;
}
