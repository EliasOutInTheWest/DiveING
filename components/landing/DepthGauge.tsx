'use client';

import { useEffect, useRef } from 'react';

// A pill on the right edge: metres above the waterline (the mountains) and below it (the reef).
// It reads where the waterline of the start page is and updates while you scroll.
export default function DepthGauge() {
  const pill = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = document.querySelector('[data-waterline]');
      if (!line || !pill.current || !value.current || !arrow.current || !fill.current) return;
      const mid = window.innerHeight / 2;
      const d = mid - line.getBoundingClientRect().top; // positive = below the waterline
      let text: string;
      if (d >= 0) {
        const m = Math.min(38, Math.round(d * 0.13));
        text = m === 0 ? '0 m' : `${m} m`;
        arrow.current.textContent = m === 0 ? '≈' : '▼';
        fill.current.style.transform = `scaleY(${(0.5 + Math.min(1, m / 38) * 0.5).toFixed(3)})`;
      } else {
        const m = Math.min(1240, Math.round(-d * 2.75));
        text = `${m.toLocaleString('en-US')} m`;
        arrow.current.textContent = '▲';
        fill.current.style.transform = `scaleY(${(0.5 - Math.min(1, m / 1240) * 0.5).toFixed(3)})`;
      }
      value.current.textContent = text;
      // only while the landscape is on screen
      pill.current.dataset.on = d > -window.innerHeight * 1.1 && d < 520 ? 'true' : 'false';
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
    };
  }, []);

  return (
    <div ref={pill} className="lp-gauge" data-on="false" aria-hidden="true">
      <span ref={arrow} className="lp-gauge-arrow">
        ▲
      </span>
      <span className="lp-gauge-bar">
        <span ref={fill} className="lp-gauge-fill" />
      </span>
      <span ref={value} className="lp-gauge-value">
        0 m
      </span>
    </div>
  );
}
