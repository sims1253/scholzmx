/**
 * Card dressing: how one sheet lies on the desk, what paper it is, what holds it down,
 * and what has happened to it since.
 *
 * Every choice is drawn from the card's seed, so a card looks the same on every build
 * and nothing moves when the page loads. The draws come from separate streams (place,
 * paper, marks), so a change to one kind of choice leaves the others as they were.
 *
 * Marks never cover words. Each mark has a home the card keeps clear for it:
 * - `corner` marks sit in the bottom-right corner, beside the footer line, which makes
 *   room for them (`.sc-card[data-zone]`). A card whose corner holds a taped photo gets
 *   no corner mark.
 * - `edge` marks walk along the top edge, in the strip above the title.
 */
import { createSeededRng } from '../scripts/seeded';

export type Material = 'paper' | 'index' | 'tag' | 'recipe';

export type Tint = 'plain' | 'cream' | 'sage' | 'aged' | 'grey';
export type Ruling = 'plain' | 'margin' | 'ruled' | 'squared' | 'binder';
export type Edge = 'cut' | 'torn' | 'deckle';
export type Fold = 'tr' | 'bl' | 'br';

export type TapeTone = 'plain' | 'masking' | 'washi' | 'moss' | 'clear';
export type TapeSpot = 'left' | 'right' | 'centre' | 'corner-left' | 'corner-right';
export interface TapeStrip {
  spot: TapeSpot;
  tone: TapeTone;
  turn: number; // degrees
  length: number; // rem
  tear: 1 | 2 | 3; // how the ends were torn
}

export type Fastener =
  { kind: 'tape'; strips: TapeStrip[] } | { kind: 'pin' | 'clip' | 'staple' | 'none' };

export type CornerMark = 'ring' | 'blot' | 'thumb' | 'stamp' | 'tansy' | 'pencil' | 'mouse';
export type EdgeMark =
  | 'ants'
  | 'inchworm'
  | 'ladybird'
  | 'bee'
  | 'butterfly'
  | 'dragonfly'
  | 'spider'
  | 'snail'
  | 'beetle'
  | 'cricket';
export type MarkKind = CornerMark | EdgeMark;

export interface Mark {
  kind: MarkKind;
  home: 'corner' | 'edge';
  turn: number; // degrees
  along: number; // edge marks: where along the top edge, in % of the width
  variant: 1 | 2 | 3;
}

export interface Dressing {
  layers: 1 | 2 | 3 | 4;
  /** Turns of the face and of the sheets beneath it, in degrees */
  tilt: { face: number; a: number; b: number };
  /**
   * Where the card lies off its grid cell, in rem; `over` orders overlapping cards.
   * `short` is how far the sheet stops above the foot of its row: sheets in a row are
   * nearly one length, so no card leaves a hole under it.
   */
  place: { x: number; y: number; over: 1 | 2 | 3; short: number };
  tint: Tint;
  ruling: Ruling;
  edge: Edge;
  fold: Fold | null;
  fastener: Fastener;
  mark: Mark | null;
}

export interface DressOptions {
  material?: Material;
  /** Force the number of sheets; catalogue cards and tags are always one sheet. */
  layers?: 1 | 2 | 3 | 4;
  /** False draws no marks at all. */
  marks?: boolean;
  /** True when the bottom-right corner is taken (by a taped photo). */
  cornerTaken?: boolean;
  /**
   * For a card that draws a critter, its place among the shelf's cards that draw one, from
   * 0, and the seed of the shelf's first card: between them they settle which critter it
   * carries (see dealCritter). Left out, the card's own seed settles it.
   */
  deal?: { index: number; shelf: string };
}

const CORNER_MARKS: readonly CornerMark[] = [
  'ring',
  'blot',
  'thumb',
  'stamp',
  'tansy',
  'pencil',
  'mouse',
];
const isCorner = (kind: MarkKind | 'none'): kind is CornerMark =>
  CORNER_MARKS.some((corner) => corner === kind);

