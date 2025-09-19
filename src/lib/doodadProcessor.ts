/**
 * Doodad Processing System
 *
 * Handles the probability-based selection and processing of doodads
 * based on the configuration system.
 */

import type { DoodadCategory, DoodadResults, DoodadProps } from '../config/doodadConfig';

export interface RngFunctions {
  random: () => number;
  pick: (probability: number) => boolean;
  map: (min: number, max: number) => number;
  betweenInt: (min: number, max: number) => number;
}

/**
 * Process doodad categories to determine which items should be active
 *
 * @param categories - Array of doodad categories to process
 * @param isSheet - Whether this is a single-layer card
 * @param allowBookmark - Whether bookmarks are allowed (prop restriction)
 * @param allowTape - Whether tape corners are allowed (prop restriction)
 * @param ornament - Whether ornament doodles are enabled (prop restriction)
 * @param rng - Random number generation functions
 * @returns Object mapping item IDs to their properties
 */
export function processDoodadCategories(
  categories: DoodadCategory[],
  isSheet: boolean,
  allowBookmark: boolean,
  allowTape: boolean,
  ornament: boolean,
  rng: RngFunctions
): DoodadResults {
  const { random, pick, map, betweenInt } = rng;
  const results: DoodadResults = {};
  const activatedItems: string[] = [];

  for (const category of categories) {
    // Check category enablement and prop restrictions
    let categoryEnabled = category.enabled;
    if (category.id === 'doodles') {
      categoryEnabled = categoryEnabled && ornament;
    }

    // Category-level probability gate
    if (!categoryEnabled || !pick(category.probability)) continue;

    // Filter items by layer compatibility and prop restrictions
    let availableItems = category.items.filter((item) => {
      // Layer compatibility check
      const layerCompatible =
        item.layerTypes.includes('all') ||
        (isSheet && item.layerTypes.includes('single')) ||
        (!isSheet && item.layerTypes.includes('multi'));

      // Prop-based restrictions
      if (item.id === 'bookmarkRibbon' && !allowBookmark) return false;
      if (item.id === 'tapeCorners' && !allowTape) return false;

      // Conflict check (order-dependent: earlier items win)
      if (item.conflicts?.some((conflictId) => activatedItems.includes(conflictId))) return false;

      return layerCompatible;
    });

    if (availableItems.length === 0) continue;

    if (category.exclusive) {
      // Exclusive category: select one item using weighted probability
      const totalWeight = availableItems.reduce((sum, item) => sum + item.probability, 0);
      let randomWeight = random() * totalWeight;

      for (const item of availableItems) {
        randomWeight -= item.probability;
        if (randomWeight <= 0) {
          const params = item.generate ? item.generate({ random, pick, map, betweenInt }) : {};
          results[item.id] = { active: true, ...params };
          activatedItems.push(item.id);
          break;
        }
      }
    } else {
      // Non-exclusive category: each item rolls independently
      for (const item of availableItems) {
        if (pick(item.probability)) {
          const params = item.generate ? item.generate({ random, pick, map, betweenInt }) : {};
          results[item.id] = { active: true, ...params };
          activatedItems.push(item.id);
        }
      }
    }
  }

  return results;
}

/**
 * Extract items of a specific kind from doodad results
 *
 * @param results - Processed doodad results
 * @param categories - Original categories (for metadata lookup)
 * @param kind - Kind of items to extract ('svg', 'element', 'background')
 * @returns Array of active items with their metadata
 */
export function extractDoodadsByKind(
  results: DoodadResults,
  categories: DoodadCategory[],
  kind: 'svg' | 'element' | 'background'
) {
  const itemsOfKind = [];

  // Build lookup map for item metadata
  const itemLookup = new Map();
  for (const category of categories) {
    for (const item of category.items) {
      itemLookup.set(item.id, item);
    }
  }

  // Extract active items of the specified kind
  for (const [itemId, props] of Object.entries(results)) {
    if (!props.active) continue;

    const itemDef = itemLookup.get(itemId);
    if (itemDef && itemDef.kind === kind) {
      itemsOfKind.push({
        id: itemId,
        definition: itemDef,
        props: props,
      });
    }
  }

  return itemsOfKind;
}
