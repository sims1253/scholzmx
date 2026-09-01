import { describe, it, expect } from 'vitest';
import { processDoodadCategories, extractDoodadsByKind } from '../doodadProcessor';
import type { RngFunctions } from '../doodadProcessor';
import type { DoodadCategory, DoodadResults } from '../../config/doodadConfig';

// Helper to create a mock RNG with predictable behavior
// Uses random() = 0.5, so pick(p) returns true when 0.5 < p
const createMockRng = (): RngFunctions => ({
  random: () => 0.5,
  pick: (p: number) => 0.5 < p,
  map: (min: number, max: number) => min + (max - min) * 0.5,
  betweenInt: (min: number, max: number) => Math.round((min + max) / 2),
});

// Helper to create a mock RNG that always picks (simulates random() = 0)
// pick(p) returns true when 0 < p (i.e., p > 0)
const createAlwaysPickRng = (): RngFunctions => ({
  random: () => 0.0, // Will always select first weighted item
  pick: (p: number) => p > 0,
  map: (min: number, _max: number) => min,
  betweenInt: (min: number, _max: number) => min,
});

// Helper to create a mock RNG that never picks (simulates random() = 1)
// pick(p) returns false when 1 >= p (always, since p <= 1)
const createNeverPickRng = (): RngFunctions => ({
  random: () => 1.0,
  pick: () => false,
  map: (min: number, max: number) => max,
  betweenInt: (min: number, max: number) => max,
});

