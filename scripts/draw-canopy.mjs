// Draws the grape and kiwi vine canopy whose shadows fall across the top of every page.
//
//   node scripts/draw-canopy.mjs
//
// A branch in a breeze does not move as one sheet, so the canopy is drawn in pieces that
// src/components/Canopy.astro hangs and moves one by one: boughs far from the page, boughs
// halfway, twigs close to it, and single leaves that flutter on those twigs. The pieces
// are packed into one SVG, public/grotto/canopy.svg, which is a mask: only its alpha
// matters, CSS supplies the colour. Where each piece hangs, where it is hinged and where
// it sits in the packed file goes to src/data/canopy.json.
//
// The drawing is seeded, so rerunning it reproduces the committed files.
import { writeFileSync, mkdirSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';

// The stage the pieces hang on. It is much wider than a screen, so that wide screens
// still have leaves at their edges; x = 800 is the middle of the page.
const STAGE = { x: -400, y: 0, w: 2400, h: 900 };

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

// Coordinates are written as coarsely as the layer's blur hides: whole units far from
// the page, tenths close to it.
let grain = 10;
const f = (n) => Math.round(n * grain) / grain;

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
function outline(radius, size, points) {
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

// The box a piece needs, grown point by point as the piece is drawn.
function box() {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  b.add = (x, y, r = 0) => {
    b.x0 = Math.min(b.x0, x - r);
    b.y0 = Math.min(b.y0, y - r);
    b.x1 = Math.max(b.x1, x + r);
    b.y1 = Math.max(b.y1, y + r);
  };
  return b;
}

// A vine enters from the top edge and wanders across the canopy. Returns what stays on
// the vine and, apart from it, the leaves that are to flutter on their own.
function vine(rand, opts, depth) {
  const { startX, droop, span, leafCount, leafSize, kinds, loose = 0 } = opts;
  const { crisp, points } = depth;
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
  const bounds = box();
  for (let i = 0; i <= 20; i++) bounds.add(...at(i / 20), leafSize * 0.05);
  const parts = [
    `<path d="M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}" fill="none" stroke="#000" stroke-width="${f(leafSize * 0.06)}" stroke-linecap="round"/>`,
  ];
  const leaves = [];
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
    const radians = (angle * Math.PI) / 180;
    // Far leaves stand off the vine on longer shoots, so that the bough is a loose spray
    // with light between the leaves and not a solid band.
    const stalk = size * (crisp ? 0.25 : 0.25 + rand() * 1.1);
    const sx = x + Math.sin(radians) * -stalk;
    const sy = y + Math.cos(radians) * stalk;
    const drawn = [
      `<path d="M${f(x)},${f(y)} L${f(sx)},${f(sy)}" fill="none" stroke="#000" stroke-width="${f(size * 0.03)}"/>`,
    ];
    if (crisp) {
      // Leaves turned away from the light cast narrower shadows.
      const turn = 0.55 + rand() * 0.45;
      const leaf = outline(
        kind === 'grape' ? grapeOutline(rand) : kiwiOutline(rand),
        size * 1.15,
        points
      );
      drawn.push(
        `<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)}) scale(${f(turn * 100) / 100},1)">${leaf}</g>`
      );
    } else {
      const leaf = kind === 'grape' ? grapeLeaf(size) : kiwiLeaf(size);
      drawn.push(`<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)})">${leaf}</g>`);
    }
    // The leaf's blade lies ahead of the stalk's end, within about one leaf size.
    const reach = size * (crisp ? 0.36 : 0.45);
    const centre = [sx + Math.sin(radians) * reach, sy - Math.cos(radians) * reach];
    const radius = size * (crisp ? 0.86 : 0.78);
    // Every other leaf flutters on its own, until the vine has given up `loose` of them:
    // each one costs the browser a layer, and a twig stripped bare would be a line.
    if (i % 2 === 1 && leaves.length < loose) {
      const own = box();
      own.add(x, y, 2);
      own.add(...centre, radius);
      leaves.push({ body: drawn.join(''), bounds: own, hinge: [x, y] });
      continue;
    }
    bounds.add(...centre, radius);
    parts.push(...drawn);
    if (crisp && rand() < 0.2) {
      parts.push(curl(x, y, rand));
      bounds.add(x, y + 60, 75);
    } else if (!crisp && rand() < 0.35) {
      parts.push(tendril(x, y, rand));
      bounds.add(x, y + 40, 60);
    }
  }
  return { body: parts.join(''), bounds, leaves, hinge: p0 };
}

// How far a layer hangs from the page decides how its shadow falls: far from it, the
// shadow is large, soft and pale, as when a spotlight is thrown out of focus; close to
// it, the leaf's real outline shows, dark and crisp. The blur is drawn into the mask, so
// the browser never has to filter a moving layer.
const depths = [
  {
    name: 'far',
    seed: 1592,
    blur: 9,
    opacity: 0.5,
    crisp: false,
    // Slow and heavy.
    period: [15, 21],
    boughs: [
      [
        {
          startX: -820,
          droop: 250,
          span: 640,
          leafCount: 10,
          leafSize: 104,
          kinds: ['grape', 'kiwi'],
        },
      ],
      [
        {
          startX: -260,
          droop: 220,
          span: 760,
          leafCount: 12,
          leafSize: 108,
          kinds: ['grape', 'grape', 'kiwi'],
        },
      ],
      [
        {
          startX: 330,
          droop: 280,
          span: 700,
          leafCount: 11,
          leafSize: 102,
          kinds: ['kiwi', 'grape'],
        },
      ],
      [
        {
          startX: 880,
          droop: 250,
          span: 760,
          leafCount: 12,
          leafSize: 112,
          kinds: ['grape', 'kiwi', 'grape'],
        },
      ],
      [
        {
          startX: 1560,
          droop: 230,
          span: 700,
          leafCount: 10,
          leafSize: 104,
          kinds: ['kiwi', 'grape'],
        },
      ],
      // The garland along the beam.
      [
        {
          startX: 60,
          droop: 120,
          span: 1500,
          leafCount: 15,
          leafSize: 92,
          kinds: ['grape', 'kiwi'],
        },
        { startX: -120, droop: 40, span: 1800, leafCount: 14, leafSize: 84, kinds: ['grape'] },
      ],
    ],
  },
  {
    name: 'mid',
    seed: 733,
    blur: 4,
    opacity: 0.66,
    crisp: true,
    points: 48,
    period: [9, 13],
    boughs: [
      [
        {
          startX: -560,
          droop: 300,
          span: 460,
          leafCount: 5,
          leafSize: 96,
          kinds: ['kiwi', 'grape'],
        },
      ],
      [
        {
          startX: 130,
          droop: 250,
          span: 470,
          leafCount: 5,
          leafSize: 92,
          kinds: ['grape', 'kiwi'],
        },
      ],
      [
        {
          startX: 800,
          droop: 300,
          span: 430,
          leafCount: 5,
          leafSize: 96,
          kinds: ['kiwi', 'grape', 'grape'],
        },
      ],
      [
        {
          startX: 1700,
          droop: 280,
          span: 440,
          leafCount: 5,
          leafSize: 96,
          kinds: ['grape', 'kiwi'],
        },
      ],
    ],
  },
  {
    name: 'near',
    seed: 2318,
    blur: 1.6,
    opacity: 0.88,
    crisp: true,
    points: 80,
    // Light twigs answer the wind quickly.
    period: [5.5, 8],
    boughs: [
      [
        {
          startX: -80,
          droop: 360,
          span: 520,
          leafCount: 6,
          leafSize: 92,
          kinds: ['grape', 'kiwi'],
          loose: 2,
        },
      ],
      [
        {
          startX: 1180,
          droop: 420,
          span: 520,
          leafCount: 7,
          leafSize: 96,
          kinds: ['kiwi', 'grape', 'kiwi'],
          loose: 2,
        },
      ],
      [
        {
          startX: 640,
          droop: 140,
          span: 380,
          leafCount: 4,
          leafSize: 72,
          kinds: ['grape', 'kiwi'],
          loose: 2,
        },
      ],
      [
        {
          startX: 1900,
          droop: 330,
          span: -420,
          leafCount: 5,
          leafSize: 92,
          kinds: ['grape', 'kiwi'],
          loose: 1,
        },
      ],
      [
        {
          startX: -330,
          droop: 300,
          span: -330,
          leafCount: 4,
          leafSize: 92,
          kinds: ['kiwi', 'grape'],
          loose: 1,
        },
      ],
    ],
  },
];

// Draw every piece, then pack them side by side on shelves. Each cell is a piece's box
// plus room for its blur, and a gap so that no neighbour bleeds into a mask.
const GAP = 6;
const SHEET_WIDTH = 3000;
const cells = [];
const layout = depths.map((depth) => {
  const rand = rng(depth.seed);
  grain = depth.crisp ? 10 : 1;
  const pad = depth.blur * 3 + 4;
  const cell = (body, bounds) => {
    const x = Math.floor(bounds.x0 - pad);
    const y = Math.floor(bounds.y0 - pad);
    const made = {
      depth,
      body,
      x,
      y,
      w: Math.ceil(bounds.x1 + pad) - x,
      h: Math.ceil(bounds.y1 + pad) - y,
    };
    cells.push(made);
    return made;
  };
  const boughs = depth.boughs.map((vines) => {
    const drawn = vines.map((v) => vine(rand, v, depth));
    const bounds = box();
    for (const v of drawn) {
      bounds.add(v.bounds.x0, v.bounds.y0);
      bounds.add(v.bounds.x1, v.bounds.y1);
    }
    return {
      cell: cell(drawn.map((v) => v.body).join(''), bounds),
      // A bough swings about the place where it is tied to the beam.
      hinge: drawn[0].hinge,
      leaves: drawn
        .flatMap((v) => v.leaves)
        .map((l) => ({ cell: cell(l.body, l.bounds), hinge: l.hinge })),
      // Every piece keeps its own time, so no two ever move together for long.
      period: depth.period[0] + rand() * (depth.period[1] - depth.period[0]),
      phase: rand(),
    };
  });
  for (const bough of boughs) {
    for (const leaf of bough.leaves) {
      leaf.period = 3.4 + rand() * 2.2;
      leaf.phase = rand();
    }
  }
  return { name: depth.name, boughs };
});

let sheetW = 0;
let sheetH = 0;
{
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const c of [...cells].sort((a, b) => b.h - a.h)) {
    if (x && x + c.w > SHEET_WIDTH) {
      x = 0;
      y += shelf + GAP;
      shelf = 0;
    }
    c.sx = x;
    c.sy = y;
    x += c.w + GAP;
    shelf = Math.max(shelf, c.h);
    sheetW = Math.max(sheetW, c.sx + c.w);
    sheetH = Math.max(sheetH, c.sy + c.h);
  }
}

