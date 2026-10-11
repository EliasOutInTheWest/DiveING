// Tiny helpers that draw map-style contour lines (like elevation or depth lines).
// Pure maths, no data needed, so server and browser always draw the same thing.

// One wobbly closed loop around (cx, cy)
export function blob(cx: number, cy: number, r: number, seed: number, points = 96): string {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const k =
      1 +
      0.14 * Math.sin(3 * t + seed) +
      0.09 * Math.sin(5 * t + seed * 1.7) +
      0.05 * Math.sin(8 * t + seed * 2.3);
    const x = cx + Math.cos(t) * r * k * 1.15;
    const y = cy + Math.sin(t) * r * k * 0.9;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

// A set of loops, each a little bigger (and slightly different) than the last
export function rings(cx: number, cy: number, count: number, start: number, step: number, seed: number): string[] {
  return Array.from({ length: count }, (_, i) => blob(cx, cy, start + i * step, seed + i * 0.12));
}
