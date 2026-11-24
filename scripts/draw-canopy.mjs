// Draws the vine canopy whose shadows fall across the top of every page.
// The output SVGs are masks: only their alpha matters, CSS supplies the colour.
//
//   node scripts/draw-canopy.mjs
//
// The drawing is seeded, so rerunning it reproduces the committed files:
//   public/grotto/canopy-high.svg    the far canopy, one drawing: it is heavy, and sways as one
//   public/grotto/canopy-low.svg     the near canopy, one cell per bough and per leaf
//   src/styles/canopy-parts.css      where every cell lies, and how it moves
//   src/data/canopy.ts               the near boughs, and the leaves each one carries
//
// The near canopy moves as a branch does: every bough sways on its own, and every leaf
// turns on its stalk. So each of them is drawn into a cell of its own, and the page shows
// a cell as one layer that moves by itself (src/components/Canopy.astro). A leaf lies
// under its stem: it is cut clear of the stem, and it turns about the point where it
// meets the stem, so the two stay the one shadow they were cut from.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';

// The canopy is drawn on this canvas; its top left is the top centre of the page.
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
const hundredths = (n) => Math.round(n * 100) / 100;

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
// a short point. Both are traced around the stalk, where the veins meet. The points come
// back with the path, so a cell can be cut round the leaf.
function outline(radius, size, points = 120) {
  const traced = [];
  let d = '';
  for (let i = 0; i < points; i++) {
    const a = -Math.PI + (i / points) * Math.PI * 2;
    const r = radius(a) * size;
    const x = f(Math.sin(a) * r);
    const y = f(-Math.cos(a) * r);
    traced.push([x, y]);
    d += `${i ? 'L' : 'M'}${x},${y}`;
  }
  return { d: `${d}Z`, points: traced };
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

// A curl reaches out from the vine and ends in a tight spiral.
function curl(x, y, rand) {
  const dir = rand() < 0.5 ? -1 : 1;
  const reach = 50 + rand() * 60;
  const ex = x + dir * reach * 0.6;
  const ey = y + reach;
  const bend = [x + dir * reach * 0.9, y + reach * 0.3];
  let d = `M${f(x)},${f(y)} Q${f(bend[0])},${f(bend[1])} ${f(ex)},${f(ey)}`;
  const points = [[x, y], bend, [ex, ey]];
  const turns = 1.4 + rand() * 0.8;
  const radius = 7 + rand() * 6;
  for (let i = 1; i <= 30; i++) {
    const t = i / 30;
    const a = dir * t * turns * Math.PI * 2;
    const r = radius * (1 - t * 0.8);
    const point = [ex - dir * radius + dir * Math.cos(a) * r, ey + Math.sin(Math.abs(a)) * r];
    points.push(point);
    d += ` L${f(point[0])},${f(point[1])}`;
  }
  return {
    svg: `<path d="${d}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>`,
    points,
  };
}

function tendril(x, y, rand) {
  const turns = 2 + rand() * 1.5;
  const radius = 10 + rand() * 12;
  const dir = rand() < 0.5 ? -1 : 1;
  const steps = 40;
  let d = `M${f(x)},${f(y)}`;
  const points = [[x, y]];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = dir * t * turns * Math.PI * 2;
    const r = radius * (1 - t * 0.85);
    const reach = t * radius * 2.6;
    const point = [x + Math.sin(a) * r + dir * reach * 0.4, y + reach - Math.cos(a) * r + r];
    points.push(point);
    d += ` L${f(point[0])},${f(point[1])}`;
  }
  return {
    svg: `<path d="${d}" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>`,
    points,
  };
}

const rad = (degrees) => (degrees * Math.PI) / 180;

