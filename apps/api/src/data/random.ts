/**
 * Deterministic pseudo-random helpers.
 *
 * The demo data set is generated at boot rather than checked in, but it must
 * be identical on every run — otherwise a screenshot taken today would not
 * match the portal tomorrow, and the numbers quoted in a walkthrough would
 * drift. A seeded generator gives fresh-looking data with stable values.
 */

/** mulberry32 — small, fast, good enough distribution for fixture data. */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => Math.floor(next() * (max - min + 1)) + min;

  const float = (min: number, max: number, decimals = 2): number => {
    const value = next() * (max - min) + min;
    return Number(value.toFixed(decimals));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty list');
    return items[int(0, items.length - 1)] as T;
  };

  /**
   * Weighted pick. Weights are relative, so callers can express "roughly
   * 60% fraud, 25% consumer" without normalising to 1.
   */
  const weighted = <T>(entries: readonly (readonly [T, number])[]): T => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1]![0];
  };

  const bool = (trueProbability = 0.5): boolean => next() < trueProbability;

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  };

  /** Picks `count` distinct items, or all of them if the list is shorter. */
  const sample = <T>(items: readonly T[], count: number): T[] =>
    shuffle(items).slice(0, Math.min(count, items.length));

  return { next, int, float, pick, weighted, bool, shuffle, sample };
}

export type Random = ReturnType<typeof createRandom>;

/** Zero-padded sequence numbers for human-facing references. */
export function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
