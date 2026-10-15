// Decorative contour lines (like a topographic map). Pure SVG, drawn on the server.

function smoothClosed(pts: [number, number][]): string {
  // Catmull-Rom spline through the points, as a closed cubic Bezier path
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
}

function ring(cx: number, cy: number, r: number, seed: number): string {
  const count = 28;
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wobble =
      1 + 0.16 * Math.sin(3 * a + seed) + 0.09 * Math.sin(5 * a + seed * 1.7) + 0.05 * Math.sin(7 * a + seed * 0.6);
    pts.push([cx + r * wobble * Math.cos(a), cy + r * wobble * 0.8 * Math.sin(a)]);
  }
  return smoothClosed(pts);
}

type Props = { className?: string; seed?: number; rings?: number };

export default function Contours({ className, seed = 1, rings = 15 }: Props) {
  const paths = Array.from({ length: rings }, (_, i) => ring(400, 300, 30 + i * 22, seed + i * 0.11));
  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} strokeOpacity={i % 5 === 0 ? 0.9 : 0.45} />
      ))}
    </svg>
  );
}