/** Choices with their weights, drawn with one roll */
type Weights<K> = readonly (readonly [K, number])[];

/** What turns up on each shelf. Critters are the likeliest mark on writing paper; a cup
 * ring on a recipe card, a library's date stamp on a catalogue card. A card with a taped
 * photo takes no corner mark, which makes its critter that much likelier. Whether a card
 * carries a mark at all is its seed's to say; which critter is the shelf's (dealCritter). */
const MARK_WEIGHTS: Record<Material, Weights<MarkKind | 'none'>> = {
  paper: [
    ['ring', 6],
    ['blot', 5],
    ['thumb', 4],
    ['tansy', 7],
    ['pencil', 5],
    ['mouse', 6],
    ['ants', 6],
    ['inchworm', 6],
    ['ladybird', 5],
    ['bee', 6],
    ['butterfly', 5],
    ['dragonfly', 5],
    ['spider', 5],
    ['snail', 5],
    ['beetle', 5],
    ['cricket', 5],
    ['none', 10],
  ],
  recipe: [
    ['ring', 14],
    ['thumb', 8],
    ['blot', 6],
    ['tansy', 9],
    ['mouse', 12],
    ['ants', 7],
    ['inchworm', 5],
    ['ladybird', 5],
    ['bee', 6],
    ['butterfly', 5],
    ['snail', 6],
    ['beetle', 4],
    ['none', 16],
  ],
  index: [
    ['stamp', 24],
    ['ring', 8],
    ['pencil', 12],
    ['thumb', 6],
    ['ants', 8],
    ['ladybird', 6],
    ['spider', 6],
    ['beetle', 6],
    ['none', 22],
  ],
  tag: [
    ['ring', 8],
    ['blot', 6],
    ['tansy', 8],
    ['mouse', 8],
    ['inchworm', 9],
    ['ants', 8],
    ['ladybird', 6],
    ['bee', 6],
    ['dragonfly', 6],
    ['cricket', 6],
    ['snail', 5],
    ['none', 20],
  ],
};

type FastenerChoice = 'tape2' | 'tape1' | 'pin' | 'clip' | 'staple' | 'none';
const FASTENER_WEIGHTS: Record<Material, Weights<FastenerChoice>> = {
  paper: [
    ['tape2', 34],
    ['tape1', 22],
    ['pin', 15],
    ['clip', 14],
    ['staple', 10],
    ['none', 5],
  ],
  recipe: [
    ['tape2', 40],
    ['tape1', 25],
    ['pin', 20],
    ['clip', 15],
  ],
  index: [
    ['tape1', 28],
    ['pin', 30],
    ['clip', 20],
    ['none', 22],
  ],
  tag: [['none', 100]], // a tag hangs from its string
};

const RULING_WEIGHTS: Record<Material, Weights<Ruling>> = {
  paper: [
    ['plain', 22],
    ['margin', 22],
    ['ruled', 22],
    ['squared', 17],
    ['binder', 17],
  ],
  recipe: [
    ['plain', 55],
    ['ruled', 45],
  ],
  index: [
    ['plain', 55],
    ['ruled', 45],
  ],
  tag: [['plain', 100]],
};

const EDGE_WEIGHTS: Record<Material, Weights<Edge>> = {
  paper: [
    ['cut', 55],
    ['torn', 25],
    ['deckle', 20],
  ],
  recipe: [
    ['cut', 75],
    ['deckle', 25],
  ],
  index: [['cut', 100]],
  tag: [['cut', 100]],
};

const TINT_WEIGHTS: Weights<Tint> = [
  ['plain', 34],
  ['cream', 22],
  ['sage', 16],
  ['aged', 16],
  ['grey', 12],
];

const TAPE_WEIGHTS: Weights<TapeTone> = [
  ['plain', 40],
  ['masking', 22],
  ['washi', 16],
  ['moss', 10],
  ['clear', 12],
];