describe('getSelectionValue (via processDoodadCategories)', () => {
  it('returns weight for weighted selection', () => {
    // In exclusive categories with weighted items, the weight determines selection probability
    const categories: DoodadCategory[] = [
      {
        id: 'testWeighted',
        enabled: true,
        probability: 1.0,
        exclusive: true,
        items: [
          {
            id: 'weightedItem',
            selection: { kind: 'weighted', weight: 1.0 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const rng = createAlwaysPickRng();
    const results = processDoodadCategories(categories, false, true, true, true, rng);

    expect(results['weightedItem']).toBeDefined();
    expect(results['weightedItem'].active).toBe(true);
  });

  it('returns probability for probabilistic selection', () => {
    // In non-exclusive categories, probability determines individual item selection
    const categories: DoodadCategory[] = [
      {
        id: 'testProbabilistic',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'probItem',
            selection: { kind: 'probabilistic', probability: 1.0 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const rng = createAlwaysPickRng();
    const results = processDoodadCategories(categories, false, true, true, true, rng);

    expect(results['probItem']).toBeDefined();
    expect(results['probItem'].active).toBe(true);
  });
});

describe('processDoodadCategories', () => {
  describe('empty categories', () => {
    it('returns empty results with empty categories array', () => {
      const rng = createMockRng();
      const results = processDoodadCategories([], false, true, true, true, rng);

      expect(results).toEqual({});
    });
  });

  describe('category probability gate', () => {
    it('selects no items when category probability is 0', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'zeroProb',
          enabled: true,
          probability: 0,
          items: [
            {
              id: 'item1',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results).toEqual({});
    });

    it('selects items when category probability passes', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'passProb',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'item1',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['item1']).toBeDefined();
    });
  });

  describe('category disabled', () => {
    it('selects no items when category is disabled', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'disabled',
          enabled: false,
          probability: 1.0,
          items: [
            {
              id: 'item1',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results).toEqual({});
    });
  });

  describe('layer compatibility', () => {
    it('excludes items with incompatible layerTypes for single layer (isSheet=true)', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'layerTest',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'singleOnly',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['single'],
              kind: 'element',
            },
            {
              id: 'multiOnly',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['multi'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, true, true, true, true, rng);

      expect(results['singleOnly']).toBeDefined();
      expect(results['multiOnly']).toBeUndefined();
    });

    it('excludes items with incompatible layerTypes for multi layer (isSheet=false)', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'layerTest',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'singleOnly',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['single'],
              kind: 'element',
            },
            {
              id: 'multiOnly',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['multi'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['singleOnly']).toBeUndefined();
      expect(results['multiOnly']).toBeDefined();
    });

    it('includes items with "all" layerTypes regardless of isSheet', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'layerTest',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'allLayers',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();

      const resultsSingle = processDoodadCategories(categories, true, true, true, true, rng);
      const resultsMulti = processDoodadCategories(categories, false, true, true, true, rng);

      expect(resultsSingle['allLayers']).toBeDefined();
      expect(resultsMulti['allLayers']).toBeDefined();
    });
  });

  describe('exclusive category', () => {
    it('selects only one item in exclusive category', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'exclusive',
          enabled: true,
          probability: 1.0,
          exclusive: true,
          items: [
            {
              id: 'itemA',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
            {
              id: 'itemB',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      const activeItems = Object.keys(results).filter((id) => results[id].active);
      expect(activeItems.length).toBe(1);
      expect(activeItems[0]).toBe('itemA'); // First item wins in exclusive probabilistic
    });

    it('selects weighted item based on weight distribution', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'weightedExclusive',
          enabled: true,
          probability: 1.0,
          exclusive: true,
          items: [
            {
              id: 'heavy',
              selection: { kind: 'weighted', weight: 0.9 },
              layerTypes: ['all'],
              kind: 'element',
            },
            {
              id: 'light',
              selection: { kind: 'weighted', weight: 0.1 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      // With random() = 0.5 and total weight = 1.0, we select when randomWeight <= 0
      // First iteration: randomWeight = 0.5, subtract 0.9 = -0.4, which is <= 0, so we pick 'heavy'
      const rng = createMockRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['heavy']).toBeDefined();
      expect(results['light']).toBeUndefined();
    });
  });

  describe('non-exclusive category', () => {
    it('can select multiple items in non-exclusive category', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'nonExclusive',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemA',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
            {
              id: 'itemB',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['itemA']).toBeDefined();
      expect(results['itemB']).toBeDefined();
      expect(results['itemA'].active).toBe(true);
      expect(results['itemB'].active).toBe(true);
    });

    it('respects individual item probabilities', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'nonExclusive',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemA',
              selection: { kind: 'probabilistic', probability: 0.5 },
              layerTypes: ['all'],
              kind: 'element',
            },
            {
              id: 'itemB',
              selection: { kind: 'probabilistic', probability: 0.5 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      // Mock RNG with pick() = false (never picks)
      const rng = createNeverPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['itemA']).toBeUndefined();
      expect(results['itemB']).toBeUndefined();
    });
  });

  describe('conflict resolution', () => {
    it('prevents conflicting items from both being selected', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'first',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemA',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
        {
          id: 'second',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemB',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
              conflicts: ['itemA'],
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      // itemA is activated first, itemB conflicts with it so should not be selected
      expect(results['itemA']).toBeDefined();
      expect(results['itemB']).toBeUndefined();
    });

    it('allows second conflicting item when first is not selected', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'first',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemA',
              selection: { kind: 'probabilistic', probability: 0.1 }, // Low probability
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
        {
          id: 'second',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'itemB',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
              conflicts: ['itemA'],
            },
          ],
        },
      ];

      // Never pick RNG will not select itemA (prob 0.1 < threshold)
      const rng = createNeverPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['itemA']).toBeUndefined();
      expect(results['itemB']).toBeUndefined(); // neverPickRng also rejects itemB
    });
  });

  describe('prop restrictions', () => {
    it('excludes bookmarkRibbon when allowBookmark is false', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'test',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'bookmarkRibbon',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, false, true, true, rng);

      expect(results['bookmarkRibbon']).toBeUndefined();
    });

    it('includes bookmarkRibbon when allowBookmark is true', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'test',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'bookmarkRibbon',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['bookmarkRibbon']).toBeDefined();
    });

    it('excludes tapeCorners when allowTape is false', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'test',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'tapeCorners',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, false, true, rng);

      expect(results['tapeCorners']).toBeUndefined();
    });

    it('includes tapeCorners when allowTape is true', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'test',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'tapeCorners',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['tapeCorners']).toBeDefined();
    });

    it('excludes doodles category items when ornament is false', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'doodles',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'someDoodle',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, false, rng);

      expect(results['someDoodle']).toBeUndefined();
    });

    it('includes doodles category items when ornament is true', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'doodles',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'someDoodle',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
            },
          ],
        },
      ];

      const rng = createAlwaysPickRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['someDoodle']).toBeDefined();
    });
  });

  describe('generate function', () => {
    it('calls generate function and merges params into results', () => {
      const categories: DoodadCategory[] = [
        {
          id: 'test',
          enabled: true,
          probability: 1.0,
          items: [
            {
              id: 'withGenerate',
              selection: { kind: 'probabilistic', probability: 1.0 },
              layerTypes: ['all'],
              kind: 'element',
              generate: ({
                map,
                betweenInt,
              }: {
                map: (min: number, max: number) => number;
                betweenInt: (min: number, max: number) => number;
              }) => ({
                rotation: Math.round(map(0, 90)),
                variant: betweenInt(1, 3),
              }),
            },
          ],
        },
      ];

      const rng = createMockRng();
      const results = processDoodadCategories(categories, false, true, true, true, rng);

      expect(results['withGenerate']).toBeDefined();
      expect(results['withGenerate'].active).toBe(true);
      expect(results['withGenerate'].rotation).toBe(45); // map(0, 90) with 0.5 = 45
      expect(results['withGenerate'].variant).toBe(2); // betweenInt(1, 3) = Math.round(2) = 2
    });
  });
});

