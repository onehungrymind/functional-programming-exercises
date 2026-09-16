import type { ExerciseSet } from '@fpx/engine/types';

export const traversal: ExerciseSet = {
  termId: 'traversal',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Focus on many things at once',
      prompt:
        'Where a lens focuses on one thing and a prism on at most one, a traversal focuses on any number. Write one over the even numbers in a list.',
      hints: [
        '`getAll` collects the elements that match, in order.',
        '`modify` applies the function to the matching elements and leaves the others exactly as they were.',
      ],
      exports: ['getAll', 'modify'],
      starter: `const isEven = (n) => n % 2 === 0

// getAll :: [Number] -> [Number]
const getAll = (xs) => {
}

// modify :: ((Number -> Number), [Number]) -> [Number]
const modify = (f, xs) => {
}
`,
      solution: `const isEven = (n) => n % 2 === 0

// getAll :: [Number] -> [Number]
const getAll = (xs) => xs.filter(isEven)

// modify :: ((Number -> Number), [Number]) -> [Number]
const modify = (f, xs) => xs.map((x) => (isEven(x) ? f(x) : x))
`,
      broken: [
        // Drops the elements that did not match instead of leaving them alone.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.filter(isEven).map(f)
`,
        // Applies the function to everything.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.map(f)
`,
        // Mutates the list it was given.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => {
  xs.forEach((x, i) => {
    if (isEven(x)) xs[i] = f(x)
  })
  return xs
}
`,
      ],
      checks: (T, exp) => {
        const getAll = exp.getAll as (xs: number[]) => number[];
        const modify = exp.modify as (f: (n: number) => number, xs: number[]) => number[];

        T.check('getAll collects the even numbers in order', () => {
          const r = getAll([1, 2, 3, 4, 6]);
          return T.eq(r, [2, 4, 6]) || `Got ${T.fmt(r)}`;
        });

        T.check('getAll on a list with no matches gives nothing', () => {
          const r = getAll([1, 3, 5]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('modify changes the matches', () => {
          const r = modify((n) => n * 10, [1, 2, 3, 4]);
          return T.eq(r, [1, 20, 3, 40]) || `Got ${T.fmt(r)}, expected [1, 20, 3, 40].`;
        });

        T.check('modify keeps the non-matches where they were', () => {
          const r = modify((n) => n * 10, [1, 2, 3, 4]);
          return (
            r.length === 4 ||
            `Got ${T.fmt(r)}, which is ${r.length} long. A traversal focuses on some elements; it does not remove the others.`
          );
        });

        T.check('modify leaves the input list alone', () => {
          const xs = T.freeze([1, 2, 3, 4]);
          modify((n) => n * 10, xs as number[]);
          return T.eq(xs, [1, 2, 3, 4]) || 'The list changed.';
        });

        T.law('modify with identity changes nothing', 60, (G) => {
          const xs = G.ints();
          const r = modify((n) => n, xs);
          return T.eq(r, xs) || `On ${T.fmt(xs)}: got ${T.fmt(r)}.`;
        });

        T.law('getAll after modify equals modify applied to getAll', 60, (G) => {
          const xs = G.ints().map((n) => n * 2); // keep them all matching, so f cannot change the set
          const f = G.fn();
          const g = (n: number) => f.f(n) * 2; // stays even, so the focus set is stable
          const left = getAll(modify(g, xs));
          const right = getAll(xs).map(g);
          return (
            T.eq(left, right) ||
            `On ${T.fmt(xs)} with ${f.name}: reading after modifying gave ${T.fmt(left)}, modifying what was read gave ${T.fmt(right)}.`
          );
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'How many does each optic focus on?',
      prompt: 'Match the optic to the number of things it can focus on.',
      options: [
        {
          code: '// lens: exactly one\n// prism: zero or one\n// traversal: zero or more',
          correct: true,
          why: 'That is the whole hierarchy. Each is a loosening of the one before.',
        },
        {
          code: '// lens: one\n// prism: many\n// traversal: one',
          correct: false,
          why: 'Prism and traversal are the wrong way round. A prism is about a case that may not match.',
        },
        {
          code: '// All three focus on exactly one',
          correct: false,
          why: 'Then there would be no reason to have three.',
        },
        {
          code: '// lens: zero or more\n// prism: one\n// traversal: zero or one',
          correct: false,
          why: 'All three are shuffled.',
        },
      ],
    },
  ],
};