// A vine enters from the top edge and wanders across the canopy. It comes back as what
// it drew, in the order it drew it: its stem, then each leaf with the stalk that holds it
// to the stem, and here and there a curl or a tendril. Each thing keeps the points it
// passes through, so a cell can be cut round it.
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
  const drawn = [];
  drawn.push({
    kind: 'stem',
    svg: `<path d="M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}" fill="none" stroke="#000" stroke-width="${f(leafSize * 0.06)}" stroke-linecap="round"/>`,
    points: Array.from({ length: 33 }, (_, i) => at(i / 32)),
  });
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
    const sx = x + Math.sin(rad(angle)) * -stalk;
    const sy = y + Math.cos(rad(angle)) * stalk;
    const stalkSvg = `<path d="M${f(x)},${f(y)} L${f(sx)},${f(sy)}" fill="none" stroke="#000" stroke-width="${f(size * 0.03)}"/>`;
    if (crisp) {
      // Leaves turned away from the light cast narrower shadows.
      const turn = 0.55 + rand() * 0.45;
      const { d, points } = outline(
        kind === 'grape' ? grapeOutline(rand) : kiwiOutline(rand),
        size * 1.15
      );
      const cosine = Math.cos(rad(angle));
      const sine = Math.sin(rad(angle));
      const placed = points.map(([lx, ly]) => {
        const narrow = lx * turn;
        return [sx + narrow * cosine - ly * sine, sy + narrow * sine + ly * cosine];
      });
      drawn.push({
        kind: 'leaf',
        svg: `${stalkSvg}<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)}) scale(${f(turn * 100) / 100},1)"><path d="${d}"/></g>`,
        points: [[x, y], [sx, sy], ...placed],
        // The blade alone, to tell whether two leaves lie over each other.
        outline: placed,
        // It turns about the point where its stalk meets the stem.
        pivot: [x, y],
        turn,
      });
      if (rand() < 0.2) drawn.push({ kind: 'curl', ...curl(x, y, rand) });
    } else {
      const leaf = kind === 'grape' ? grapeLeaf(size) : kiwiLeaf(size);
      drawn.push({
        kind: 'leaf',
        svg: `${stalkSvg}<g transform="translate(${f(sx)},${f(sy)}) rotate(${f(angle)})">${leaf}</g>`,
        // The far leaves are blurred, so a disc the size of the leaf encloses their shadow.
        points: Array.from({ length: 16 }, (_, i) => [
          sx + Math.sin((i / 16) * Math.PI * 2) * size,
          sy + Math.cos((i / 16) * Math.PI * 2) * size,
        ]),
      });
      if (rand() < 0.35) drawn.push({ kind: 'tendril', ...tendril(x, y, rand) });
    }
  }
  return { drawn, root: p0 };
}

// The far canopy sits far from the page, so its shadows are broad and soft.
// Many smaller leaves leave gaps between them, which is what makes light dapple.
const FAR = [
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
];

// Low tendrils hang close to the page, so their shadows stay crisp.
const NEAR = [
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
];

// ===== Cells =====

// The smallest whole-number box round some points: [x, y, w, h].
function around(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return [x, y, Math.ceil(Math.max(...xs)) - x, Math.ceil(Math.max(...ys)) - y];
}

const grown = ([x, y, w, h], by) => [x - by, y - by, w + 2 * by, h + 2 * by];
const boxOf = (stroke) => around(stroke.points);
// One box round several.
const enclosing = (boxes) =>
  around(
    boxes.flatMap(([x, y, w, h]) => [
      [x, y],
      [x + w, y + h],
    ])
  );

// Lays boxes in rows, the tallest first: the sheet with the least paper that holds them
// all. Each comes back with its corner's place on the sheet.
function lay(cells) {
  const order = cells.map((_, i) => i).sort((a, b) => cells[b].box[3] - cells[a].box[3] || a - b);
  const widest = Math.ceil(Math.max(...cells.map((cell) => cell.box[2])));
  const total = cells.reduce((sum, cell) => sum + cell.box[2], 0);
  let best = null;
  for (let width = widest; width <= total; width++) {
    const placed = [];
    let x = 0;
    let y = 0;
    let row = 0;
    for (const i of order) {
      const [w, h] = cells[i].box.slice(2);
      if (x > 0 && x + w > width) {
        y += row;
        x = 0;
        row = 0;
      }
      placed[i] = [x, y];
      x += w;
      row = Math.max(row, h);
    }
    const paper = width * (y + row);
    if (!best || paper < best.paper) best = { paper, placed, size: [width, y + row] };
  }
  return { size: best.size, cells: cells.map((cell, i) => ({ ...cell, spot: best.placed[i] })) };
}