const LONE_TAPE_WEIGHTS: Weights<TapeSpot> = [
  ['centre', 3],
  ['corner-left', 2],
  ['corner-right', 2],
  ['left', 1],
];

type Rng = ReturnType<typeof createSeededRng>;

function weighted<K>(rng: Rng, weights: Weights<K>, fallback: K): K {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.random() * total;
  for (const [key, weight] of weights) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return fallback;
}

/** One of a few values, the middle ones likelier (as `betweenInt` rounds) */
function oneOf<const T>(rng: Rng, first: T, ...rest: T[]): T {
  return [first, ...rest][rng.betweenInt(0, rest.length)] ?? first;
}

const round = (value: number, places = 2) => Number(value.toFixed(places));
const signed = (rng: Rng, min: number, max: number) =>
  (rng.chance(0.5) ? 1 : -1) * rng.between(min, max);

function tapeStrip(rng: Rng, spot: TapeSpot): TapeStrip {
  const corner = spot.startsWith('corner');
  const lean = spot === 'corner-left' || spot === 'left' ? -1 : 1;
  return {
    spot,
    tone: weighted(rng, TAPE_WEIGHTS, 'plain'),
    turn: round(corner ? lean * rng.between(32, 48) : lean * rng.between(1, 9) + signed(rng, 0, 3)),
    length: round(rng.between(2.5, 3.9)),
    tear: oneOf(rng, 1, 2, 3),
  };
}

function fastenerOf(rng: Rng, material: Material): Fastener {
  const kind = weighted(rng, FASTENER_WEIGHTS[material], 'none');
  if (kind === 'tape2') {
    const pair: TapeSpot[] = rng.chance(0.35) ? ['corner-left', 'corner-right'] : ['left', 'right'];
    return { kind: 'tape', strips: pair.map((spot) => tapeStrip(rng, spot)) };
  }
  if (kind === 'tape1') {
    return { kind: 'tape', strips: [tapeStrip(rng, weighted(rng, LONE_TAPE_WEIGHTS, 'centre'))] };
  }
  return { kind };
}

const greatestCommonDivisor = (a: number, b: number): number =>
  b === 0 ? a : greatestCommonDivisor(b, a % b);

/**
 * A shelf deals its critters along itself. A card's seed still says whether it carries one;
 * which one is the shelf's to say. The cards that draw one take them in order: each has the
 * critter three places along the shelf's list from the card that drew one before it, from
 * a start the shelf's first card's seed sets. So a shelf shows as many kinds as it has
 * cards that draw a critter, up to the number of kinds, and two such cards never share one
 * until the deal has come round to every kind. (A card's own seed cannot do this: shifted
 * or not, two independent draws agree as often as ever.) Three places, or the next count
 * that shares no divisor with the number of critters, so that the deal does come round.
 */
function dealCritter(
  material: Material,
  deal: { index: number; shelf: string },
  drawn: EdgeMark
): EdgeMark {
  const critters = MARK_WEIGHTS[material].flatMap(([mark]) =>
    mark !== 'none' && !isCorner(mark) ? [mark] : []
  );
  if (critters.length < 2) return drawn;
  let stride = 3;
  while (greatestCommonDivisor(stride, critters.length) > 1) stride += 1;
  const start = createSeededRng(deal.shelf, 'card-v4:deal').betweenInt(0, critters.length - 1);
  return critters[(start + stride * deal.index) % critters.length] ?? drawn;
}

