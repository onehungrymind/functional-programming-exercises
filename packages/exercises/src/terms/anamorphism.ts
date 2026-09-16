import type { ExerciseSet } from '@fpx/engine/types';

export const anamorphism: ExerciseSet = {
  termId: 'anamorphism',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Build a structure from a seed',
      prompt:
        'An anamorphism is an unfold: the opposite of a fold. Write `unfold`, then use it for `range` and `countDown`.',
      hints: [
        'The step returns either the next value and the next seed, or nothing to stop.',
        '`[value, nextSeed]` to continue, `null` to finish.',
      ],
      timeoutMs: 3000,
      exports: ['unfold', 'range', 'countDown'],
      starter: `// unfold :: ((b -> [a, b] | null), b) -> [a]
const unfold = (step, seed) => {
}

// range :: (Number, Number) -> [Number]   from inclusive, to exclusive
const range = (from, to) => {
}

// countDown :: Number -> [Number]   n, n-1, ... 1
const countDown = (n) => {
}
`,
      solution: `// unfold :: ((b -> [a, b] | null), b) -> [a]
const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0])
    current = next[1]
    next = step(current)
  }
  return out
}

// range :: (Number, Number) -> [Number]
const range = (from, to) => unfold((n) => (n < to ? [n, n + 1] : null), from)

// countDown :: Number -> [Number]
const countDown = (n) => unfold((k) => (k > 0 ? [k, k - 1] : null), n)
`,
      broken: [
        // Never stops: ignores the null and loops forever.
        `const unfold = (step, seed) => {
  const out = []
  let current = seed
  while (true) {
    const next = step(current)
    out.push(next[0])
    current = next[1]
  }
  return out
}
const range = (from, to) => unfold((n) => (n < to ? [n, n + 1] : null), from)
const countDown = (n) => unfold((k) => (k > 0 ? [k, k - 1] : null), n)
`,
        // range includes the upper bound.
        `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0])
    current = next[1]
    next = step(current)
  }
  return out
}
const range = (from, to) => unfold((n) => (n <= to ? [n, n + 1] : null), from)
const countDown = (n) => unfold((k) => (k > 0 ? [k, k - 1] : null), n)
`,
        // countDown runs past zero.
        `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0])
    current = next[1]
    next = step(current)
  }
  return out
}
const range = (from, to) => unfold((n) => (n < to ? [n, n + 1] : null), from)
const countDown = (n) => unfold((k) => (k >= 0 ? [k, k - 1] : null), n)
`,
      ],
      checks: (T, exp) => {
        const unfold = exp.unfold as (step: (b: any) => any, seed: any) => any[];
        const range = exp.range as (a: number, b: number) => number[];
        const countDown = exp.countDown as (n: number) => number[];

        T.check('unfold stops when the step says so', () => {
          const r = unfold((n: number) => (n < 3 ? [n, n + 1] : null), 0);
          return T.eq(r, [0, 1, 2]) || `Got ${T.fmt(r)}, expected [0, 1, 2].`;
        });

        T.check('A step that stops immediately gives an empty list', () => {
          const r = unfold(() => null, 0);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('range is inclusive at the start and exclusive at the end', () => {
          const r = range(2, 6);
          return T.eq(r, [2, 3, 4, 5]) || `range(2, 6) gave ${T.fmt(r)}, expected [2, 3, 4, 5].`;
        });

        T.check('An empty range is empty', () => {
          const r = range(5, 5);
          return T.eq(r, []) || `range(5, 5) gave ${T.fmt(r)}`;
        });

        T.check('countDown reaches 1 and stops', () => {
          const r = countDown(5);
          return T.eq(r, [5, 4, 3, 2, 1]) || `Got ${T.fmt(r)}, expected [5, 4, 3, 2, 1].`;
        });

        T.check('countDown from zero gives nothing', () => {
          const r = countDown(0);
          return T.eq(r, []) || `Got ${T.fmt(r)}. Counting down from zero has nothing to say.`;
        });

        T.check('It does not run past the stopping point', () => {
          const r = countDown(3);
          return (
            !r.includes(0) ||
            `Got ${T.fmt(r)}. Zero is past the end: the step should stop while the seed is still positive.`
          );
        });

        T.law('range produces the right number of values', 60, (G) => {
          const from = G.int();
          const count = G.nat();
          const r = range(from, from + count);
          return r.length === count || `range(${from}, ${from + count}) gave ${r.length} values, expected ${count}.`;
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Unfold the digits of a number',
      prompt: 'Use the same unfold to write `digits`, which gives the decimal digits of a number, most significant first.',
      hints: [
        'Peeling from the right is easier: take `n % 10` and continue with `Math.floor(n / 10)`.',
        'Then put them the right way round.',
      ],
      timeoutMs: 3000,
      exports: ['digits'],
      starter: `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0])
    current = next[1]
    next = step(current)
  }
  return out
}

// digits :: Number -> [Number]
const digits = (n) => {
}
`,
      solution: `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0])
    current = next[1]
    next = step(current)
  }
  return out
}

// digits :: Number -> [Number]
const digits = (n) => {
  if (n === 0) return [0]
  return unfold((k) => (k > 0 ? [k % 10, Math.floor(k / 10)] : null), n).reverse()
}
`,
      broken: [
        // Leaves the digits reversed.
        `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0]); current = next[1]; next = step(current)
  }
  return out
}
const digits = (n) => {
  if (n === 0) return [0]
  return unfold((k) => (k > 0 ? [k % 10, Math.floor(k / 10)] : null), n)
}
`,
        // Zero comes back as an empty list.
        `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0]); current = next[1]; next = step(current)
  }
  return out
}
const digits = (n) => unfold((k) => (k > 0 ? [k % 10, Math.floor(k / 10)] : null), n).reverse()
`,
      ],
      checks: (T, exp) => {
        const digits = exp.digits as (n: number) => number[];

        T.check('It reads most significant first', () => {
          const r = digits(1234);
          return T.eq(r, [1, 2, 3, 4]) || `digits(1234) gave ${T.fmt(r)}, expected [1, 2, 3, 4].`;
        });

        T.check('A single digit works', () => {
          const r = digits(7);
          return T.eq(r, [7]) || `Got ${T.fmt(r)}`;
        });

        T.check('Zero has one digit, not none', () => {
          const r = digits(0);
          return (
            T.eq(r, [0]) ||
            `Got ${T.fmt(r)}. Peeling from the right stops immediately for 0, so it needs handling on its own.`
          );
        });

        T.check('Internal zeroes survive', () => {
          const r = digits(1002);
          return T.eq(r, [1, 0, 0, 2]) || `Got ${T.fmt(r)}`;
        });

        T.law('The digits read back as the original number', 60, (G) => {
          const n = Math.abs(G.int());
          const back = Number(digits(n).join(''));
          return back === n || `digits(${n}) gave ${T.fmt(digits(n))}, which reads back as ${back}.`;
        });
      },
    },
  ],
};
