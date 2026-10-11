// Draws the grape and kiwi vine canopy whose shadows fall across the top of every page,
// and the tile of dappled light that follows you down the page.
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

// The low canopy hangs close to the page, so its shadows show the real outlines: a
// grape leaf's five toothed lobes and deep stalk notch, a kiwi leaf's broad heart with
// a short point. Both are traced around the stalk, where the veins meet.
function outline(radius, size, points = 120) {
  let d = '';
  for (let i = 0; i < points; i++) {
    const a = -Math.PI + (i / points) * Math.PI * 2;
    const r = radius(a) * size;
    d += `${i ? 'L' : 'M'}${f(Math.sin(a) * r)},${f(-Math.cos(a) * r)}`;
  }
  return `<path d="${d}Z"/>`;
}

const notch = (a, width) => 1 - Math.exp(-(((Math.PI - Math.abs(a)) / width) ** 2));
const teeth = (a, count, depth) => 1 - depth * Math.abs(((a / (Math.PI * 2)) * count) % 1);

function grapeOutline(rand) {
  const lobes = [
    [0, 0.36],
    [1.05, 0.3],
    [-1.05, 0.3],
    [2.1, 0.2],
    [-2.1, 0.2],
  ].map(([at, reach]) => [at + (rand() - 0.5) * 0.16, reach * (0.85 + rand() * 0.3)]);
  return (a) => {
    // A broad palm with five pointed lobes standing out of it.
    const lobe = Math.max(
      ...lobes.map(([at, reach]) => {
        const d = Math.abs(a - at);
        return reach * Math.exp(-((d / 0.38) ** 2)) + 0.04 * Math.exp(-((d / 0.07) ** 2));
      })
    );
    return (0.33 + lobe) * notch(a, 0.3) * teeth(a, 56, 0.07);
  };
}

// Kiwi leaves are cordate: the stalk meets them in the notch, not the middle.
function kiwiOutline(rand) {
  const fullness = 0.5 + rand() * 0.12;
  return (a) => {
    const heart = 0.6 * ((1 + Math.cos(a)) / 2) ** fullness;
    const tip = 0.07 * Math.exp(-((a / 0.1) ** 2));
    return (heart + tip) * teeth(a, 90, 0.02);
  };
}

// A tendril reaches out from the vine and ends in a tight curl.
function curl(x, y, rand) {
  const dir = rand() < 0.5 ? -1 : 1;
  const reach = 50 + rand() * 60;
  const ex = x + dir * reach * 0.6;
  const ey = y + reach;
  let d = `M${f(x)},${f(y)} Q${f(x + dir * reach * 0.9)},${f(y + reach * 0.3)} ${f(ex)},${f(ey)}`;
  const turns = 1.4 + rand() * 0.8;
  const radius = 7 + rand() * 6;
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const a = dir * t * turns * Math.PI * 2;
    const r = radius * (1 - t * 0.8);
    d += ` L${f(ex - dir * radius + dir * Math.cos(a) * r)},${f(ey + Math.sin(Math.abs(a)) * r)}`;
  }
  return `<path d="${d}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>`;
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
  const { startX, droop, span, leafCount, leafSize, kinds, crisp } = opts;
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
    // Crisp leaves come in three sizes; small grape leaves would read as stars.
    const sizes = kind === 'grape' ? [0.8, 1, 1.2] : [0.6, 0.85, 1.1];
    const size = crisp
      ? leafSize * sizes[Math.floor(rand() * 3)] * (0.92 + rand() * 0.16)
      : leafSize * (0.7 + rand() * 0.6);
    // Leaves hang from the vine, so they point mostly downwards.
    const angle = 180 + (rand() - 0.5) * 110;
    const stalk = size * 0.25;
    const sx = x + Math.sin((angle * Math.PI) / 180) * -stalk;
    const sy = y + Math.cos((angle * Math.PI) / 180) * stalk;
    parts.push(
      `<path d="M${f(x)},${f(y)} L${f(sx)},${f(sy)}" fill="none" stroke="#000" stroke-width="${f(size * 0.03)}"/>`
    );
    if (crisp) {
      // Leaves turned away from the light cast narrower shadows.
      const turn = 0.55 + rand() * 0.45;
      const leaf = outline(kind === 'grape' ? grapeOutline(rand) : kiwiOutline(rand), size * 1.15);
      parts.push(
        `<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)}) scale(${f(turn * 100) / 100},1)">${leaf}</g>`
      );
      if (rand() < 0.2) parts.push(curl(x, y, rand));
    } else {
      const leaf = kind === 'grape' ? grapeLeaf(size) : kiwiLeaf(size);
      parts.push(`<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)})">${leaf}</g>`);
      if (rand() < 0.35) parts.push(tendril(x, y, rand));
    }
  }
  return parts.join('');
}

