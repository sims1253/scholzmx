// Draws the vine canopy whose shadows fall across the top of every page.
// The output SVGs are masks: only their alpha matters, CSS supplies the colour.
//
//   node scripts/draw-canopy.mjs
//
// The drawing is seeded, so rerunning it reproduces the committed files.
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1600;
const H = 900;

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

// One pointed lobe from the leaf base, pointing up before rotation.
function lobe(length, width) {
  return `M0,0 C${f(width)},${f(-length * 0.3)} ${f(width * 0.55)},${f(-length * 0.85)} 0,${f(-length)} C${f(-width * 0.55)},${f(-length * 0.85)} ${f(-width)},${f(-length * 0.3)} 0,0Z`;
}

// Grape leaf: five overlapping lobes read as a palmate silhouette once blurred.
function grapeLeaf(size) {
  const lobes = [
    [0, 1, 0.42],
    [-42, 0.86, 0.36],
    [42, 0.86, 0.36],
    [-88, 0.58, 0.3],
    [88, 0.58, 0.3],
  ];
  return lobes
    .map(([angle, l, w]) => `<path transform="rotate(${angle})" d="${lobe(size * l, size * w)}"/>`)
    .join('');
}

// Kiwi leaf: broad and heart-shaped with a notch at the stalk.
function kiwiLeaf(size) {
  const r = size * 0.5;
  return `<path d="M0,0 C${f(r * 0.9)},${f(r * 0.25)} ${f(r * 1.25)},${f(-r * 0.9)} ${f(r * 0.45)},${f(-r * 1.55)} C${f(r * 0.2)},${f(-r * 1.75)} 0,${f(-r * 1.6)} 0,${f(-r * 1.5)} C0,${f(-r * 1.6)} ${f(-r * 0.2)},${f(-r * 1.75)} ${f(-r * 0.45)},${f(-r * 1.55)} C${f(-r * 1.25)},${f(-r * 0.9)} ${f(-r * 0.9)},${f(r * 0.25)} 0,0Z"/>`;
}

// Tansy frond: a midrib with paired leaflets, each cut into narrow teeth.
function tansyFrond(size, rand) {
  const parts = [
    `<path d="M0,0 L0,${f(-size)}" fill="none" stroke="#000" stroke-width="${f(size * 0.022)}"/>`,
  ];
  const pairs = 7;
  for (let i = 1; i <= pairs; i++) {
    const y = -size * (0.08 + (0.84 * i) / pairs);
    const l = size * (0.36 * Math.sin((Math.PI * (i + 0.6)) / (pairs + 1.4)) + 0.05);
    const tilt = 38 + rand() * 12;
    for (const side of [1, -1]) {
      const teeth = [];
      for (let k = 1; k <= 3; k++) {
        teeth.push(
          `<path transform="translate(0,${f(-l * (k / 4))}) rotate(${45 * side})" d="${lobe(l * 0.32, l * 0.06)}"/>`
        );
      }
      parts.push(
        `<g transform="translate(0,${f(y)}) rotate(${f(tilt * side)})"><path d="${lobe(l, l * 0.09)}"/>${teeth.join('')}</g>`
      );
    }
  }
  parts.push(`<path transform="translate(0,${f(-size)})" d="${lobe(size * 0.14, size * 0.025)}"/>`);
  return parts.join('');
}

