import type { ExerciseSet } from '@fpx/engine/types';

export const catamorphism: ExerciseSet = {
  termId: 'catamorphism',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Collapse a structure to a value',
      prompt:
        'A catamorphism tears a structure down to one value. Write `cata` once, then express sum, max, and length in terms of it.',
      hints: [
        '`cata` is a fold: an accumulator, a step, and a list.',
        'Each of the three is the same fold with a different step and seed.',
      ],
      exports: ['cata', 'sum', 'max', 'length'],
      starter: `// cata :: ((b, a) -> b) -> b -> [a] -> b
const cata = (step) => (seed) => (xs) => {
}

// Express all three with cata:
const sum = null
const max = null
const length = null
`,
      solution: `// cata :: ((b, a) -> b) -> b -> [a] -> b
const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}

const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a) => a + 1)(0)
`,
      broken: [
        // Applies the step with the arguments the wrong way round.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(x, acc)
  return acc
}
const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a) => a + 1)(0)
`,
        // The seeds are wrong, so the empty cases lie.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}
const sum = cata((a, b) => a + b)(1)
const max = cata((a, b) => (b > a ? b : a))(0)
const length = cata((a) => a + 1)(0)
`,
        // length counts the elements it likes the look of.
        `const cata = (step) => (seed) => (xs) => {
  let acc = seed
  for (const x of xs) acc = step(acc, x)
  return acc
}
const sum = cata((a, b) => a + b)(0)
const max = cata((a, b) => (b > a ? b : a))(-Infinity)
const length = cata((a, b) => (b ? a + 1 : a))(0)
`,
      ],
      checks: (T, exp) => {
        const sum = exp.sum as (xs: number[]) => number;
        const max = exp.max as (xs: number[]) => number;
        const length = exp.length as (xs: unknown[]) => number;

        T.check('sum adds them up', () => {
          const r = sum([1, 2, 3, 4]);
          return r === 10 || `Got ${T.fmt(r)}`;
        });

        T.check('max finds the largest', () => {
          const r = max([3, 9, 2]);
          return r === 9 || `Got ${T.fmt(r)}`;
        });

        T.check('max works when every number is negative', () => {
          const r = max([-5, -2, -9]);
          return (
            r === -2 ||
            `Got ${T.fmt(r)}. A seed of 0 would win here, which is why the seed has to be smaller than anything possible.`
          );
        });

        T.check('length counts everything, including falsy elements', () => {
          const r = length([0, '', null, false, 1]);
          return (
            r === 5 ||
            `Got ${T.fmt(r)}. The step for length ignores the element entirely, so nothing can be skipped for being falsy.`
          );
        });

        T.check('The empty cases are the identities', () => {
          const s = sum([]);
          const l = length([]);
          if (s !== 0) return `sum([]) gave ${T.fmt(s)}, expected 0.`;
          return l === 0 || `length([]) gave ${T.fmt(l)}, expected 0.`;
        });

        T.check('The step sees the accumulator first', () => {
          const order: string[] = [];
          const cata = exp.cata as (s: (a: any, b: any) => any) => (seed: any) => (xs: any[]) => any;
          cata((acc: string, x: string) => {
            order.push(`${acc}|${x}`);
            return acc;
          })('seed')(['a']);
          return (
            T.eq(order, ['seed|a']) ||
            `The step was called as ${T.fmt(order)}. It takes the accumulator first and the element second.`
          );
        });

        T.law('sum agrees with adding by hand', 60, (G) => {
          const xs = G.ints();
          const want = xs.reduce((a, b) => a + b, 0);
          const got = sum(xs);
          return got === want || `On ${T.fmt(xs)}: got ${T.fmt(got)}, expected ${want}.`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which direction?',
      prompt: 'A catamorphism and an anamorphism are opposites. Which is which?',
      options: [
        {
          code: '// cata tears a structure down to a value;\n// ana builds a structure up from a value',
          correct: true,
          why: 'Cata is a fold, ana is an unfold. The Greek is "downwards" and "upwards".',
        },
        {
          code: '// cata builds up; ana tears down',
          correct: false,
          why: 'The right idea, the wrong way round.',
        },
        {
          code: '// Both tear down, but cata is recursive',
          correct: false,
          why: 'Both are recursive. It is the direction that differs.',
        },
        {
          code: '// cata works on lists; ana works on trees',
          correct: false,
          why: 'Neither is tied to a shape. Both are defined for any recursive structure.',
        },
      ],
    },
  ],
};
