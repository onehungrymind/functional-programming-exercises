import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const iso: ExerciseSet = {
  termId: 'iso',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Two views of the same thing',
      prompt:
        'An isomorphism is a pair of conversions that lose nothing. Write the Celsius/Fahrenheit pair, and the pair between a record and a tuple.',
      hints: [
        'Fahrenheit is `c * 9 / 5 + 32`, and back again is `(f - 32) * 5 / 9`.',
        'The record and the tuple hold exactly the same information, so neither direction can drop a field.',
      ],
      exports: ['toF', 'toC', 'toPair', 'toCoords'],
      starter: `// toF :: Number -> Number
const toF = (c) => {
}

// toC :: Number -> Number
const toC = (f) => {
}

// toPair :: { x, y } -> [Number, Number]
const toPair = (coords) => {
}

// toCoords :: [Number, Number] -> { x, y }
const toCoords = (pair) => {
}
`,
      solution: `// toF :: Number -> Number
const toF = (c) => (c * 9) / 5 + 32

// toC :: Number -> Number
const toC = (f) => ((f - 32) * 5) / 9

// toPair :: { x, y } -> [Number, Number]
const toPair = (coords) => [coords.x, coords.y]

// toCoords :: [Number, Number] -> { x, y }
const toCoords = (pair) => ({ x: pair[0], y: pair[1] })
`,
      broken: [
        // Rounds, which loses information and breaks the round trip.
        `const toF = (c) => Math.round((c * 9) / 5 + 32)
const toC = (f) => Math.round(((f - 32) * 5) / 9)
const toPair = (coords) => [coords.x, coords.y]
const toCoords = (pair) => ({ x: pair[0], y: pair[1] })
`,
        // The two coordinate directions disagree about order.
        `const toF = (c) => (c * 9) / 5 + 32
const toC = (f) => ((f - 32) * 5) / 9
const toPair = (coords) => [coords.x, coords.y]
const toCoords = (pair) => ({ x: pair[1], y: pair[0] })
`,
        // Offsets applied in the wrong order.
        `const toF = (c) => ((c + 32) * 9) / 5
const toC = (f) => ((f - 32) * 5) / 9
const toPair = (coords) => [coords.x, coords.y]
const toCoords = (pair) => ({ x: pair[0], y: pair[1] })
`,
      ],
      checks: (T, exp) => {
        const toF = exp.toF as (c: number) => number;
        const toC = exp.toC as (f: number) => number;
        const toPair = exp.toPair as (c: { x: number; y: number }) => [number, number];
        const toCoords = exp.toCoords as (p: [number, number]) => { x: number; y: number };

        const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

        T.check('Freezing and boiling are the familiar numbers', () => {
          if (!close(toF(0), 32)) return `0C came out as ${T.fmt(toF(0))}, expected 32F.`;
          return close(toF(100), 212) || `100C came out as ${T.fmt(toF(100))}, expected 212F.`;
        });

        T.check('The conversion back agrees', () => {
          return close(toC(212), 100) || `212F came out as ${T.fmt(toC(212))}, expected 100C.`;
        });

        T.check('A fractional temperature survives the round trip', () => {
          const r = toC(toF(0.5));
          return (
            close(r, 0.5) ||
            `0.5C became ${T.fmt(toF(0.5))}F and came back as ${T.fmt(r)}. Rounding anywhere in the pair loses the fraction, and nothing can put it back.`
          );
        });

        laws.iso({ ...T }, {
          to: toF,
          from: toC,
          // Fractions on purpose: whole degrees can survive a rounded conversion by luck,
          // which would let a lossy pair pass.
          sample: (G) => G.int() + 0.5,
          // A float round trip needs a tolerance. Exact equality is the wrong question here.
          close: (a: number, b: number) => close(a, b),
          runs: 60,
        });

        T.check('A record becomes a pair and back again', () => {
          const c = { x: 3, y: 4 };
          const r = toCoords(toPair(c));
          return T.eq(r, c) || `Round-tripping ${T.fmt(c)} gave ${T.fmt(r)}.`;
        });

        T.check('The pair keeps x first', () => {
          const p = toPair({ x: 1, y: 2 });
          return (
            T.eq(p, [1, 2]) ||
            `Got ${T.fmt(p)}. The two directions have to agree about order, or the round trip swaps the fields.`
          );
        });

        laws.iso({ ...T }, {
          to: toPair,
          from: toCoords,
          sample: (G) => ({ x: G.int(), y: G.int() }),
          runs: 60,
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which pairs are isomorphisms?',
      prompt: 'An isomorphism loses nothing in either direction. Select every pair that qualifies.',
      options: [
        {
          code: '// [a, b]  <->  { first: a, second: b }',
          correct: true,
          why: 'Same information in both shapes, and either direction recovers the other exactly.',
        },
        {
          code: '// Number  <->  String   via String() and Number()',
          correct: false,
          why: 'Not quite. "007" and "7" both become 7, so going back cannot know which you started with.',
        },
        {
          code: '// Boolean  <->  0 | 1',
          correct: true,
          why: 'Two values on each side, matched one to one.',
        },
        {
          code: '// Number  <->  Number   via Math.round',
          correct: false,
          why: 'Rounding throws away the fraction, and nothing can put it back.',
        },
        {
          code: '// Option a  <->  a | null',
          correct: true,
          why: 'Some maps to the value, None to null. Nothing is lost, provided the value itself is never null.',
        },
      ],
    },
  ],
};
