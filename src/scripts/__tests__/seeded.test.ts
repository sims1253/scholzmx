import { describe, it, expect } from 'vitest';
import { hashStringFNV1a, createMulberry32, createSeededRng } from '../seeded';

describe('hashStringFNV1a', () => {
  it('produces consistent hash for same input', () => {
    const hash1 = hashStringFNV1a('test-seed');
    const hash2 = hashStringFNV1a('test-seed');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashStringFNV1a('seed-a');
    const hash2 = hashStringFNV1a('seed-b');
    expect(hash1).not.toBe(hash2);
  });

  it('returns a 32-bit unsigned integer', () => {
    const hash = hashStringFNV1a('any-string');
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });

  it('produces consistent hash for empty string', () => {
    const hash1 = hashStringFNV1a('');
    const hash2 = hashStringFNV1a('');
    expect(hash1).toBe(hash2);
    // Empty string should produce the FNV offset basis
    expect(hash1).toBe(0x811c9dc5);
  });

  it('handles unicode characters consistently', () => {
    const hash1 = hashStringFNV1a('unicode-🌱-seed');
    const hash2 = hashStringFNV1a('unicode-🌱-seed');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for similar inputs', () => {
    const hash1 = hashStringFNV1a('seed');
    const hash2 = hashStringFNV1a('seeds');
    expect(hash1).not.toBe(hash2);
  });
});

