/**
 * Doodad System Configuration
 *
 * This file contains all the configuration for the StackedCard doodad system.
 * The system uses explicit selection semantics with category-level gating,
 * exclusivity rules, layer compatibility, and item-level conflicts.
 *
 * Architecture:
 * - Categories: Group related doodads (primaryAccents, svgDoodles, etc.)
 * - Items: Individual doodads within categories with explicit selection semantics
 * - Exclusivity: Some categories only allow one item to be selected
 * - Conflicts: Items can prevent other items from being selected
 * - Layer compatibility: Items can be restricted to single/multi layer cards
 *
 * Selection Semantics (Explicit):
 * - Category probability: Bernoulli roll to enable the entire category (0.0-1.0)
 * - Exclusive categories with Weighted: Items are selected by weighted random choice
 *   Example: primaryAccents has 80% gate, then weighted pick among items (0.5:0.3:0.4 ratio)
 *   Selection probability of item i = weight_i / sum(all_weights)
 * - Exclusive categories with Probabilistic: Items are tested in order, first to succeed wins
 *   Example: First test item A (50% chance), if passes, skip others; else test B (30% chance)
 * - Non-exclusive categories with Probabilistic: Each item rolls independently (0.0-1.0)
 *   Example: stickers can have both TR and BL active if both roll succeed
 *
 * Conflict Resolution:
 * - Order-dependent: Earlier categories/items win conflicts
 * - Global conflict tracking prevents conflicting items across categories
 * - Items are processed in the order they appear in the categories array
 * - Within categories, items are processed in order for exclusive selection
 */

// Base types for improved type safety
export type Position = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';

/**
 * Doodad item selection semantics.
 * - weighted: Items compete with weights, normalized for probability (exclusive only)
 * - probabilistic: Items are independently tested with probability 0-1
 */
export type DoodadSelection =
  | { kind: 'weighted'; weight: number }
  | { kind: 'probabilistic'; probability: number };

// Discriminated union for different doodad kinds
export type DoodadItem = {
  id: string;
  selection: DoodadSelection; // Explicit selection semantics
  layerTypes: ('single' | 'multi' | 'all')[];
  conflicts?: string[];
  generate?: (rng: {
    random: () => number;
    pick: (p: number) => boolean;
    map: (min: number, max: number) => number;
    betweenInt: (min: number, max: number) => number;
  }) => DoodadProps;
} & (
  | {
      kind: 'svg';
      src: string;
      defaultSize?: string;
      positions?: Position[];
    }
  | {
      kind: 'element';
      src?: never;
      defaultSize?: never;
      positions?: never;
    }
  | {
      kind: 'background';
      src?: never;
      defaultSize?: never;
      positions?: never;
    }
);

export interface DoodadCategory {
  id: string;
  enabled: boolean;
  probability: number; // Category-level Bernoulli gate
  exclusive?: boolean; // Only one item from this category can be active
  items: DoodadItem[];
}

export interface DoodadProps {
  active?: boolean;
  side?: 'left' | 'right';
  variant?: number;
  position?: Position;
  rotation?: number;
  scale?: number;
  washX?: number;
  washY?: number;
  washAlpha?: number;
  washTx?: number;
  washTy?: number;
  washR1?: number;
  washR2?: number;
  washX2?: number;
  washY2?: number;
  washBleed?: number;
  ringScale?: number;
  ringAlpha?: number;
}

export interface DoodadResults {
  [itemId: string]: DoodadProps;
}

// ============================================
// StackedCard Layout Configuration
// ============================================

/**
 * Layer count distribution thresholds (cumulative)
 *
 * These thresholds control the probability distribution for how many
 * visual "paper layers" appear stacked behind the card:
 * - 15% chance: single sheet (no depth)
 * - 45% chance: 2 layers (subtle depth)
 * - 30% chance: 3 layers (moderate depth)
 * - 10% chance: 4 layers (maximum depth)
 *
 * The distribution favors 2-3 layers as the most visually balanced.
 */
export const LAYER_THRESHOLDS = {
  /** 15% chance of single layer */
  SINGLE: 0.15,
  /** 60% cumulative (45% chance of 2 layers) */
  DOUBLE: 0.6,
  /** 90% cumulative (30% chance of 3 layers) */
  TRIPLE: 0.9,
} as const;

// ============================================
// Doodad Categories Configuration
// ============================================

