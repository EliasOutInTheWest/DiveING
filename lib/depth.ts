// Colours of the depth map: shallow -> deep (depth in metres)
export const DEPTH_STOPS: { depth: number; color: string }[] = [
  { depth: 5, color: '#a6cee3' },
  { depth: 20, color: '#67a9cf' },
  { depth: 50, color: '#4393c3' },
  { depth: 200, color: '#2166ac' },
  { depth: 1000, color: '#08306b' },
  { depth: 2000, color: '#081d58' },
];

// For the legend in the page
export const DEPTH_LEGEND_GRADIENT = `linear-gradient(to right, ${DEPTH_STOPS.map((s) => s.color).join(', ')})`;

// Map expression: transparent on land and at sea level, fading into the
// depth colours below it. Stops must go from the deepest (most negative) upwards.
export function depthColorExpression() {
  const stops: (number | string)[] = [];
  for (let i = DEPTH_STOPS.length - 1; i >= 0; i--) {
    stops.push(-DEPTH_STOPS[i].depth, DEPTH_STOPS[i].color);
  }
  stops.push(0, 'rgba(166, 206, 227, 0)');
  return ['interpolate', ['linear'], ['elevation'], ...stops];
}
