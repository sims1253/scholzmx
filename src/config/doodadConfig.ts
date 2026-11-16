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
export type Position = 'bottomLeft' | 'bottomRight';

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
  side?: 'left' | 'right';
  variant?: number;
  position?: Position;
  rotation?: number;
  scale?: number;
  ringScale?: number;
  ringAlpha?: number;
  ringX?: number;
  ringY?: number;
}

export interface DoodadResults {
  [itemId: string]: DoodadProps;
}

// Configuration
export const doodadCategories: DoodadCategory[] = [
  {
    id: 'primaryAccents',
    enabled: true,
    probability: 0.95,
    exclusive: true, // Only one primary accent per card
    items: [
      {
        id: 'bookmarkRibbon',
        probability: 0.4,
        layerTypes: ['all'],
        kind: 'element',
        generate: ({ pick }) => ({ side: pick(0.5) ? 'right' : 'left' }),
      },
      {
        id: 'tapeCorners',
        probability: 0.3,
        layerTypes: ['all'],
        kind: 'element',
      },
      {
        id: 'tab',
        probability: 0.4,
        layerTypes: ['single'],
        kind: 'element',
      },
    ],
  },
  {
    id: 'svgDoodles',
    enabled: true, // Controlled by the ornament prop
    // Each doodle is pressed between the sheets and peeks out at a bottom edge, so it
    // can never sit on the card's words.
    probability: 0.7, // Increased to 70% for better visual consistency
    exclusive: true, // Only one SVG doodle per card for cleaner visuals
    // Doodles keep to the right-hand corners, where no title, excerpt or tag starts.
    // The unused rolls stay so every card's other doodads keep their seeded draw.
    items: [
      {
        id: 'berries',
        probability: 0.2,
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-berries.svg',
        defaultSize: '1.8rem',
        positions: ['bottomLeft', 'bottomRight'],
        generate: ({ pick, map }) => ({
          position: pick(0.5) ? 'bottomLeft' : 'bottomRight',
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
        positions: ['bottomRight'],
        generate: ({ pick, map }) => {
          pick(0.5); // The draw that used to choose a side.
          return { position: 'bottomRight', rotation: Math.round(map(-20, 20)) };
        },
      },
      {
        id: 'lavender',
        probability: 0.2,
        layerTypes: ['all'],
        kind: 'svg',
        src: '/doodles/doodle-flower-lavender.svg',
        defaultSize: '1.6rem',
        positions: ['bottomRight', 'bottomLeft'],
        generate: ({ pick, map }) => ({
          position: pick(0.3) || pick(0.5) ? 'bottomRight' : 'bottomLeft',
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
        positions: ['bottomRight'],
        generate: ({ map }) => ({
          position: 'bottomRight',
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
        positions: ['bottomRight'],
        generate: ({ pick, map }) => {
          pick(0.5); // The draw that used to choose a side.
          return { position: 'bottomRight', rotation: Math.round(map(-18, 18)) };
        },
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
    // Cards keep only the coffee rings as a background effect.
    // The ring is the only item left, so this is its rate: about 4% of cards, as before.
    probability: 0.04,
    exclusive: true, // Only one background effect per card
    items: [
      {
        id: 'ringEffect',
        probability: 0.1,
        layerTypes: ['all'],
        kind: 'background',
        // The mug was set down beside the card and caught only a corner of it: the
        // ring's centre lies off the sheet, so just an arc crosses its corner.
        generate: ({ map, betweenInt }) => {
          betweenInt(0, 2); // The draw that used to choose an edge.
          return {
            ringScale: map(0.6, 0.75),
            ringAlpha: map(0.15, 0.3),
            ringX: map(110, 116), // Bottom right, clear of the left-set footer line
            ringY: map(108, 116),
            rotation: map(0, 360),
            variant: betweenInt(1, 3),
          };
        },
      },
    ],
  },
];
