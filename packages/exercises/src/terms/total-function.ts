import type { ExerciseSet } from '@fpx/engine/types';

export const totalFunction: ExerciseSet = {
  termId: 'total-function',
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Make three functions total',
      prompt:
        'Each of these is undefined somewhere. Give every input an answer: `sum` of an empty list, `first` of an empty list, and `times` with a negative count.',
      hints: [
        'An empty sum is 0, because adding nothing changes nothing.',
        '`first` cannot invent an element, so widen what it returns instead: `{ found: false }` when there is none.',
        'A negative repeat count is the same as repeating zero times.',
      ],
      exports: ['sum', 'first', 'times'],
      starter: `// sum :: [Number] -> Number
const sum = (xs) => xs.reduce((a, b) => a + b)

// first :: [a] -> { found :: Boolean, value :: a }
const first = (xs) => ({ found: true, value: xs[0] })

// times :: Number -> String -> String
const times = (n, s) => s.repeat(n)
`,
      solution: `// sum :: [Number] -> Number
const sum = (xs) => xs.reduce((a, b) => a + b, 0)

// first :: [a] -> { found :: Boolean, value :: a }
const first = (xs) => (xs.length > 0 ? { found: true, value: xs[0] } : { found: false })

// times :: Number -> String -> String
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
      broken: [
        // The starter: reduce with no seed throws, first lies, repeat throws.
        `const sum = (xs) => xs.reduce((a, b) => a + b)
const first = (xs) => ({ found: true, value: xs[0] })
const times = (n, s) => s.repeat(n)
`,
        // Guards the throws but still claims to have found something.
        `const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const first = (xs) => ({ found: true, value: xs[0] })
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
        // Returns a sentinel string instead of widening the type.
        `const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const first = (xs) => (xs.length ? { found: true, value: xs[0] } : 'none')
const times = (n, s) => (n > 0 ? s.repeat(n) : '')
`,
      ],
      checks: (T, exp) => {
        const sum = exp.sum as (xs: number[]) => number;
        const first = exp.first as (xs: any[]) => { found: boolean; value?: any };
        const times = exp.times as (n: number, s: string) => string;

        T.check('sum still adds a normal list', () => {
          const r = sum([1, 2, 3]);
          return r === 6 || `sum([1, 2, 3]) gave ${T.fmt(r)}`;
        });

        T.check('sum of nothing is 0', () => {
          const r = sum([]);
          return r === 0 || `sum([]) gave ${T.fmt(r)}. Adding nothing leaves you where you started.`;
        });

        T.law('sum never throws and always gives a number', 80, (G) => {
          const xs = G.ints();
          const r = sum(xs);
          return typeof r === 'number' || `sum(${T.fmt(xs)}) gave ${T.fmt(r)}`;
        });

        T.check('first reports what it found', () => {
          const r = first([10, 20]);
          return (r && r.found === true && r.value === 10) || `first([10, 20]) gave ${T.fmt(r)}`;
        });

        T.check('first says so when there is nothing', () => {
          const r = first([]);
          if (!r || typeof r !== 'object') return `first([]) gave ${T.fmt(r)}. Widen the return type rather than returning a sentinel.`;
          return (
            r.found === false ||
            `first([]) reported found: ${T.fmt(r.found)}. There is no first element of an empty list, so say so instead of claiming undefined.`
          );
        });

        T.check('first never claims a value it does not have', () => {
          const r = first([]);
          return (
            r.value === undefined ||
            `first([]) came back carrying ${T.fmt(r.value)}. Nothing was found, so there should be nothing to read.`
          );
        });

        T.check('times still repeats', () => {
          const r = times(3, 'ab');
          return r === 'ababab' || `times(3, "ab") gave ${T.fmt(r)}`;
        });

        T.check('A count of zero or less gives the empty string', () => {
          const zero = times(0, 'ab');
          const neg = times(-2, 'ab');
          if (zero !== '') return `times(0, "ab") gave ${T.fmt(zero)}`;
          return neg === '' || `times(-2, "ab") gave ${T.fmt(neg)}. Repeating a negative number of times is the same as not repeating.`;
        });

        T.law('times never throws, whatever the count', 80, (G) => {
          const n = G.int();
          const r = times(n, 'x');
          return typeof r === 'string' || `times(${n}, "x") gave ${T.fmt(r)}`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What makes a function total?',
      prompt: 'Pick the statement that captures it.',
      options: [
        {
          code: '// It returns a value for every input in its domain',
          correct: true,
          why: 'No input throws, hangs, or falls through. That is the whole definition.',
        },
        {
          code: '// It never throws',
          correct: false,
          why: 'Close, but a function that hangs forever or returns undefined where a value was promised is still not total.',
        },
        {
          code: '// It handles every input by returning null when it cannot answer',
          correct: false,
          why: 'Returning null makes it total only if null is genuinely part of the return type. Otherwise you have moved the problem to the caller.',
        },
        {
          code: '// It is pure',
          correct: false,
          why: 'Unrelated. A pure function can be partial, and an impure one can be total.',
        },
      ],
    },
  ],
};