// A cell with room on every side for four blur widths, so no edge of its shadow is cut off.
const withBlur = (blur) => (cell) => ({
  ...cell,
  box: grown(enclosing(cell.strokes.map(boxOf)), Math.ceil(blur * 4)),
  blur,
});

// A sheet of cells, each blurred. A cell with `clearOf` lies under strokes that are
// shown in a cell of their own (its bough's stem): they are cut out of it, sharply and
// before it is blurred, so the two together are the shadow of the one drawing they were
// cut from. No strength is set here: each cell is shown at its whole strength, and the
// page gives it its share of the light's shade (tokens.colors.css).
function sheet({ cells, size }) {
  // Each cell's corner stands where the corner of its box was on the canvas.
  const into = cells.map((cell) => [cell.spot[0] - cell.box[0], cell.spot[1] - cell.box[1]]);
  const defs = [];
  const shown = [];
  cells.forEach((cell, index) => {
    const [x, y] = cell.spot;
    const region = `x="${x}" y="${y}" width="${cell.box[2]}" height="${cell.box[3]}"`;
    const strokes = cell.strokes.map((stroke) => stroke.svg).join('');
    defs.push(
      `<filter id="soft-${index}" filterUnits="userSpaceOnUse" ${region}><feGaussianBlur stdDeviation="${cell.blur}"/></filter>`,
      `<g id="drawn-${index}"><g transform="translate(${f(into[index][0])} ${f(into[index][1])})">${strokes}</g></g>`
    );
    let clear = '';
    if (cell.clearOf.length) {
      // What lies over the cell, moved from its own cell into this one.
      const over = cell.clearOf
        .map((other) => {
          const [dx, dy] = [into[index][0] - into[other][0], into[index][1] - into[other][1]];
          return `<use href="#drawn-${other}" transform="translate(${f(dx)} ${f(dy)})"/>`;
        })
        .join('');
      defs.push(
        `<mask id="clear-${index}" maskUnits="userSpaceOnUse" ${region}><rect ${region} fill="#fff"/>${over}</mask>`
      );
      clear = ` mask="url(#clear-${index})"`;
    }
    shown.push(`<g filter="url(#soft-${index})"><g${clear}><use href="#drawn-${index}"/></g></g>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size[0]} ${size[1]}"><defs>${defs.join('')}</defs>${shown.join('')}</svg>\n`;
}

// ===== The far canopy =====

// It sits far from the page and is heavy: its shadows are broad and soft, and it sways
// as one.
function drawing({ seed, blur, opacity, vines }) {
  const rand = rng(seed);
  const strokes = vines.flatMap((opts) => vine(rand, { ...opts, crisp: false }).drawn);
  const body = strokes.map((stroke) => stroke.svg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice"><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur}"/></filter><g filter="url(#b)" opacity="${opacity}">${body}</g></svg>\n`;
}

const FAR_SHEET = { width: W, height: H };
const farSheet = drawing({ seed: 1592, blur: 6, opacity: 0.6, vines: FAR });

// ===== The near canopy: boughs that sway, and leaves that turn =====

const NEAR_BLUR = 1.8;

// Whether a point lies inside a closed outline.
function inside([x, y], outline) {
  let odd = false;
  for (const [index, [ax, ay]] of outline.entries()) {
    const [bx, by] = outline[(index + 1) % outline.length];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) odd = !odd;
  }
  return odd;
}

// Whether one closed outline runs into another: a corner of either lies inside it.
const crosses = (a, b) =>
  a.some((point) => inside(point, b)) || b.some((point) => inside(point, a));

// What moves together: a bough is its stem and what grows from it that is not a leaf. A
// leaf is the leaf and the stalk it turns on, about the point where the stalk meets the
// stem. Leaves that hang from almost one point lie over each other, so they turn
// together, about the middle of the points their stalks meet the stem at: they share a
// bed. All of it keeps the order it was drawn in.
const nearRand = rng(2318);
const vines = NEAR.map((opts, index) => ({ index, ...vine(nearRand, { ...opts, crisp: true }) }));
const leaves = vines.flatMap((bough) => bough.drawn.filter((stroke) => stroke.kind === 'leaf'));
// Each leaf names the first leaf of its bed, as sets are merged.
const bed = leaves.map((_, index) => index);
const bedOf = (index) => (bed[index] === index ? index : (bed[index] = bedOf(bed[index])));
for (const [i, first] of leaves.entries()) {
  for (const [j, second] of leaves.entries()) {
    if (j > i && crosses(first.outline, second.outline)) bed[bedOf(j)] = bedOf(i);
  }
}

const parts = [];
const beds = new Map();
for (const bough of vines) {
  parts.push({
    kind: 'bough',
    index: bough.index,
    strokes: bough.drawn.filter((stroke) => stroke.kind !== 'leaf'),
    pivot: bough.root,
    clearOf: [],
  });
  for (const stroke of bough.drawn) {
    if (stroke.kind !== 'leaf') continue;
    const id = bedOf(leaves.indexOf(stroke));
    if (!beds.has(id)) {
      beds.set(id, {
        kind: 'leaf',
        index: beds.size,
        strokes: [],
        pivots: [],
        boughs: new Set(),
        // No leaf of the bed opens past its own whole width.
        turn: 1,
      });
      parts.push(beds.get(id));
    }
    const leaf = beds.get(id);
    leaf.strokes.push(stroke);
    leaf.pivots.push(stroke.pivot);
    leaf.boughs.add(bough.index);
    leaf.turn = Math.min(leaf.turn, stroke.turn);
  }
}
for (const leaf of beds.values()) {
  leaf.pivot = leaf.pivots[0].map(
    (_, axis) => leaf.pivots.reduce((sum, pivot) => sum + pivot[axis], 0) / leaf.pivots.length
  );
  delete leaf.pivots;
  // It turns on its stem, so where the stem lies over it is cut out of it: the cells of
  // the boughs it grows from.
  leaf.clearOf = parts.flatMap((part, index) =>
    part.kind === 'bough' && leaf.boughs.has(part.index) ? [index] : []
  );
  delete leaf.boughs;
}

const near = lay(parts.map(withBlur(NEAR_BLUR)));

// ===== Where every cell lies, and how it moves =====

// The wind is drawn from its own stream, so the vines stay as they are.
const wind = rng(7331);
const between = (from, to) => Math.round((from + wind() * (to - from)) * 10) / 10;

// A sway eases like a branch: no stacked gusts, whose sudden changes of direction read
// as stutter on layers this large. A bough turns about the point it hangs from, so its
// far end moves most.
const sway = ({ period, swing, drift, drop }) => {
  const seconds = between(...period);
  return {
    '--period': `${seconds}s`,
    '--phase': `${-Math.round((wind() * seconds * 10) / 10)}s`,
    '--swing': `${between(...swing)}deg`,
    '--drift': between(...drift),
    '--drop': between(...drop),
  };
};

// A cell: the corner of its box on the canvas, its size, its place in its sheet and the
// point it turns about, counted from the corner of its box. All in units of the drawing.
const cell = ({ box, spot, pivot }) => ({
  '--ax': box[0],
  '--ay': box[1],
  '--w': box[2],
  '--h': box[3],
  '--cx': spot[0],
  '--cy': spot[1],
  '--ox': f(pivot[0] - box[0]),
  '--oy': f(pivot[1] - box[1]),
});

const rules = [];
const rule = (selector, vars) =>
  rules.push(
    `${selector} {\n${Object.entries(vars)
      .map(([name, value]) => `${name}: ${value};`)
      .join('\n')}\n}\n`
  );

rule('.canopy-far', {
  '--sheet': `url('/grotto/canopy-high.svg')`,
  '--sheet-w': FAR_SHEET.width,
  '--sheet-h': FAR_SHEET.height,
  ...cell({ box: [0, 0, FAR_SHEET.width, FAR_SHEET.height], spot: [0, 0], pivot: [800, -300] }),
  ...sway({ period: [15, 17], swing: [0.45, 0.6], drift: [11, 14], drop: [3, 5] }),
});
rule('.canopy-bough', {
  '--sheet': `url('/grotto/canopy-low.svg')`,
  '--sheet-w': near.size[0],
  '--sheet-h': near.size[1],
});

// Each bough, and the numbers of the leaves it carries.
const carried = [];
let bough;
for (const part of near.cells) {
  if (part.kind === 'bough') {
    bough = part;
    carried.push([]);
    // A bough is a group that sways about its root. Its stem and its leaves are cells
    // placed inside it, so they sway with it.
    rule(`.canopy-bough-${part.index}`, {
      '--ax': part.box[0],
      '--ay': part.box[1],
      '--ox': f(part.pivot[0] - part.box[0]),
      '--oy': f(part.pivot[1] - part.box[1]),
      ...sway({ period: [8, 13], swing: [0.7, 1.2], drift: [4, 7], drop: [1, 3] }),
    });
    rule(`.canopy-stem-${part.index}`, { ...cell(part), '--x': 0, '--y': 0 });
    continue;
  }
  carried.at(-1).push(part.index);
  const seconds = between(4.5, 8);
  const shut = between(0.8, 0.88);
  const swing = {
    '--phase': `${-Math.round((wind() * seconds * 10) / 10)}s`,
    '--swing': `${between(3.5, 7)}deg`,
  };
  // A leaf opens to at most its whole width: its shadow was drawn turned from the light.
  const open = hundredths(Math.min(1.25, shut + between(0.3, 0.45), hundredths(1 / part.turn)));
  rule(`.canopy-leaf-${part.index}`, {
    ...cell(part),
    // Inside its bough, counted from the corner of the bough's box.
    '--x': part.box[0] - bough.box[0],
    '--y': part.box[1] - bough.box[1],
    '--period': `${seconds}s`,
    ...swing,
    '--shut': shut,
    '--open': open,
  });
}

const cssFile = 'src/styles/canopy-parts.css';
const css = await prettier.format(
  `/* Where every cell of the canopy lies, and how it moves. Generated by\n   scripts/draw-canopy.mjs with the sheets in public/grotto; do not edit. */\n${rules.join('\n')}`,
  { ...(await prettier.resolveConfig(cssFile)), parser: 'css' }
);
const tsFile = 'src/data/canopy.ts';
const ts = `// The near canopy's boughs, each as the numbers of the leaves it carries (the classes\n// .canopy-leaf-N of src/styles/canopy-parts.css). Generated by scripts/draw-canopy.mjs\n// with the sheets in public/grotto; do not edit.\nexport const boughs = [\n${carried.map((row) => `  [${row.join(', ')}],`).join('\n')}\n] as const;\n`;

const sheets = {
  'public/grotto/canopy-high.svg': farSheet,
  'public/grotto/canopy-low.svg': sheet(near),
};
mkdirSync('public/grotto', { recursive: true });
for (const [file, svg] of Object.entries(sheets)) writeFileSync(file, svg);
writeFileSync(cssFile, css);
writeFileSync(
  tsFile,
  await prettier.format(ts, { ...(await prettier.resolveConfig(tsFile)), parser: 'typescript' })
);
console.log(
  `${Object.entries(sheets)
    .map(([file, svg]) => `${file.replace('public/grotto/', '')} ${svg.length} B`)
    .join(', ')}, ${cssFile} ${css.length} B`
);
