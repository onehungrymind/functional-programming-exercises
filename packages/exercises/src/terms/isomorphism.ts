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
        "An isomorphism is two arrows whose composition is identity in both directions. Write the pair between a coordinate record and a pair. The two directions are `pairToCoords` and `coordsToPair`.",
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

    {
      id: 'check-it',
      kind: 'code',
      role: 'apply',
      covers: ['both-ways', 'pair-of-arrows', 'same-information'],
      title: "Write the check that both ways hold",
      prompt:
        "Two functions between two types are not an isomorphism until both round trips come back where they started. Write `isIso`, then use it to show that a lossy pair passes one direction and fails the other.",
      hints: [
        "There are two laws, not one. Going out and back, and going back and out.",
        "You need samples from both sides, because each round trip starts somewhere different.",
        "`lossy` should be a pair where one direction throws information away. Rounding is the easiest.",
      ],
      exports: ['isIso', 'roundTrips', 'lossy'],
      starter: `const snapshot = (v) => JSON.stringify(v)

// roundTrips :: ((a -> b), (b -> a), [a]) -> Boolean   one direction only
const roundTrips = (to, from, samples) => true

// isIso :: ((a -> b), (b -> a), [a], [b]) -> Boolean   both directions
const isIso = (to, from, as, bs) => true

// lossy :: { to, from }   passes one way, fails the other
const lossy = { to: (x) => x, from: (x) => x }
`,
      solution: `const snapshot = (v) => JSON.stringify(v)

// roundTrips :: ((a -> b), (b -> a), [a]) -> Boolean   one direction only
const roundTrips = (to, from, samples) =>
  samples.every((a) => snapshot(from(to(a))) === snapshot(a))

// isIso :: ((a -> b), (b -> a), [a], [b]) -> Boolean   both directions
const isIso = (to, from, as, bs) =>
  roundTrips(to, from, as) && roundTrips(from, to, bs)

// lossy :: { to, from }   passes one way, fails the other
const lossy = {
  to: (n) => Math.round(n),
  from: (n) => n
}
`,
      broken: [
        `const snapshot = (v) => JSON.stringify(v)
const roundTrips = (to, from, samples) =>
  samples.every((a) => snapshot(from(to(a))) === snapshot(a))
const isIso = (to, from, as, bs) => roundTrips(to, from, as)
const lossy = { to: (n) => Math.round(n), from: (n) => n }
`,
        `const snapshot = (v) => JSON.stringify(v)
const roundTrips = (to, from, samples) =>
  samples.some((a) => snapshot(from(to(a))) === snapshot(a))
const isIso = (to, from, as, bs) => roundTrips(to, from, as) && roundTrips(from, to, bs)
const lossy = { to: (n) => Math.round(n), from: (n) => n }
`,
        `const snapshot = (v) => JSON.stringify(v)
const roundTrips = (to, from, samples) =>
  samples.every((a) => snapshot(from(to(a))) === snapshot(a))
const isIso = (to, from, as, bs) => roundTrips(to, from, as) && roundTrips(from, to, bs)
const lossy = { to: (n) => n, from: (n) => n }
`,
      ],
      checks: (T, exp) => {
        const { isIso, roundTrips, lossy } = exp;
        const toPair = (o: { x: number; y: number }) => [o.x, o.y];
        const toObj = (p: number[]) => ({ x: p[0], y: p[1] });
        const objs = [{ x: 1, y: 2 }, { x: 0, y: 0 }];
        const pairs = [[1, 2], [3, 4]];

        T.check('A real isomorphism passes', () => {
          const r = isIso(toPair, toObj, objs, pairs);
          return r === true || `A point and a pair carry the same information, and it was reported as ${T.fmt(r)}.`;
        });

        T.check('It compares by contents, not identity', () => {
          const r = roundTrips(toPair, toObj, objs);
          return r === true || `Going out and back gave ${T.fmt(r)}. The object that comes back is a new one, so === would always say no.`;
        });

        T.check('A swapped pair fails', () => {
          const r = isIso(toPair, (p: number[]) => ({ x: p[1], y: p[0] }), objs, pairs);
          return r === false || `A pair that crosses the fields was reported as ${T.fmt(r)}.`;
        });

        T.check('One sample failing is enough to fail', () => {
          const r = roundTrips((n: number) => (n === 0 ? 99 : n), (n: number) => n, [0, 1, 2]);
          return r === false || `A function that only misbehaves at zero was reported as ${T.fmt(r)}.`;
        });

        T.check('The lossy pair does pass one direction', () => {
          const ints = [1, 2, 3];
          const r = roundTrips(lossy.to, lossy.from, ints);
          return (
            r === true ||
            `Starting from whole numbers, rounding and coming back should be exact, and it gave ${T.fmt(r)}. Half of an isomorphism can hold perfectly well.`
          );
        });

        T.check('The lossy pair fails the other direction', () => {
          const r = roundTrips(lossy.from, lossy.to, [1.5, 2.25]);
          return (
            r === false ||
            `Starting from a number with a fraction, it reported ${T.fmt(r)}. That is the direction where the information is thrown away.`
          );
        });

        T.check('isIso rejects the lossy pair outright', () => {
          const r = isIso(lossy.to, lossy.from, [1, 2, 3], [1.5, 2.25]);
          return (
            r === false ||
            `isIso reported ${T.fmt(r)}. If it only checks one direction, every lossy pair looks like an isomorphism from the side that happens to work.`
          );
        });

        T.check('isIso checks both sets of samples', () => {
          let touched = 0;
          const spy = (n: number) => {
            touched += 1;
            return n;
          };
          isIso(spy, spy, [1], [2]);
          return touched >= 4 || `The functions ran ${touched} times. Two round trips over one sample each is four calls.`;
        });
      },
    },
  ],
};