describe('createMulberry32', () => {
  it('produces deterministic output with same seed', () => {
    const rng1 = createMulberry32(12345);
    const rng2 = createMulberry32(12345);

    // Generate multiple values to verify sequence is identical
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences with different seeds', () => {
    const rng1 = createMulberry32(12345);
    const rng2 = createMulberry32(67890);

    const sequence1 = Array.from({ length: 10 }, () => rng1());
    const sequence2 = Array.from({ length: 10 }, () => rng2());

    expect(sequence1).not.toEqual(sequence2);
  });

  it('returns values in [0, 1) range', () => {
    const rng = createMulberry32(42);

    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('handles zero seed', () => {
    const rng = createMulberry32(0);
    const value = rng();
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('handles maximum 32-bit seed', () => {
    const rng = createMulberry32(0xffffffff);
    const value = rng();
    expect(typeof value).toBe('number');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe('createSeededRng', () => {
  describe('determinism', () => {
    it('produces deterministic random values with same seed and salt', () => {
      const rng1 = createSeededRng('test-seed', 'salt');
      const rng2 = createSeededRng('test-seed', 'salt');

      for (let i = 0; i < 10; i++) {
        expect(rng1.random()).toBe(rng2.random());
      }
    });

    it('produces deterministic random values with default salt', () => {
      const rng1 = createSeededRng('test-seed');
      const rng2 = createSeededRng('test-seed');

      for (let i = 0; i < 10; i++) {
        expect(rng1.random()).toBe(rng2.random());
      }
    });

    it('produces different sequences with different seeds', () => {
      const rng1 = createSeededRng('seed-a');
      const rng2 = createSeededRng('seed-b');

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).not.toEqual(sequence2);
    });

    it('produces different sequences with different salts', () => {
      const rng1 = createSeededRng('same-seed', 'salt-a');
      const rng2 = createSeededRng('same-seed', 'salt-b');

      const sequence1 = Array.from({ length: 10 }, () => rng1.random());
      const sequence2 = Array.from({ length: 10 }, () => rng2.random());

      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe('random()', () => {
    it('returns values in [0, 1) range', () => {
      const rng = createSeededRng('range-test');

      for (let i = 0; i < 100; i++) {
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('returns numbers, not other types', () => {
      const rng = createSeededRng('type-test');

      for (let i = 0; i < 10; i++) {
        const value = rng.random();
        expect(typeof value).toBe('number');
        expect(Number.isNaN(value)).toBe(false);
      }
    });
  });

  describe('chance()', () => {
    it('returns boolean values', () => {
      const rng = createSeededRng('chance-test');

      for (let i = 0; i < 10; i++) {
        const result = rng.chance(0.5);
        expect(typeof result).toBe('boolean');
      }
    });

    it('always returns true when probability is 1', () => {
      const rng = createSeededRng('chance-always');

      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('always returns false when probability is 0', () => {
      const rng = createSeededRng('chance-never');

      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('is deterministic with same seed', () => {
      const rng1 = createSeededRng('chance-determinism');
      const rng2 = createSeededRng('chance-determinism');

      for (let i = 0; i < 20; i++) {
        expect(rng1.chance(0.5)).toBe(rng2.chance(0.5));
      }
    });

    it('roughly matches expected probability over many samples', () => {
      const rng = createSeededRng('probability-test');
      const iterations = 1000;
      const probability = 0.3;
      let trueCount = 0;

      for (let i = 0; i < iterations; i++) {
        if (rng.chance(probability)) trueCount++;
      }

      const actualProbability = trueCount / iterations;
      // Allow 5% tolerance for randomness
      expect(actualProbability).toBeGreaterThan(probability - 0.05);
      expect(actualProbability).toBeLessThan(probability + 0.05);
    });
  });

  describe('between()', () => {
    it('returns values in [min, max) range', () => {
      const rng = createSeededRng('between-test');
      const min = 10;
      const max = 20;

      for (let i = 0; i < 100; i++) {
        const value = rng.between(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('is deterministic with same seed', () => {
      const rng1 = createSeededRng('between-determinism');
      const rng2 = createSeededRng('between-determinism');

      for (let i = 0; i < 10; i++) {
        expect(rng1.between(0, 100)).toBe(rng2.between(0, 100));
      }
    });

    it('handles equal min and max (returns min)', () => {
      const rng = createSeededRng('between-equal');
      // When min === max, result is min + 0 * random() = min
      const value = rng.between(5, 5);
      expect(value).toBe(5);
    });

    it('handles negative ranges', () => {
      const rng = createSeededRng('between-negative');
      const min = -50;
      const max = -10;

      for (let i = 0; i < 50; i++) {
        const value = rng.between(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('handles ranges spanning zero', () => {
      const rng = createSeededRng('between-zero-span');
      const min = -10;
      const max = 10;

      for (let i = 0; i < 50; i++) {
        const value = rng.between(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('returns fractional values (not just integers)', () => {
      const rng = createSeededRng('between-fractional');
      const values = Array.from({ length: 100 }, () => rng.between(0, 1));
      const hasFractional = values.some((v) => v !== Math.floor(v));
      expect(hasFractional).toBe(true);
    });
  });

  describe('betweenInt()', () => {
    it('returns integer values', () => {
      const rng = createSeededRng('betweenint-test');

      for (let i = 0; i < 100; i++) {
        const value = rng.betweenInt(0, 10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('returns values in [min, max] range (inclusive)', () => {
      const rng = createSeededRng('betweenint-range');
      const min = 1;
      const max = 5;

      for (let i = 0; i < 100; i++) {
        const value = rng.betweenInt(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    });

    it('is deterministic with same seed', () => {
      const rng1 = createSeededRng('betweenint-determinism');
      const rng2 = createSeededRng('betweenint-determinism');

      for (let i = 0; i < 10; i++) {
        expect(rng1.betweenInt(0, 100)).toBe(rng2.betweenInt(0, 100));
      }
    });

    it('handles equal min and max (returns that value)', () => {
      const rng = createSeededRng('betweenint-equal');
      const value = rng.betweenInt(7, 7);
      expect(value).toBe(7);
    });

    it('handles negative ranges', () => {
      const rng = createSeededRng('betweenint-negative');
      const min = -5;
      const max = -1;

      for (let i = 0; i < 50; i++) {
        const value = rng.betweenInt(min, max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
      }
    });

    it('can produce both min and max values over many calls', () => {
      const rng = createSeededRng('betweenint-coverage');
      const min = 0;
      const max = 4;
      const values = new Set<number>();

      // Generate many values to likely hit all possibilities
      for (let i = 0; i < 200; i++) {
        values.add(rng.betweenInt(min, max));
      }

      // Should have hit all values in range
      for (let v = min; v <= max; v++) {
        expect(values.has(v)).toBe(true);
      }
    });
  });

  describe('combined usage', () => {
    it('maintains determinism when mixing methods', () => {
      const rng1 = createSeededRng('combined-test');
      const rng2 = createSeededRng('combined-test');

      expect(rng1.random()).toBe(rng2.random());
      expect(rng1.chance(0.5)).toBe(rng2.chance(0.5));
      expect(rng1.between(0, 100)).toBe(rng2.between(0, 100));
      expect(rng1.betweenInt(1, 10)).toBe(rng2.betweenInt(1, 10));
      expect(rng1.random()).toBe(rng2.random());
    });

    it('each RNG instance maintains independent state', () => {
      const rng1 = createSeededRng('independent-1');
      const rng2 = createSeededRng('independent-2');

      // Call rng1 multiple times
      rng1.random();
      rng1.random();
      rng1.random();

      // rng2 should still produce its own first value
      const rng2First = rng2.random();

      // Create a new rng3 with same seed as rng2 - should match rng2's sequence
      const rng3 = createSeededRng('independent-2');
      expect(rng3.random()).toBe(rng2First);
    });
  });
});
