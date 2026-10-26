/**
 * Recipes as data: ingredients and the steps that combine them.
 *
 * One description renders three ways (table, numbered steps, cooking mode), following
 * Michael Chu's wish to separate recipe data from presentation. The table is his
 * "Cooking for Engineers" notation: ingredients down the left in the order they are
 * used, each step a cell spanning exactly what it combines, merging rightwards into
 * the finished dish.
 */

export interface RecipeIngredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  /** Done before cooking starts, e.g. "cut into small cubes". Feeds the "get ready" stage. */
  prep?: string;
  /** Latitude rather than instruction, e.g. "or cilantro". Amounts in braces scale: "up to {180 ml}". */
  note?: string;
  /** Pinches and "to taste" stay put when the recipe is scaled. */
  scales?: boolean;
}

export interface RecipeStep {
  id: string;
  /** Ingredient ids or earlier step ids this step combines. */
  uses: string[];
  /** Short verb phrase for the table cell, e.g. "Roast". */
  do: string;
  /** The full instruction, ideally with a cue for when it's done. */
  detail?: string;
  /** Minutes, or a [shortest, longest] range. */
  minutes?: number | [number, number];
  /** Hands-off time: rising, roasting, simmering with the lid on. */
  wait?: boolean;
  heat?: string;
  /** What the step produces, used when later steps refer to it, e.g. "squash purée". */
  result?: string;
}

export interface RecipeEquipment {
  name: string;
  /** What to set out when the recipe is doubled, e.g. "two 34 × 24 cm baking dishes". */
  doubled?: string;
}

export interface RecipeMeanwhile {
  do: string;
  /** The step during which to do it. */
  during: string;
}

/** Problems that would make the table lie. The content schema turns these into build errors. */
export function checkRecipe(
  ingredients: RecipeIngredient[],
  steps: RecipeStep[],
  meanwhile: RecipeMeanwhile[] = []
): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const { id } of [...ingredients, ...steps]) {
    if (ids.has(id)) problems.push(`"${id}" is used as an id twice.`);
    ids.add(id);
  }

  const available = new Set(ingredients.map((ingredient) => ingredient.id));
  const takenBy = new Map<string, string>();
  for (const step of steps) {
    for (const input of step.uses) {
      if (!ids.has(input)) {
        problems.push(
          `Step "${step.id}" uses "${input}", which is neither an ingredient nor a step.`
        );
      } else if (!available.has(input)) {
        problems.push(
          `Step "${step.id}" uses "${input}" before it exists; list steps in cooking order.`
        );
      }
      const earlier = takenBy.get(input);
      if (earlier) {
        problems.push(
          `"${input}" goes into both "${earlier}" and "${step.id}"; list it twice instead.`
        );
      }
      takenBy.set(input, step.id);
    }
    available.add(step.id);
  }

  for (const { id } of ingredients) {
    if (!takenBy.has(id)) problems.push(`Ingredient "${id}" is never used.`);
  }
  const stepIds = new Set(steps.map((step) => step.id));
  for (const task of meanwhile) {
    if (!stepIds.has(task.during)) {
      problems.push(`"${task.do}" happens during "${task.during}", which is not a step.`);
    }
  }
  return problems;
}

export interface RecipeCell {
  step: RecipeStep;
  /** Position in cooking order. */
  index: number;
  /** 1 is the first column after the ingredients. */
  col: number;
  row: number;
  rowSpan: number;
}

export interface RecipeGrid {
  /** Ingredients in the order they go in. */
  rows: RecipeIngredient[];
  columns: number;
  cells: RecipeCell[];
  /** Ingredient id → index of the step that takes it. */
  takenAt: Map<string, number>;
}

/** Where a step (or ingredient) sits: its first and last row, and its column. */
interface Placement {
  first: number;
  last: number;
  col: number;
}

/** Blank runs know their first column, so the table can lead each ingredient to its step. */
export type GridEntry =
  { kind: 'step'; cell: RecipeCell } | { kind: 'empty'; col: number; span: number };

/** Places every step in the table. Assumes checkRecipe found nothing. */
export function layOut(ingredients: RecipeIngredient[], steps: RecipeStep[]): RecipeGrid {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const indexOf = new Map(steps.map((step, index) => [step.id, index]));
  const consumed = new Set(steps.flatMap((step) => step.uses));

  const rows: RecipeIngredient[] = [];
  const takenAt = new Map<string, number>();
  const placed = new Map<string, Placement>();

  // Walking each finished dish back to its ingredients orders the rows by first use and
  // keeps every step's rows contiguous.
  const visit = (id: string): Placement => {
    const ingredient = ingredientById.get(id);
    if (ingredient) {
      rows.push(ingredient);
      return { first: rows.length - 1, last: rows.length - 1, col: 0 };
    }
    const step = stepById.get(id);
    if (!step) throw new Error(`Unknown recipe input "${id}"`);
    let first = Infinity;
    let last = -Infinity;
    let col = 0;
    for (const input of step.uses) {
      const child = visit(input);
      if (ingredientById.has(input)) takenAt.set(input, indexOf.get(step.id) ?? 0);
      first = Math.min(first, child.first);
      last = Math.max(last, child.last);
      col = Math.max(col, child.col);
    }
    const position = { first, last, col: col + 1 };
    placed.set(id, position);
    return position;
  };
  for (const step of steps) {
    if (!consumed.has(step.id)) visit(step.id);
  }

  const cells = steps.map((step, index) => {
    const { first, last, col } = placed.get(step.id) ?? { first: 0, last: 0, col: 1 };
    return { step, index, col, row: first, rowSpan: last - first + 1 };
  });
  return { rows, columns: Math.max(0, ...cells.map((cell) => cell.col)), cells, takenAt };
}

