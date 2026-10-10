// Draws the coffee rings that some note cards carry. Like the canopy, the SVGs are masks:
// only their alpha matters, CSS supplies the colour.
//
//   node scripts/draw-coffee-rings.mjs
//
// The drawing is seeded, so rerunning it reproduces the committed files.
import { writeFileSync, mkdirSync } from 'node:fs';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;
const C = 100;
const STEPS = 180;

// A slow wobble around the circle: a few sines with random phases.
function wobble(rand, amount) {
  const waves = [2, 3, 5, 7].map((k) => [k, rand() * Math.PI * 2, amount / k]);
  return (a) => waves.reduce((sum, [k, phase, size]) => sum + Math.sin(a * k + phase) * size, 0);
}

function loop(radius, from = 0, to = Math.PI * 2) {
  let d = '';
  for (let i = 0; i <= STEPS; i++) {
    const a = from + ((to - from) * i) / STEPS;
    const r = radius(a);
    d += `${i ? 'L' : 'M'}${f(C + Math.cos(a) * r)},${f(C + Math.sin(a) * r)}`;
  }
  return d;
}

// The rim is where the coffee dried: a dark edge, thicker where the cup tilted and
// coffee pooled, nearly gone where it barely touched.
function ring(rand, { radius, offset = [0, 0], arc = 1, strength = 1 }) {
  const edge = wobble(rand, 0.9);
  const pool = rand() * Math.PI * 2;
  const gap = pool + Math.PI * (0.8 + rand() * 0.4);
  const near = (a, at, width) =>
    Math.exp(-((Math.atan2(Math.sin(a - at), Math.cos(a - at)) / width) ** 2));
  const outer = (a) => radius + edge(a);
  const width = (a) => (1.6 + 4.5 * near(a, pool, 0.7)) * (1 - 0.85 * near(a, gap, 0.25));
  const inner = (a) => outer(a) - width(a);
  const start = rand() * Math.PI * 2;
  const end = start + Math.PI * 2 * arc;
  const [dx, dy] = offset;
  const band = `${loop(outer, start, end)} ${loop(inner, end, start).replace('M', 'L')}Z`;
  const shade = `${loop(inner, start, end)} ${loop((a) => inner(a) - 9, end, start).replace('M', 'L')}Z`;
  return `<g transform="translate(${dx},${dy})"><path d="${shade}" opacity="${f(0.22 * strength * 100) / 100}" filter="url(#soft)"/><path d="${band}" opacity="${f(0.9 * strength * 100) / 100}" filter="url(#edge)"/>${arc === 1 ? `<circle cx="${C}" cy="${C}" r="${f(radius - 8)}" opacity="0.07" filter="url(#soft)"/>` : ''}</g>`;
}

function drawing(seed, extra) {
  const rand = rng(seed);
  const body = [ring(rand, { radius: 78 }), ...extra(rand)].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C * 2} ${C * 2}"><filter id="edge"><feGaussianBlur stdDeviation="0.6"/></filter><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>${body}</svg>\n`;
}

const rings = [
  // One clean set-down.
  drawing(311, () => []),
  // Lifted and set down again, a little to the side.
  drawing(907, (rand) => [ring(rand, { radius: 78, offset: [11, -7], arc: 0.45, strength: 0.6 })]),
  // A drip that ran down the side of the cup.
  drawing(1489, (rand) => {
    const a = rand() * Math.PI * 2;
    return [
      `<ellipse cx="${f(C + Math.cos(a) * 86)}" cy="${f(C + Math.sin(a) * 86)}" rx="3.4" ry="2.4" opacity="0.55" filter="url(#edge)"/>`,
    ];
  }),
];

mkdirSync('public/grotto', { recursive: true });
rings.forEach((svg, i) => writeFileSync(`public/grotto/coffee-ring-${i + 1}.svg`, svg));
console.log(rings.map((svg, i) => `coffee-ring-${i + 1}.svg ${svg.length} B`).join(', '));
