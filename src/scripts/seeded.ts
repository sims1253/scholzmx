/**
 * Deterministic RNG helpers for seeded UI variation.
 */

export function hashStringFNV1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

export function createMulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string, salt = 'ui-variation-v1') {
  const h = hashStringFNV1a(`${seed}|${salt}`);
  const rng = createMulberry32(h);
  const random = () => rng();
  const chance = (probability: number) => random() < probability;
  const between = (min: number, max: number) => min + (max - min) * random();
  const betweenInt = (min: number, max: number) => Math.round(between(min, max));
  return { random, chance, between, betweenInt };
}