/** The table cells that begin in a row, with blank runs merged. */
export function rowEntries(grid: RecipeGrid, row: number): GridEntry[] {
  const entries: GridEntry[] = [];
  for (let col = 1; col <= grid.columns; col++) {
    const starting = grid.cells.find((cell) => cell.col === col && cell.row === row);
    if (starting) {
      entries.push({ kind: 'step', cell: starting });
      continue;
    }
    const covered = grid.cells.some(
      (cell) => cell.col === col && cell.row < row && row < cell.row + cell.rowSpan
    );
    if (covered) continue;
    const last = entries.at(-1);
    if (last?.kind === 'empty' && last.col + last.span === col) last.span += 1;
    else entries.push({ kind: 'empty', col, span: 1 });
  }
  return entries;
}

const longest = (minutes?: number | [number, number]) =>
  minutes === undefined ? 0 : Array.isArray(minutes) ? minutes[1] : minutes;

/**
 * When each step can start, in minutes from the moment you begin: after the prep, once
 * everything it uses is done. Ranges count at their longest, so the plan holds.
 */
export function startTimes(steps: RecipeStep[], prepMinutes = 0): Map<string, number> {
  const start = new Map<string, number>();
  const finish = new Map<string, number>();
  for (const step of steps) {
    const at = Math.max(prepMinutes, ...step.uses.map((input) => finish.get(input) ?? 0));
    start.set(step.id, at);
    finish.set(step.id, at + longest(step.minutes));
  }
  return start;
}

/**
 * Hands-on time and time until it's ready, computed rather than estimated. Waiting steps
 * overlap with whatever else can happen; the total is the longest chain of steps.
 */
export function timing(steps: RecipeStep[], prepMinutes = 0) {
  const start = startTimes(steps, prepMinutes);
  let active = prepMinutes;
  let chain = prepMinutes;
  for (const step of steps) {
    const own = longest(step.minutes);
    if (!step.wait) active += own;
    chain = Math.max(chain, (start.get(step.id) ?? 0) + own);
  }
  return { active, total: Math.max(chain, active) };
}

/** "0:10", "3:28": a kitchen clock started when you begin. */
export function formatClock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Running text, or an amount written into it, e.g. the "{180 ml}" in "up to {180 ml}". */
export type TextPart =
  { kind: 'text'; text: string } | { kind: 'amount'; amount: number; unit?: string };

/** Splits text around braced amounts, so notes scale with the recipe. */
export function splitAmounts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let rest = 0;
  for (const match of text.matchAll(/\{(\d+(?:\.\d+)?)\s*([^}\s]*)\}/g)) {
    if (match.index > rest) parts.push({ kind: 'text', text: text.slice(rest, match.index) });
    parts.push({ kind: 'amount', amount: Number(match[1]), unit: match[2] || undefined });
    rest = match.index + match[0].length;
  }
  if (rest < text.length) parts.push({ kind: 'text', text: text.slice(rest) });
  return parts;
}

/** "25 min", "8–10 min", "1 h", "1 h 30 min". */
export function formatStepTime(minutes?: number | [number, number]): string {
  if (minutes === undefined) return '';
  if (Array.isArray(minutes)) return `${minutes[0]}–${minutes[1]} min`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

const QUARTERS = ['', '¼', '½', '¾'];

/** "40 minutes", "about 3½ hours". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const quarters = Math.round(minutes / 15);
  const hours = Math.floor(quarters / 4);
  const glyph = QUARTERS[quarters % 4] ?? '';
  const plural = hours > 1 || (hours === 1 && glyph) ? 'hours' : 'hour';
  return `about ${hours}${glyph} ${plural}`;
}

const METRIC = new Set(['g', 'kg', 'ml', 'l']);
const FRACTIONS: [number, string][] = [
  [0, ''],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [1, ''],
];

/**
 * Scaled amounts stay honest: grams round to what a kitchen scale shows, spoons and
 * pieces to the fractions people actually measure.
 */
export function formatAmount(amount: number, unit = ''): string {
  if (METRIC.has(unit)) {
    let value = amount;
    let shown = unit;
    if ((unit === 'g' || unit === 'ml') && amount >= 1000) {
      value = amount / 1000;
      shown = unit === 'g' ? 'kg' : 'l';
    }
    const rounded =
      shown === 'kg' || shown === 'l'
        ? Math.round(value * 10) / 10
        : value >= 100
          ? Math.round(value / 5) * 5
          : value >= 10
            ? Math.round(value)
            : Math.round(value * 2) / 2;
    return `${rounded} ${shown}`;
  }

  let whole = Math.floor(amount);
  const remainder = amount - whole;
  const [value, glyph] = FRACTIONS.reduce((best, candidate) =>
    Math.abs(candidate[0] - remainder) < Math.abs(best[0] - remainder) ? candidate : best
  );
  if (value === 1) whole += 1;
  const fraction = whole === 0 && !glyph && amount > 0 ? '¼' : glyph;
  const number = whole === 0 && fraction ? fraction : `${whole}${fraction}`;
  return unit
    ? `${number} ${whole > 1 || (whole === 1 && fraction) ? plural(unit) : unit}`
    : number;
}

const ABBREVIATED = new Set(['tsp', 'tbsp', 'oz', 'lb', 'fl oz']);

/** "2 bags", "3 pinches"; abbreviations stay as they are. */
function plural(unit: string): string {
  if (ABBREVIATED.has(unit) || unit.endsWith('s')) return unit;
  return /(ch|sh|x)$/.test(unit) ? `${unit}es` : `${unit}s`;
}