export const doodadCategories: DoodadCategory[] = [
  {
    id: 'primaryAccents',
    enabled: true,
    probability: 0.95,
    exclusive: true, // Only one primary accent per card
    items: [
      {
        id: 'bookmarkRibbon',
        selection: { kind: 'weighted', weight: 0.4 },
        layerTypes: ['all'],
        kind: 'element',
        generate: ({ pick }) => ({ side: pick(0.5) ? 'right' : 'left' }),
      },
      {
        id: 'tapeCorners',
        selection: { kind: 'weighted', weight: 0.3 },
        layerTypes: ['all'],
        kind: 'element',
      },
      {
        id: 'tab',
        selection: { kind: 'weighted', weight: 0.4 },
        layerTypes: ['single'],
        kind: 'element',
      },
    ],
  },
  {
    id: 'doodles',
    enabled: true, // Controlled by ornament prop
    probability: 0.4,
    items: [
      {
        id: 'leafDoodle',
        selection: { kind: 'probabilistic', probability: 1.0 },
        layerTypes: ['single'],
        kind: 'element',
      },
      {
        id: 'spriteOrnament',
        selection: { kind: 'probabilistic', probability: 1.0 },
        layerTypes: ['multi'],
        kind: 'element',
        generate: ({ betweenInt }) => ({ variant: betweenInt(0, 3) }),
      },
    ],
  },
  {
    id: 'svgDoodles',
    enabled: true,
    probability: 0.7, // Increased to 70% for better visual consistency
    exclusive: true, // Only one SVG doodle per card for cleaner visuals
    items: [
      {
        id: 'berries',
        selection: { kind: 'weighted', weight: 0.2 },
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-berries.svg',
        defaultSize: '1.8rem',
        positions: ['topRight', 'topLeft'],
        generate: ({ pick, map }) => ({
          position: pick(0.5) ? 'topRight' : 'topLeft',
          rotation: Math.round(map(-15, 15)),
        }),
      },
      {
        id: 'fern',
        selection: { kind: 'weighted', weight: 0.2 },
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-fern.svg',
        defaultSize: '2.2rem',
        positions: ['bottomLeft', 'bottomRight'],
        generate: ({ pick, map }) => ({
          position: pick(0.5) ? 'bottomLeft' : 'bottomRight',
          rotation: Math.round(map(-20, 20)),
        }),
      },
      {
        id: 'lavender',
        selection: { kind: 'weighted', weight: 0.2 },
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-flower-lavender.svg',
        defaultSize: '1.6rem',
        positions: ['center', 'topLeft', 'topRight'],
        generate: ({ pick, map }) => ({
          position: pick(0.3) ? 'center' : pick(0.5) ? 'topLeft' : 'topRight',
          rotation: Math.round(map(-12, 12)),
        }),
      },
      {
        id: 'old-key',
        selection: { kind: 'weighted', weight: 0.2 },
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-old-key.svg',
        defaultSize: '2.5rem',
        positions: ['center'],
        generate: ({ map }) => ({
          position: 'center',
          rotation: Math.round(map(-25, 25)),
          scale: map(0.8, 1.1),
        }),
      },
      {
        id: 'seed-pod',
        selection: { kind: 'weighted', weight: 0.2 },
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-seed-pod.svg',
        defaultSize: '1.9rem',
        positions: ['bottomLeft', 'bottomRight'],
        generate: ({ pick, map }) => ({
          position: pick(0.5) ? 'bottomLeft' : 'bottomRight',
          rotation: Math.round(map(-18, 18)),
        }),
      },
    ],
  },
  {
    id: 'shapes',
    enabled: true,
    probability: 0.25,
    items: [
      {
        id: 'circleBookmark',
        selection: { kind: 'probabilistic', probability: 1.0 },
        layerTypes: ['single'],
        kind: 'element',
      },
    ],
  },
  {
    id: 'stickers',
    enabled: true,
    probability: 0.2, // 20% chance stickers appear
    items: [
      {
        id: 'stickerTR',
        selection: { kind: 'probabilistic', probability: 0.6 },
        layerTypes: ['all'],
        kind: 'element',
        conflicts: ['stickerBL'], // Prevent both stickers on same card
      },
      {
        id: 'stickerBL',
        selection: { kind: 'probabilistic', probability: 0.6 },
        layerTypes: ['all'],
        kind: 'element',
        conflicts: ['stickerTR'],
      },
    ],
  },
  {
    id: 'backgroundEffects',
    enabled: true,
    probability: 0.3, // 30% chance for background effects
    exclusive: true, // Only one background effect per card
    items: [
      {
        id: 'washSubtle',
        selection: { kind: 'weighted', weight: 0.4 },
        layerTypes: ['all'],
        kind: 'background',
        generate: ({ map }) => ({
          washX: map(35, 65),
          washY: map(30, 60),
          washAlpha: map(0.4, 0.6),
          washTx: Math.round(map(-12, 12)),
          washTy: Math.round(map(-10, 10)),
          washR1: Math.round(map(70, 100)),
          washR2: Math.round(map(50, 80)),
          washX2: Math.round(Math.max(10, Math.min(90, map(35, 65) + map(-15, 15)))),
          washY2: Math.round(Math.max(10, Math.min(90, map(30, 60) + map(-10, 10)))),
          washBleed: Math.round(map(110, 140)),
        }),
      },
      {
        id: 'washBold',
        selection: { kind: 'weighted', weight: 0.3 },
        layerTypes: ['all'],
        kind: 'background',
        generate: ({ map }) => ({
          washX: map(25, 75),
          washY: map(20, 70),
          washAlpha: map(0.7, 0.9),
          washTx: Math.round(map(-18, 18)),
          washTy: Math.round(map(-14, 14)),
          washR1: Math.round(map(90, 130)),
          washR2: Math.round(map(70, 110)),
          washX2: Math.round(Math.max(10, Math.min(90, map(25, 75) + map(-20, 20)))),
          washY2: Math.round(Math.max(10, Math.min(90, map(20, 70) + map(-15, 15)))),
          washBleed: Math.round(map(130, 170)),
        }),
      },
      {
        id: 'ringEffect',
        selection: { kind: 'weighted', weight: 0.1 },
        layerTypes: ['all'],
        kind: 'background',
        generate: ({ map }) => ({
          ringScale: map(0.8, 1.0),
          ringAlpha: map(0.15, 0.3),
        }),
      },
    ],
  },
];
