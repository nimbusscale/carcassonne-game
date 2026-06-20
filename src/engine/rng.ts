// Single seeded RNG so games are reproducible. mulberry32 — small, fast, good enough.

export interface RNG {
  next(): number; // [0, 1)
}

export function makeRng(seed: number): RNG {
  let a = seed >>> 0;
  return {
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Fisher–Yates shuffle using the provided RNG. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: RNG): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const a = arr[i]!;
    const b = arr[j]!;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}
