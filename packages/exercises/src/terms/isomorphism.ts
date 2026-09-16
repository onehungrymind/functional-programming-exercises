import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const isomorphism: ExerciseSet = {
  termId: 'isomorphism',
  rubric: [
    {
      id: 'pair-of-arrows',
      statement:
        "Can write a pair of morphisms that undo each other in both directions.",
    },
    {
      id: 'both-ways',
      statement:
        "Knows one round trip holding is not enough, and can name a pair that satisfies only one.",
    },
    {
      id: 'same-information',
      statement:
        "Knows two isomorphic types carry the same information, so a function on one transfers to the other.",
    },
  ],
  notes: `An isomorphism is a pair of arrows whose compositions are the identity, in **both** directions.

\`\`\`js
const toCoords = (pair) => ({ x: pair[0], y: pair[1] })
const toPair = (coords) => [coords.x, coords.y]

toPair(toCoords([1, 2]))             // [1, 2]
toCoords(toPair({ x: 1, y: 2 }))     // { x: 1, y: 2 }
\`\`\`

One direction is not enough, and it is easy to be fooled by the one that works:

\`\`\`js
const to = String
const from = Number

from(to(7))       // 7    holds
to(from('007'))   // '7'  does not
\`\`\`

The two directions also have to agree about details like order, which is silent when both
slots hold the same type:

\`\`\`js
const toPair = (c) => [c.x, c.y]
const toCoords = (p) => ({ x: p[1], y: p[0] })   // swapped
toCoords(toPair({ x: 1, y: 2 }))                  // { x: 2, y: 1 }
\`\`\`

What it means in practice is that the two types carry the **same information**, so anything you
can do with one you can do with the other by converting, working, and converting back:

\`\`\`js
const scale = (n) => (coords) => ({ x: coords.x * n, y: coords.y * n })
const scalePair = (n) => (pair) => toPair(scale(n)(toCoords(pair)))
\`\`\`

That is why isomorphic is a stronger claim than convertible. \`Number -> String\` converts;
it does not preserve.`,
  rungs: [
    {
      id: 'implement',
      covers: ['pair-of-arrows', 'same-information'],
      kind: 'code',
      role: 'implement',
      title: 'A pair of morphisms that undo each other',
      prompt:
        'An isomorphism is two arrows whose composition is identity in both directions. Write the pair between a coordinate record and a pair.',
      hints: ['Neither direction may lose or invent anything. Both fields have to survive the trip.'],
      exports: ['pairToCoords', 'coordsToPair'],
      starter: `// pairToCoords :: [Number, Number] -> { x, y }
const pairToCoords = (pair) => {
}

// coordsToPair :: { x, y } -> [Number, Number]
const coordsToPair = (coords) => {
}
`,
      solution: `// pairToCoords :: [Number, Number] -> { x, y }
const pairToCoords = (pair) => ({ x: pair[0], y: pair[1] })

// coordsToPair :: { x, y } -> [Number, Number]
const coordsToPair = (coords) => [coords.x, coords.y]
`,
      broken: [
        // The two directions disagree about order.
        `const pairToCoords = (pair) => ({ x: pair[0], y: pair[1] })
const coordsToPair = (coords) => [coords.y, coords.x]
`,
        // Drops a field, so nothing can put it back.
        `const pairToCoords = (pair) => ({ x: pair[0], y: 0 })
const coordsToPair = (coords) => [coords.x, coords.y]
`,
      ],
      checks: (T, exp) => {
        const pairToCoords = exp.pairToCoords as (p: [number, number]) => { x: number; y: number };
        const coordsToPair = exp.coordsToPair as (c: { x: number; y: number }) => [number, number];

        T.check('A pair becomes the matching record', () => {
          const r = pairToCoords([1, 2]);
          return T.eq(r, { x: 1, y: 2 }) || `Got ${T.fmt(r)}`;
        });

        T.check('A record becomes the matching pair', () => {
          const r = coordsToPair({ x: 1, y: 2 });
          return T.eq(r, [1, 2]) || `Got ${T.fmt(r)}`;
        });

        T.check('The two agree about which slot is which', () => {
          const r = coordsToPair(pairToCoords([1, 2]));
          return (
            T.eq(r, [1, 2]) ||
            `A round trip turned [1, 2] into ${T.fmt(r)}. Both directions have to agree about order, or the trip swaps the fields.`
          );
        });

        laws.iso({ ...T }, {
          to: pairToCoords,
          from: coordsToPair,
          sample: (G) => [G.int(), G.int()] as [number, number],
          runs: 60,
        });
      },
    },

    {
      id: 'recognize',
      covers: ['both-ways'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What makes it an isomorphism rather than two functions?',
      prompt: 'Two conversions between the same pair of types. What has to be true for them to be an isomorphism?',
      options: [
        {
          code: '// from(to(x)) === x  and  to(from(y)) === y',
          correct: true,
          why: 'Both round trips, not just one. A one-way round trip is a retraction, not an isomorphism.',
        },
        {
          code: '// from(to(x)) === x  is enough',
          correct: false,
          why: 'Only half. Number to String satisfies one direction and still loses "007".',
        },
        {
          code: '// The two types have the same field names',
          correct: false,
          why: 'Irrelevant. A pair and a record share no names and are perfectly isomorphic.',
        },
        {
          code: '// Both conversions are pure',
          correct: false,
          why: 'Necessary but nowhere near sufficient. Math.round is pure and loses information.',
        },
      ],
    },
  ],
};