const filters = depths
  .map(
    (d) =>
      `<filter id="${d.name}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="${d.blur}"/></filter>`
  )
  .join('');
const groups = cells
  .map(
    (c) =>
      `<g transform="translate(${c.sx - c.x},${c.sy - c.y})"><g filter="url(#${c.depth.name})" opacity="${c.depth.opacity}">${c.body}</g></g>`
  )
  .join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}" height="${sheetH}" preserveAspectRatio="none">${filters}${groups}</svg>\n`;

// Everything the component needs to hang a piece, as percentages: its box (of the stage
// for a bough, of its bough for a leaf), its hinge within that box, and the CSS mask size
// and position that show its cell of the sheet and nothing else.
const pc = (n) => Math.round(n * 1e4) / 100;
function hang(piece, frame) {
  const c = piece.cell;
  return {
    box: [
      pc((c.x - frame.x) / frame.w),
      pc((c.y - frame.y) / frame.h),
      pc(c.w / frame.w),
      pc(c.h / frame.h),
    ],
    hinge: [pc((piece.hinge[0] - c.x) / c.w), pc((piece.hinge[1] - c.y) / c.h)],
    sheet: [
      pc(sheetW / c.w),
      pc(sheetH / c.h),
      pc(c.sx / (sheetW - c.w)),
      pc(c.sy / (sheetH - c.h)),
    ],
    // The canopy fades out downwards. This is where the stage's top and height fall,
    // seen from the piece: the size and position of a gradient as tall as the stage.
    fade: [pc(STAGE.h / c.h), pc((STAGE.y - c.y) / (c.h - STAGE.h))],
    period: Math.round(piece.period * 10) / 10,
    phase: Math.round(piece.phase * 100) / 100,
  };
}

