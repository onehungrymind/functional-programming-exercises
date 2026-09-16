import type { Gen, LabelledFn } from './types.js';

/**
 * Deterministic generators. Labelled, because a counterexample that prints
 * `f = [Function]` tells the learner nothing, and `f = x => x * 2` tells them everything.
 *
 * Seeded so a failing run is reproducible: the same rung and the same code
 * always fail on the same case.
 */

const NUMBER_FNS: LabelledFn[] = [
  { name: 'x => x + 1', f: (x) => x + 1 },
  { name: 'x => x * 2', f: (x) => x * 2 },
  { name: 'x => x - 7', f: (x) => x - 7 },
  { name: 'x => x * x', f: (x) => x * x },
  { name: 'x => -x', f: (x) => -x },
  { name: 'x => x % 5', f: (x) => x % 5 },
];

const PREDICATES: LabelledFn<number, boolean>[] = [
  { name: 'x => x > 0', f: (x) => x > 0 },
  { name: 'x => x % 2 === 0', f: (x) => x % 2 === 0 },
  { name: 'x => x < 10', f: (x) => x < 10 },
  { name: 'x => x !== 0', f: (x) => x !== 0 },
];

const WORDS = ['box', 'cart', 'user', 'sku', 'id', '', 'a', 'value', 'Main'];

/** mulberry32. Small, fast, and good enough for shrinking counterexamples. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGen(seed = 0x5eed): Gen {
  const rnd = makeRng(seed);
  const between = (lo: number, hi: number) => Math.floor(rnd() * (hi - lo + 1)) + lo;
  const pick = <T,>(xs: readonly T[]): T => xs[between(0, xs.length - 1)]!;

  return {
    int: () => between(-50, 50),
    nat: () => between(0, 12),
    bool: () => rnd() < 0.5,
    str: () => pick(WORDS),
    ints: () => Array.from({ length: between(0, 6) }, () => between(-20, 20)),
    fn: () => pick(NUMBER_FNS),
    pred: () => pick(PREDICATES),
    oneOf: pick,
  };
}

/**
 * Smaller values first, so the first failure a learner sees is the simplest one.
 * A law runs against this sequence before falling back to random cases.
 */
export const SMALL_INTS = [0, 1, -1, 2, -2, 3, 10, -10] as const;
