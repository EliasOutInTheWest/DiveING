'use client';

import { useEffect, useState } from 'react';
import { useInView, usePrefersReducedMotion } from '@/components/landing/hooks';

// Number that counts up once it is on screen
export default function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (reduced || value === 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced, value, duration]);

  return (
    <span ref={ref} aria-label={String(value)}>
      {shown.toLocaleString('en-US')}
    </span>
  );
}