export function dressCard(seed: string, options: DressOptions = {}): Dressing {
  const { material = 'paper', marks = true, cornerTaken = false, deal } = options;
  const place = createSeededRng(seed, 'card-v4:place');
  const paper = createSeededRng(seed, 'card-v4:paper');
  const marking = createSeededRng(seed, 'card-v4:marks');

  // Where it lies. Most cards sit a little off; a few were dropped on with a flick.
  const flick = place.chance(0.2) ? 1.4 : 1;
  const tilt = {
    face: round(signed(place, 0.3, 1.9) * flick),
    a: round(signed(place, 0.8, 2.6)),
    b: round(signed(place, 0.6, 2.2)),
  };
  const layout = {
    x: round(place.between(-0.5, 0.5)),
    y: round(place.between(-0.25, 0.45)),
    over: oneOf(place, 1, 2, 3),
  };

  const single = material === 'index' || material === 'tag';
  const r = place.random();
  const layers = options.layers ?? (single ? 1 : r < 0.25 ? 1 : r < 0.65 ? 2 : r < 0.9 ? 3 : 4);
  const short = round(place.between(0, 1.3));

  // What paper it is
  const tint = weighted(paper, TINT_WEIGHTS, 'plain');
  const ruling = weighted(paper, RULING_WEIGHTS[material], 'plain');
  const edge = single ? 'cut' : weighted(paper, EDGE_WEIGHTS[material], 'cut');
  const fastener = fastenerOf(paper, material);

  // What has happened to it
  let mark: Mark | null = null;
  if (marks) {
    const pool = MARK_WEIGHTS[material].filter(([kind]) => !(cornerTaken && isCorner(kind)));
    const drawn = weighted(marking, pool, 'none');
    const kind =
      drawn !== 'none' && !isCorner(drawn) && deal ? dealCritter(material, deal, drawn) : drawn;
    if (kind !== 'none') {
      let along = Math.round(marking.between(30, 60));
      // A pin or a centre strip of tape holds the middle of the top edge
      const middleHeld =
        fastener.kind === 'pin' ||
        (fastener.kind === 'tape' && fastener.strips.some((s) => s.spot === 'centre'));
      if (middleHeld && along > 38) along -= 16;
      mark = {
        kind,
        home: isCorner(kind) ? 'corner' : 'edge',
        turn: Math.round(marking.between(-40, 40)),
        along,
        variant: oneOf(marking, 1, 2, 3),
      };
    }
  }

  // A dog-ear, where nothing else claims the corner. A nibbled corner cannot also fold.
  const firstFold: Fold = 'bl';
  const folds: Fold[] = [];
  if (mark?.home !== 'corner') folds.push('br');
  const tapedRight =
    fastener.kind === 'tape' && fastener.strips.some((s) => s.spot.endsWith('right'));
  if (!tapedRight && fastener.kind !== 'clip') folds.push('tr');
  const fold =
    material !== 'tag' && mark?.kind !== 'mouse' && paper.chance(0.18)
      ? oneOf(paper, firstFold, ...folds)
      : null;

  return {
    layers,
    tilt,
    place: { ...layout, short },
    tint,
    ruling,
    edge: mark?.kind === 'mouse' ? 'cut' : edge,
    fold,
    fastener,
    mark,
  };
}

/**
 * For a shelf's cards, in order, each one's place among the cards that draw a critter
 * (undefined for the others), to pass to the card as its `deal.index` (see dealAt). A card
 * is described as StackedCard dresses it: by its seed, and by whether its corner is taken.
 */
export function critterPlaces(
  cards: readonly { seed: string; cornerTaken?: boolean }[],
  options: { material?: Material } = {}
): (number | undefined)[] {
  let place = 0;
  return cards.map((card) => {
    const drawn = dressCard(card.seed, { ...options, cornerTaken: card.cornerTaken });
    if (drawn.mark?.home !== 'edge') return undefined;
    const at = place;
    place += 1;
    return at;
  });
}

/** The `deal` for the card at `index` of a shelf, from the shelf's places (critterPlaces). */
export function dealAt(
  places: readonly (number | undefined)[],
  index: number,
  shelf: string
): { index: number; shelf: string } | undefined {
  const at = places[index];
  return at === undefined ? undefined : { index: at, shelf };
}
