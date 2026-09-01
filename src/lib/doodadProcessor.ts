/**
 * Doodad Processing System
 *
 * Handles the probability-based selection and processing of doodads
 * based on the configuration system with explicit selection semantics.
 */

import type {
  DoodadCategory,
  DoodadItem,
  DoodadProps,
  DoodadResults,
  DoodadSelection,
} from '../config/doodadConfig';

export interface RngFunctions {
  random: () => number;
  pick: (probability: number) => boolean;
  map: (min: number, max: number) => number;
  betweenInt: (min: number, max: number) => number;
}

/**
 * Extract selection value from DoodadSelection based on kind.
 * Returns the probability for probabilistic selection or weight for weighted selection.
 */
function getSelectionValue(selection: DoodadSelection): number {
  return selection.kind === 'weighted' ? selection.weight : selection.probability;
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
      // Exclusive category: select one item
      // Check if any items use weighted selection
      const weightedItems = availableItems.filter((item) => item.selection.kind === 'weighted');

      if (weightedItems.length > 0) {
        // Use weighted selection (only weighted items are eligible)
        const totalWeight = weightedItems.reduce(
          (sum, item) => sum + getSelectionValue(item.selection),
          0
        );
        let randomWeight = random() * totalWeight;

        for (const item of weightedItems) {
          randomWeight -= getSelectionValue(item.selection);
          if (randomWeight <= 0) {
            const params = item.generate ? item.generate({ random, pick, map, betweenInt }) : {};
            results[item.id] = { active: true, ...params };
            activatedItems.push(item.id);
            break;
          }
        }
      } else {
        // Use probabilistic selection (first to succeed wins)
        for (const item of availableItems) {
          const value = getSelectionValue(item.selection);
          if (pick(value)) {
            const params = item.generate ? item.generate({ random, pick, map, betweenInt }) : {};
            results[item.id] = { active: true, ...params };
            activatedItems.push(item.id);
            break;
          }
        }
      }
    } else {
      // Non-exclusive category: each item rolls independently
      for (const item of availableItems) {
        const value = getSelectionValue(item.selection);
        if (pick(value)) {
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
 * This function now respects the explicit selection semantics when calculating
 * selection chances. Items with 'weighted' selection have their probability
 * calculated as weight / total_weights, while 'probabilistic' items use their
 * raw probability directly.
 *
 * @param results - Processed doodad results
 * @param categories - Original categories (for metadata lookup)
 * @param kind - Kind of items to extract ('svg', 'element', 'background')
 * @returns Array of active items with their metadata and calculated selection chances
 */
export function extractDoodadsByKind(
  results: DoodadResults,
  categories: DoodadCategory[],
  kind: 'svg' | 'element' | 'background'
) {
  interface ItemMeta {
    item: DoodadItem;
    category: string;
    categoryExclusive: boolean | undefined;
  }

  const itemsOfKind: Array<{
    id: string;
    definition: DoodadItem;
    props: DoodadProps;
    selectionKind: 'weighted' | 'probabilistic';
    selectionChance: number;
  }> = [];

  const itemLookup = new Map<string, ItemMeta>();
  for (const category of categories) {
    for (const item of category.items) {
      itemLookup.set(item.id, {
        item,
        category: category.id,
        categoryExclusive: category.exclusive,
      });
    }
  }

  // Extract active items of the specified kind
  for (const [itemId, props] of Object.entries(results)) {
    if (!props.active) continue;

    const itemDef = itemLookup.get(itemId);
    if (itemDef && itemDef.item.kind === kind) {
      // Calculate selection chance based on explicit selection kind
      let selectionChance: number;

      if (itemDef.item.selection.kind === 'weighted') {
        // For weighted items, calculate probability as weight / total_weights
        if (itemDef.categoryExclusive) {
          // Find all weighted items in this exclusive category
          const category = categories.find((c) => c.id === itemDef.category);
          const weightedItems =
            category?.items.filter((i) => i.selection.kind === 'weighted') ?? [];
          const totalWeight = weightedItems.reduce(
            (sum, i) => sum + (i.selection.kind === 'weighted' ? i.selection.weight : 0),
            0
          );
          selectionChance =
            (itemDef.item.selection.kind === 'weighted' ? itemDef.item.selection.weight : 0) /
            totalWeight;
        } else {
          // Weighted selection doesn't make sense for non-exclusive
          selectionChance =
            itemDef.item.selection.kind === 'weighted' ? itemDef.item.selection.weight : 0;
        }
      } else {
        // For probabilistic items, use raw probability
        selectionChance =
          itemDef.item.selection.kind === 'probabilistic' ? itemDef.item.selection.probability : 0;
      }

      itemsOfKind.push({
        id: itemId,
        definition: itemDef.item,
        props: props,
        selectionKind: itemDef.item.selection.kind,
        selectionChance,
      });
    }
  }

  return itemsOfKind;
}