// Returns the whole layer, and each vine on its own so it can sway on its own.
function drawing({ seed, blur, vines, opacity, crisp = false }) {
  const rand = rng(seed);
  const bodies = vines.map((v) => vine(rand, { ...v, crisp }));
  const svg = (body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice"><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur}"/></filter><g filter="url(#b)" opacity="${opacity}">${body}</g></svg>\n`;
  return { whole: svg(bodies.join('')), each: bodies.map(svg) };
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

// Low tendrils hang close to the page, so their shadows stay crisp.
const low = drawing({
  seed: 2318,
  blur: 1.8,
  opacity: 0.85,
  crisp: true,
  vines: [
    { startX: -80, droop: 360, span: 520, leafCount: 6, leafSize: 92, kinds: ['grape', 'kiwi'] },
    {
      startX: 1180,
      droop: 420,
      span: 520,
      leafCount: 7,
      leafSize: 96,
      kinds: ['kiwi', 'grape', 'kiwi'],
    },
    { startX: 640, droop: 140, span: 380, leafCount: 4, leafSize: 72, kinds: ['grape', 'kiwi'] },
  ],
});

// Dappled light: a few far-off vines wandering across a square that tiles without seams,
// leaves hanging from both sides. Anything near an edge is drawn again on the far side,
// and the blur reaches past the edges.
function dappleTile({ seed, size, vines, blur }) {
  const rand = rng(seed);
  const pieces = [];
  for (let v = 0; v < vines; v++) {
    const p0 = [rand() * size, rand() * size];
    const heading = rand() * Math.PI * 2;
    const length = 520 + rand() * 360;
    const side = [-Math.sin(heading), Math.cos(heading)];
    const sway = (rand() - 0.5) * length * 0.5;
    const p1 = [
      p0[0] + Math.cos(heading) * length * 0.33 + side[0] * sway,
      p0[1] + Math.sin(heading) * length * 0.33 + side[1] * sway,
    ];
    const p2 = [
      p0[0] + Math.cos(heading) * length * 0.66 - side[0] * sway,
      p0[1] + Math.sin(heading) * length * 0.66 - side[1] * sway,
    ];
    const p3 = [p0[0] + Math.cos(heading) * length, p0[1] + Math.sin(heading) * length];
    const at = (t) => {
      const u = 1 - t;
      return [0, 1].map(
        (k) => u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]
      );
    };
    const box = (points, pad) => ({
      x: points.reduce((sum, p) => sum + p[0], 0) / points.length,
      y: points.reduce((sum, p) => sum + p[1], 0) / points.length,
      r: length / 2 + pad,
    });
    const stem = (dx, dy) => {
      const pt = (p) => `${f(p[0] + dx)},${f(p[1] + dy)}`;
      return `<path d="M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>`;
    };
    pieces.push({ ...box([p0, p3], 20), svg: stem });
    const leaves = 8 + Math.floor(rand() * 4);
    for (let i = 0; i < leaves; i++) {
      const t = (i + 0.5 + (rand() - 0.5) * 0.5) / leaves;
      const [x, y] = at(t);
      const [ax, ay] = at(Math.min(1, t + 0.01));
      const along = Math.atan2(ay - y, ax - x);
      // Leaves alternate sides and point away from the stem.
      const out = along + (i % 2 ? 1 : -1) * (Math.PI / 2 - 0.5 + rand() * 0.6);
      const leafSize = 70 + rand() * 60;
      const lx = x + Math.cos(out) * leafSize * 0.3;
      const ly = y + Math.sin(out) * leafSize * 0.3;
      const angle = (out * 180) / Math.PI + 90;
      const leaf = rand() < 0.6 ? grapeLeaf(leafSize) : kiwiLeaf(leafSize);
      pieces.push({
        x: lx,
        y: ly,
        r: leafSize * 1.2,
        svg: (dx, dy) =>
          `<g transform="translate(${f(lx + dx)},${f(ly + dy)}) rotate(${f(angle)})">${leaf}</g>`,
      });
    }
  }
  const parts = [];
  for (const piece of pieces) {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const x = piece.x + dx;
        const y = piece.y + dy;
        if (x < -piece.r || x > size + piece.r || y < -piece.r || y > size + piece.r) continue;
        parts.push(piece.svg(dx, dy));
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><filter id="b" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${blur}"/></filter><g filter="url(#b)">${parts.join('')}</g></svg>\n`;
}

const dapple = dappleTile({ seed: 913, size: 1200, vines: 8, blur: 13 });

mkdirSync('public/grotto', { recursive: true });
writeFileSync('public/grotto/canopy-high.svg', high.whole);
writeFileSync('public/grotto/canopy-low.svg', low.whole);
// The near vines hang apart from each other, so on wide screens each sways on its own.
low.each.forEach((svg, index) => writeFileSync(`public/grotto/canopy-low-${index + 1}.svg`, svg));
writeFileSync('public/grotto/dapple.svg', dapple);
console.log(
  `canopy-high.svg ${high.whole.length} B, canopy-low.svg ${low.whole.length} B, dapple.svg ${dapple.length} B`
);
