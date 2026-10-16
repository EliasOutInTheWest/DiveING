import type maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------
// Little fish (and a few bubbles) swimming in the water of the map.
// They live on a canvas on top of the map, are drawn only where the
// map really shows water, and turn around before they reach land.
// Nothing here is clickable. Not started when the visitor has
// "reduce motion" switched on.
// ---------------------------------------------------------------

type Fish = {
  lng: number;
  lat: number;
  heading: number; // radians, 0 = right
  speed: number; // pixels per second
  size: number; // body length in pixels
  body: string;
  fin: string;
  phase: number;
  wiggle: number;
  lost: number; // frames spent outside water
  fade: number; // 0..1
};

type Bubble = { x: number; y: number; r: number; v: number; life: number };

const COLOURS: [string, string][] = [
  ['#ff9f43', '#ffffff'], // clownfish
  ['#3b82f6', '#fde047'], // blue tang
  ['#fb7185', '#fecdd3'],
  ['#2dd4bf', '#ccfbf1'],
  ['#fbbf24', '#fff7ed'],
  ['#a78bfa', '#ede9fe'],
];

const MAX_FISH = 16;
const MIN_ZOOM = 4.5;

function drawFish(ctx: CanvasRenderingContext2D, f: Fish, x: number, y: number, t: number) {
  const s = f.size;
  const wag = Math.sin(t * 7 + f.phase) * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(f.heading);
  if (Math.cos(f.heading) < 0) ctx.scale(1, -1); // keep the fish upright when swimming left
  ctx.globalAlpha = 0.9 * f.fade;

  // soft shadow on the water
  ctx.fillStyle = 'rgba(10, 60, 90, 0.18)';
  ctx.beginPath();
  ctx.ellipse(1, s * 0.35, s * 0.5, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // tail
  ctx.fillStyle = f.fin;
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, 0);
  ctx.lineTo(-s * 0.78, -s * 0.28 + wag * s * 0.35);
  ctx.lineTo(-s * 0.78, s * 0.28 + wag * s * 0.35);
  ctx.closePath();
  ctx.fill();

  // body
  ctx.fillStyle = f.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // stripe + fin + eye
  ctx.fillStyle = f.fin;
  ctx.globalAlpha = 0.75 * f.fade;
  ctx.fillRect(-s * 0.05, -s * 0.24, s * 0.1, s * 0.48);
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.2);
  ctx.lineTo(s * 0.1, -s * 0.42);
  ctx.lineTo(s * 0.2, -s * 0.2);
  ctx.fill();
  ctx.globalAlpha = f.fade;
  ctx.fillStyle = '#0b1f33';
  ctx.beginPath();
  ctx.arc(s * 0.3, -s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function startFish(map: maplibregl.Map, waterLayerIds: string[]): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};
  const layers = waterLayerIds.filter((id) => map.getLayer(id));
  if (layers.length === 0) return () => {};

  const holder = map.getCanvasContainer();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  holder.insertBefore(canvas, map.getCanvas().nextSibling);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    const r = map.getContainer().getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  resize();
  map.on('resize', resize);

  const fish: Fish[] = [];
  const bubbles: Bubble[] = [];

  const isWater = (x: number, y: number) => {
    try {
      return map.queryRenderedFeatures([x, y], { layers }).length > 0;
    } catch {
      return false;
    }
  };

  function spawn(): Fish | null {
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      if (!isWater(x, y)) continue;
      const ll = map.unproject([x, y]);
      const [body, fin] = COLOURS[Math.floor(Math.random() * COLOURS.length)];
      return {
        lng: ll.lng,
        lat: ll.lat,
        heading: Math.random() * Math.PI * 2,
        speed: 14 + Math.random() * 22,
        size: 16 + Math.random() * 16,
        body,
        fin,
        phase: Math.random() * 6.28,
        wiggle: 0.4 + Math.random() * 0.8,
        lost: 0,
        fade: 0,
      };
    }
    return null;
  }

  let raf = 0;
  let last = performance.now();
  let frame = 0;
  let spawnTimer = 0;

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frame++;
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // too far out: the fish would be dots, so draw nothing
    if (map.getZoom() < MIN_ZOOM) {
      fish.length = 0;
      return;
    }

    spawnTimer -= dt;
    if (fish.length < MAX_FISH && spawnTimer <= 0 && !map.isMoving()) {
      const f = spawn();
      if (f) fish.push(f);
      spawnTimer = 0.25;
    }

    const t = now / 1000;
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i];
      const p = map.project([f.lng, f.lat]);
      // gentle wandering
      f.heading += Math.sin(t * f.wiggle + f.phase) * dt * 0.9;
      const nx = p.x + Math.cos(f.heading) * f.speed * dt;
      const ny = p.y + Math.sin(f.heading) * f.speed * dt;

      // look a bit ahead; turn away if that is land (checked every few frames)
      if ((frame + i) % 6 === 0) {
        const ax = p.x + Math.cos(f.heading) * (f.size + 10);
        const ay = p.y + Math.sin(f.heading) * (f.size + 10);
        if (isWater(ax, ay)) {
          f.lost = 0;
        } else {
          f.heading += Math.PI * (0.6 + Math.random() * 0.8);
          if (!isWater(p.x, p.y)) f.lost++;
        }
      }

      const ll = map.unproject([nx, ny]);
      f.lng = ll.lng;
      f.lat = ll.lat;
      f.fade = Math.min(1, f.fade + dt * 1.5);

      const off = nx < -80 || ny < -80 || nx > w + 80 || ny > h + 80;
      if (f.lost > 4 || off) {
        fish.splice(i, 1);
        continue;
      }
      if (Math.random() < dt * 0.25 && bubbles.length < 24) {
        bubbles.push({ x: nx, y: ny - 4, r: 1.5 + Math.random() * 2, v: 14 + Math.random() * 10, life: 1 });
      }
      drawFish(ctx, f, nx, ny, t);
    }

    // bubbles drift up and pop
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.v * dt;
      b.x += Math.sin(t * 3 + i) * 0.2;
      b.life -= dt * 0.7;
      if (b.life <= 0) {
        bubbles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = b.life;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    map.off('resize', resize);
    canvas.remove();
  };
}