function tendril(x, y, rand) {
  const turns = 2 + rand() * 1.5;
  const radius = 10 + rand() * 12;
  const dir = rand() < 0.5 ? -1 : 1;
  const steps = 40;
  let d = `M${f(x)},${f(y)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = dir * t * turns * Math.PI * 2;
    const r = radius * (1 - t * 0.85);
    const reach = t * radius * 2.6;
    d += ` L${f(x + Math.sin(a) * r + dir * reach * 0.4)},${f(y + reach - Math.cos(a) * r + r)}`;
  }
  return `<path d="${d}" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>`;
}

// A vine enters from the top edge and wanders across the canopy.
function vine(rand, opts) {
  const { startX, droop, span, leafCount, leafSize, kinds } = opts;
  const p0 = [startX, -40];
  const p1 = [startX + span * 0.25, droop * 0.9];
  const p2 = [startX + span * 0.7, droop * 1.25];
  const p3 = [startX + span, droop * 0.35 - 40];
  const at = (t) => {
    const u = 1 - t;
    return [
      u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
    ];
  };
  const pt = (p) => p.map(f).join(',');
  const parts = [
    `<path d="M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}" fill="none" stroke="#000" stroke-width="${f(leafSize * 0.06)}" stroke-linecap="round"/>`,
  ];
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 0.5 + (rand() - 0.5) * 0.6) / leafCount;
    const [x, y] = at(t);
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const size = leafSize * (0.7 + rand() * 0.6);
    // Leaves hang from the vine, so they point mostly downwards.
    const angle = 180 + (rand() - 0.5) * 110;
    const stalk = size * 0.25;
    const sx = x + Math.sin((angle * Math.PI) / 180) * -stalk;
    const sy = y + Math.cos((angle * Math.PI) / 180) * stalk;
    parts.push(
      `<path d="M${f(x)},${f(y)} L${f(sx)},${f(sy)}" fill="none" stroke="#000" stroke-width="${f(size * 0.03)}"/>`
    );
    const leaf =
      kind === 'grape'
        ? grapeLeaf(size)
        : kind === 'kiwi'
          ? kiwiLeaf(size)
          : tansyFrond(size * 1.3, rand);
    parts.push(`<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)})">${leaf}</g>`);
    if (rand() < 0.35) parts.push(tendril(x, y, rand));
  }
  return parts.join('');
}

function drawing({ seed, blur, vines, opacity }) {
  const rand = rng(seed);
  const body = vines.map((v) => vine(rand, v)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice"><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur}"/></filter><g filter="url(#b)" opacity="${opacity}">${body}</g></svg>\n`;
}

// The high canopy sits far from the page, so its shadows are broad and soft.
// Many smaller leaves leave gaps between them, which is what makes light dapple.
const high = drawing({
  seed: 1592,
  blur: 6,
  opacity: 0.6,
  vines: [
    {
      startX: -260,
      droop: 210,
      span: 760,
      leafCount: 13,
      leafSize: 96,
      kinds: ['grape', 'grape', 'kiwi'],
    },
    { startX: 330, droop: 270, span: 700, leafCount: 12, leafSize: 90, kinds: ['kiwi', 'grape'] },
    {
      startX: 880,
      droop: 240,
      span: 760,
      leafCount: 13,
      leafSize: 100,
      kinds: ['grape', 'kiwi', 'grape'],
    },
    { startX: 60, droop: 120, span: 1500, leafCount: 16, leafSize: 84, kinds: ['grape', 'kiwi'] },
    { startX: -120, droop: 40, span: 1800, leafCount: 14, leafSize: 76, kinds: ['grape'] },
  ],
});

// Low tendrils and tansy hang close to the page, so their shadows stay crisp.
const low = drawing({
  seed: 2318,
  blur: 1.8,
  opacity: 0.85,
  vines: [
    { startX: -80, droop: 360, span: 520, leafCount: 6, leafSize: 92, kinds: ['grape', 'tansy'] },
    {
      startX: 1180,
      droop: 420,
      span: 520,
      leafCount: 7,
      leafSize: 96,
      kinds: ['tansy', 'grape', 'kiwi'],
    },
    { startX: 640, droop: 140, span: 380, leafCount: 4, leafSize: 72, kinds: ['grape', 'tansy'] },
  ],
});

mkdirSync('public/grotto', { recursive: true });
writeFileSync('public/grotto/canopy-high.svg', high);
writeFileSync('public/grotto/canopy-low.svg', low);
console.log(`canopy-high.svg ${high.length} B, canopy-low.svg ${low.length} B`);
