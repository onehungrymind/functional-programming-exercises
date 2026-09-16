import type { ExerciseSet } from '@fpx/engine/types';

export const traversal: ExerciseSet = {
  termId: 'traversal',
  rubric: [
    {
      id: 'many-focuses',
      statement:
        "Knows a traversal focuses on any number of elements, where a lens focuses on one and a prism on at most one.",
    },
    {
      id: 'leave-the-rest',
      statement:
        "Can modify the matching elements while leaving the non-matching ones exactly where they were.",
    },
    {
      id: 'consistency',
      statement:
        "Knows reading after modifying should agree with modifying what was read, and that identity must change nothing.",
    },
  ],
  notes: `The optics hierarchy is about **how many** things you can be looking at:

\`\`\`js
// lens       exactly one       user.name
// prism      zero or one       the Right of an Either
// traversal  zero or more      every even number in a list
\`\`\`

A traversal reads them all and modifies them in place, structurally speaking:

\`\`\`js
const isEven = (n) => n % 2 === 0

const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.map((x) => (isEven(x) ? f(x) : x))

getAll([1, 2, 3, 4])            // [2, 4]
modify((n) => n * 10, [1, 2, 3, 4])   // [1, 20, 3, 40]
\`\`\`

The non-matching elements are the point. A traversal **narrows what you act on**, it does not
remove anything:

\`\`\`js
const modify = (f, xs) => xs.filter(isEven).map(f)   // [20, 40]. The odds are gone.
const modify = (f, xs) => xs.map(f)                  // [10, 20, 30, 40]. Everything changed.
\`\`\`

And it must not disturb what it was given:

\`\`\`js
const modify = (f, xs) => {
  xs.forEach((x, i) => { if (isEven(x)) xs[i] = f(x) })
  return xs                    // the caller's array just changed
}
\`\`\`

Two consistency properties are worth checking. Modifying with identity changes nothing, and
reading after a modify agrees with modifying what you read:

\`\`\`js
modify((x) => x, xs)              // the same list
getAll(modify(f, xs))             // agrees with getAll(xs).map(f)
                                  // as long as f keeps elements inside the focus
\`\`\`

That caveat matters: if \`f\` turns an even number odd, the focus set itself moves, and the two
sides stop agreeing for a good reason.`,
  rungs: [
    {
      id: 'implement',
      covers: ['leave-the-rest', 'consistency'],
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
      covers: ['many-focuses'],
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