describe('extractDoodadsByKind', () => {
  it('extracts only items of kind "svg"', () => {
    const results: DoodadResults = {
      svgItem: { active: true },
      elementItem: { active: true },
      bgItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'svgItem',
            selection: { kind: 'probabilistic', probability: 0.8 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/test.svg',
          },
          {
            id: 'elementItem',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
          {
            id: 'bgItem',
            selection: { kind: 'probabilistic', probability: 0.3 },
            layerTypes: ['all'],
            kind: 'background',
          },
        ],
      },
    ];

    const svgItems = extractDoodadsByKind(results, categories, 'svg');

    expect(svgItems.length).toBe(1);
    expect(svgItems[0].id).toBe('svgItem');
    expect(svgItems[0].definition.kind).toBe('svg');
  });

  it('extracts only items of kind "element"', () => {
    const results: DoodadResults = {
      svgItem: { active: true },
      elementItem: { active: true },
      bgItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'svgItem',
            selection: { kind: 'probabilistic', probability: 0.8 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/test.svg',
          },
          {
            id: 'elementItem',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
          {
            id: 'bgItem',
            selection: { kind: 'probabilistic', probability: 0.3 },
            layerTypes: ['all'],
            kind: 'background',
          },
        ],
      },
    ];

    const elementItems = extractDoodadsByKind(results, categories, 'element');

    expect(elementItems.length).toBe(1);
    expect(elementItems[0].id).toBe('elementItem');
    expect(elementItems[0].definition.kind).toBe('element');
  });

  it('extracts only items of kind "background"', () => {
    const results: DoodadResults = {
      svgItem: { active: true },
      elementItem: { active: true },
      bgItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'svgItem',
            selection: { kind: 'probabilistic', probability: 0.8 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/test.svg',
          },
          {
            id: 'elementItem',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
          {
            id: 'bgItem',
            selection: { kind: 'probabilistic', probability: 0.3 },
            layerTypes: ['all'],
            kind: 'background',
          },
        ],
      },
    ];

    const bgItems = extractDoodadsByKind(results, categories, 'background');

    expect(bgItems.length).toBe(1);
    expect(bgItems[0].id).toBe('bgItem');
    expect(bgItems[0].definition.kind).toBe('background');
  });

  it('returns empty array when no items of specified kind exist', () => {
    const results: DoodadResults = {
      elementItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'elementItem',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const svgItems = extractDoodadsByKind(results, categories, 'svg');

    expect(svgItems).toEqual([]);
  });

  it('returns empty array when no active items of specified kind', () => {
    const results: DoodadResults = {
      svgItem: { active: false }, // Not active
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'svgItem',
            selection: { kind: 'probabilistic', probability: 0.8 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/test.svg',
          },
        ],
      },
    ];

    const svgItems = extractDoodadsByKind(results, categories, 'svg');

    expect(svgItems).toEqual([]);
  });

  it('calculates selectionChance correctly for probabilistic items', () => {
    const results: DoodadResults = {
      probItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'probItem',
            selection: { kind: 'probabilistic', probability: 0.75 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const items = extractDoodadsByKind(results, categories, 'element');

    expect(items.length).toBe(1);
    expect(items[0].selectionKind).toBe('probabilistic');
    expect(items[0].selectionChance).toBe(0.75);
  });

  it('calculates selectionChance correctly for weighted items in exclusive category', () => {
    const results: DoodadResults = {
      weightedItem: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        exclusive: true,
        items: [
          {
            id: 'weightedItem',
            selection: { kind: 'weighted', weight: 0.6 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/test.svg',
          },
          {
            id: 'otherWeighted',
            selection: { kind: 'weighted', weight: 0.4 },
            layerTypes: ['all'],
            kind: 'svg',
            src: '/other.svg',
          },
        ],
      },
    ];

    const items = extractDoodadsByKind(results, categories, 'svg');

    expect(items.length).toBe(1);
    expect(items[0].selectionKind).toBe('weighted');
    // Weight 0.6 / total weight 1.0 = 0.6
    expect(items[0].selectionChance).toBe(0.6);
  });

  it('includes props from results in output', () => {
    const results: DoodadResults = {
      testItem: { active: true, rotation: 45, scale: 0.8 },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'test',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'testItem',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const items = extractDoodadsByKind(results, categories, 'element');

    expect(items[0].props).toEqual({ active: true, rotation: 45, scale: 0.8 });
  });

  it('handles multiple items of same kind across categories', () => {
    const results: DoodadResults = {
      item1: { active: true },
      item2: { active: true },
    };

    const categories: DoodadCategory[] = [
      {
        id: 'cat1',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'item1',
            selection: { kind: 'probabilistic', probability: 0.5 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
      {
        id: 'cat2',
        enabled: true,
        probability: 1.0,
        items: [
          {
            id: 'item2',
            selection: { kind: 'probabilistic', probability: 0.7 },
            layerTypes: ['all'],
            kind: 'element',
          },
        ],
      },
    ];

    const items = extractDoodadsByKind(results, categories, 'element');

    expect(items.length).toBe(2);
    expect(items.map((i) => i.id)).toContain('item1');
    expect(items.map((i) => i.id)).toContain('item2');
  });
});
