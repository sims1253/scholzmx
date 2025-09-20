/**
 * Doodad System Configuration
 *
 * This file contains all the configuration for the StackedCard doodad system.
 * The system uses probability-based selection with category-level gating,
 * exclusivity rules, layer compatibility, and item-level conflicts.
 *
 * Architecture:
 * - Categories: Group related doodads (primaryAccents, svgDoodles, etc.)
 * - Items: Individual doodads within categories with their own probabilities
 * - Exclusivity: Some categories only allow one item to be selected
 * - Conflicts: Items can prevent other items from being selected
 * - Layer compatibility: Items can be restricted to single/multi layer cards
 *
 * Probability Semantics:
 * - Category probability: Bernoulli roll to enable the entire category (0.0-1.0)
 * - Exclusive categories: Item "probability" values are WEIGHTS for weighted selection
 *   Example: primaryAccents has 80% gate, then weighted pick among items (0.5:0.3:0.4 ratio)
 * - Non-exclusive categories: Item probabilities are independent Bernoulli rolls (0.0-1.0)
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

// Discriminated union for different doodad kinds
export type DoodadItem = {
  id: string;
  probability: number;
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
  probability: number;
  exclusive?: boolean; // Only one item from this category can be active
  items: DoodadItem[];
}

export interface DoodadProps {
  active?: boolean;
  [key: string]: any;
}

export interface DoodadResults {
  [itemId: string]: DoodadProps;
}

// Configuration
export const doodadCategories: DoodadCategory[] = [
  {
    id: 'primaryAccents',
    enabled: true,
    probability: 0.8, // Testing: increased to 80%
    exclusive: true, // Only one primary accent per card
    items: [
      {
        id: 'bookmarkRibbon',
        probability: 0.5, // Testing: increased chance
        layerTypes: ['all'],
        kind: 'element',
        generate: ({ pick }) => ({ side: pick(0.5) ? 'right' : 'left' }),
      },
      {
        id: 'tapeCorners',
        probability: 0.3, // Testing: reduced to make room for others
        layerTypes: ['all'],
        kind: 'element',
      },
      {
        id: 'tab',
        probability: 0.4, // Testing: much higher chance
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
        probability: 1.0,
        layerTypes: ['single'],
        kind: 'element',
      },
      {
        id: 'spriteOrnament',
        probability: 1.0,
        layerTypes: ['multi'],
        kind: 'element',
        generate: ({ betweenInt }) => ({ variant: betweenInt(0, 3) }),
      },
    ],
  },
  {
    id: 'svgDoodles',
    enabled: true,
    probability: 0.5, // Testing: increased to 50%
    exclusive: true, // Only one SVG doodle per card for cleaner visuals
    items: [
      {
        id: 'berries',
        probability: 0.2,
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
        probability: 0.2,
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
        probability: 0.2,
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
        probability: 0.2,
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
        probability: 0.2,
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
        probability: 1.0,
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
        probability: 0.6,
        layerTypes: ['all'],
        kind: 'element',
        conflicts: ['stickerBL'], // Prevent both stickers on same card
      },
      {
        id: 'stickerBL',
        probability: 0.6,
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
        probability: 0.4,
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
        probability: 0.3,
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
        probability: 0.3,
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