const middle = STAGE.x + STAGE.w / 2;
const manifest = {
  stage: { ratio: `${STAGE.w} / ${STAGE.h}` },
  depths: layout.map(({ name, boughs }) => ({
    name,
    boughs: boughs.map((bough) => {
      const c = bough.cell;
      return {
        ...hang(bough, STAGE),
        // Where across the stage the bough hangs, 0 to 1: a gust reaches it that late.
        across: Math.round(((c.x + c.w / 2 - STAGE.x) / STAGE.w) * 100) / 100,
        // How far from the middle of the page the bough starts, in stage widths. Narrow
        // screens never see the outer boughs, so the component leaves them unhung there.
        reach: Math.round((Math.max(0, c.x - middle, middle - (c.x + c.w)) / STAGE.w) * 100) / 100,
        leaves: bough.leaves.map((leaf) => hang(leaf, c)),
      };
    }),
  })),
};

mkdirSync('public/grotto', { recursive: true });
writeFileSync('public/grotto/canopy.svg', sheet);
// Formatted as the repository's formatter would, so that the check on formatting and a
// rerun of this script agree about the file.
const json = 'src/data/canopy.json';
writeFileSync(
  json,
  await format(JSON.stringify(manifest), { ...(await resolveConfig(json)), filepath: json })
);
console.log(
  `canopy.svg ${sheet.length} B, ${sheetW} x ${sheetH}, ${cells.length} pieces (${layout
    .map(
      (d) =>
        `${d.name}: ${d.boughs.length} boughs, ${d.boughs.reduce((n, b) => n + b.leaves.length, 0)} leaves`
    )
    .join('; ')})`
);
