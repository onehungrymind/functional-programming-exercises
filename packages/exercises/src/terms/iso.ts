import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const iso: ExerciseSet = {
  termId: 'iso',
  rubric: [
    {
      id: 'both-round-trips',
      statement:
        "Knows an isomorphism needs both round trips to hold, and can name a pair that satisfies only one.",
    },
    {
      id: 'lossless',
      statement:
        "Can tell a lossless conversion from one that discards information, and knows rounding is never an isomorphism.",
    },
    {
      id: 'float-tolerance',
      statement:
        "Knows a float round trip needs a tolerance, and that testing with whole numbers can let a lossy pair pass.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read an iso's type and see that neither direction can fail, because there is no Option on either arrow.",
    },
  ],
  notes: `An isomorphism is a pair of conversions that lose nothing, in **both** directions.

\`\`\`js
const toPair = (coords) => [coords.x, coords.y]
const toCoords = (pair) => ({ x: pair[0], y: pair[1] })

toCoords(toPair({ x: 1, y: 2 }))   // { x: 1, y: 2 }
toPair(toCoords([1, 2]))           // [1, 2]
\`\`\`

Both directions matter. One of them holding is not enough:

\`\`\`js
const to = (n) => String(n)
const from = (s) => Number(s)

from(to(7))       // 7. This direction is fine.
to(from('007'))   // '7'. This one is not. Number and String are not isomorphic.
\`\`\`

Anything that discards information cannot be one, however innocent it looks:

\`\`\`js
const to = (n) => Math.round(n)
const from = (n) => n
from(to(1.5))     // 2. The fraction is gone and nothing can put it back.
\`\`\`

Floats need a tolerance, because the arithmetic does not round-trip exactly:

\`\`\`js
const toF = (c) => (c * 9) / 5 + 32
const toC = (f) => ((f - 32) * 5) / 9

toC(toF(0.1)) === 0.1              // false
Math.abs(toC(toF(0.1)) - 0.1) < 1e-9   // true
\`\`\`

And test with fractions, not whole numbers. A rounded conversion round-trips whole degrees
correctly often enough to look lossless:

\`\`\`js
const toF = (c) => Math.round((c * 9) / 5 + 32)
const toC = (f) => Math.round(((f - 32) * 5) / 9)

toC(toF(10))    // 10. Passes.
toC(toF(0.5))   // 1.  Caught.
\`\`\``,
  typedNotes: `Same track, second lap. An iso is the optic where nothing can go wrong, and the type is how
you tell.

\`\`\`ts
interface Iso<S, A> {
  to: (s: S) => A
  from: (a: A) => S
}
\`\`\`

Two plain arrows. No Option, no Result, no null on either side. Line the three optics up and
the family sorts itself by what the return types admit:

\`\`\`ts
interface Lens<S, A>  { getter: (s: S) => A;           setter: (a: A, s: S) => S }
interface Prism<S, A> { preview: (s: S) => Option<A>;  review: (a: A) => S }
interface Iso<S, A>   { to: (s: S) => A;               from: (a: A) => S }
\`\`\`

A [prism](#prism) can fail one way. A [lens](#lens) reads a part and has to rebuild the whole
to write. An iso goes both ways, total, and the whole IS the part in a different shape.

\`\`\`ts
const coords: Iso<[number, number], { x: number, y: number }> = {
  to: ([x, y]) => ({ x, y }),
  from: ({ x, y }) => [x, y]
}

coords.to([1, 2])          // { x: 1, y: 2 }
coords.from({ x: 1, y: 2 }) // [1, 2]
\`\`\`

What the types cannot tell you is that the two directions undo each other. \`to\` and \`from\`
could both be total and still lose information, and the compiler would be satisfied.

\`\`\`ts
const lossy: Iso<string, string> = {
  to: (s) => s.toUpperCase(),
  from: (s) => s.toLowerCase()   // typechecks, and 'Ada' comes back 'ada'
}
\`\`\`

Both round trips are your job, not the type system's. That is the whole reason this concept
has laws attached to it.`,
  rungs: [
    {
      id: 'implement',
      covers: ['lossless', 'float-tolerance'],
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
      covers: ['both-round-trips'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['both-round-trips', 'lossless', 'typed-signature'],
      title: "Satisfy Iso<[number, number], Point>",
      prompt:
        "The interface is given. Fill in `coords` so a pair and a point are the same information in two shapes, with neither direction losing anything.",
      hints: [
        "Neither arrow returns an Option, so neither one is allowed to fail on any input.",
        "Destructure and rebuild. `to` takes the pair apart, `from` puts it back in the same order.",
        "The order matters: whatever position you read `x` from, `from` has to write it back there.",
      ],
      exports: ['coords'],
      starter: `interface Point { x: number; y: number }

interface Iso<S, A> {
  to: (s: S) => A
  from: (a: A) => S
}

const coords: Iso<[number, number], Point> = {
  to: ([x, y]) => ({ x: 0, y: 0 }),
  from: ({ x, y }) => [0, 0]
}
`,
      solution: `interface Point { x: number; y: number }

interface Iso<S, A> {
  to: (s: S) => A
  from: (a: A) => S
}

const coords: Iso<[number, number], Point> = {
  to: ([x, y]) => ({ x, y }),
  from: ({ x, y }) => [x, y]
}
`,
      broken: [
        `interface Point { x: number; y: number }

interface Iso<S, A> {
  to: (s: S) => A
  from: (a: A) => S
}

const coords: Iso<[number, number], Point> = {
  to: ([x, y]) => ({ x, y }),
  from: ({ x, y }) => [y, x]
}
`,
        `interface Point { x: number; y: number }

interface Iso<S, A> {
  to: (s: S) => A
  from: (a: A) => S
}

const coords: Iso<[number, number], Point> = {
  to: ([x]) => ({ x, y: x }),
  from: ({ x, y }) => [x, y]
}
`,
      ],
      checks: (T, exp) => {
        T.check('The annotations are still doing work', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          if (/(:\s*any\b)|(\bas\s+any\b)/.test(src)) {
            return 'The answer leans on `any`, which satisfies nothing. The point is to satisfy the signature.';
          }
          return true;
        });
        T.check('The Iso interface is still there to satisfy', () => {
          return /interface\s+Iso/.test(T.src) || 'The Iso interface has gone. It is the thing being satisfied.';
        });
        const i = exp.coords;

        T.check('to turns a pair into a point', () => {
          const r = i.to([1, 2]);
          return T.eq(r, { x: 1, y: 2 }) || `to([1, 2]) gave ${T.fmt(r)}.`;
        });

        T.check('from turns a point back into a pair', () => {
          const r = i.from({ x: 1, y: 2 });
          return T.eq(r, [1, 2]) || `from({ x: 1, y: 2 }) gave ${T.fmt(r)}.`;
        });

        T.law('from after to gives the pair back', 80, (G) => {
          const p = [G.int(), G.int()];
          const back = i.from(i.to(p));
          return T.eq(back, p) || `${T.fmt(p)} came back as ${T.fmt(back)}.`;
        });

        T.law('to after from gives the point back', 80, (G) => {
          const p = { x: G.int(), y: G.int() };
          const back = i.to(i.from(p));
          return T.eq(back, p) || `${T.fmt(p)} came back as ${T.fmt(back)}.`;
        });

        T.law('x and y are not interchangeable', 60, (G) => {
          const x = G.int();
          const r = i.to([x, x + 1]);
          return (
            (r.x === x && r.y === x + 1) ||
            `to([${x}, ${x + 1}]) gave ${T.fmt(r)}. The two positions ended up crossed.`
          );
        });
      },
    },
  ],
};
