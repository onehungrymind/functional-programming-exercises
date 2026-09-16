import type { ExerciseSet } from '@fpx/engine/types';

export const paramorphism: ExerciseSet = {
  termId: 'paramorphism',
  rubric: [
    {
      id: 'sees-the-remainder',
      statement:
        "Knows a paramorphism gives the step the unconsumed remainder as well as the accumulator and the element.",
    },
    {
      id: 'excludes-current',
      statement:
        "Knows the remainder is what comes after the current element, not including it.",
    },
    {
      id: 'use-it',
      statement:
        "Can express something that needs the remainder, such as the suffixes of a list, which an ordinary fold cannot.",
    },
  ],
  notes: `A [catamorphism](#catamorphism) gives its step the accumulator and one element. A paramorphism
also gives it **what is left**.

\`\`\`js
const para = (step) => (seed) => (xs) => {
  let acc = seed
  for (let i = 0; i < xs.length; i++) {
    acc = step(acc, xs[i], xs.slice(i + 1))
    //                     ^^^^^^^^^^^^^^^ the remainder
  }
  return acc
}
\`\`\`

The remainder is what comes **after** the current element. Including it is the off-by-one to
watch for:

\`\`\`js
xs.slice(i + 1)   // [1,2,3] at i=0 gives [2,3]
xs.slice(i)       // gives [1,2,3], which includes the element you are on
\`\`\`

With it, \`suffixes\` falls out in a line. Without it there is nothing to return, because a
plain fold has already consumed the tail:

\`\`\`js
const suffixes = para((acc, head, tail) => [...acc, tail])([])

suffixes([1, 2, 3])   // [[2, 3], [3], []]
suffixes([])          // []
\`\`\`

Each suffix has to be its own array, or every row ends up pointing at the same list:

\`\`\`js
step(acc, xs[i], xs)   // the same array handed out every time
\`\`\`

It is still a fold, so everything an ordinary one does still works. The extra argument is simply
ignored when you do not need it:

\`\`\`js
const sum = para((acc, x) => acc + x)(0)
sum([1, 2, 3])   // 6
\`\`\`

What it gives you is the **unconsumed input**, not the result of folding it. Having that would
be circular.`,
  rungs: [
    {
      id: 'implement',
      covers: ['sees-the-remainder', 'excludes-current', 'use-it'],
      kind: 'code',
      role: 'implement',
      title: 'A fold that can see what is left',
      prompt:
        'A catamorphism only sees the accumulator and one element. A paramorphism also sees the rest of the structure. Write `para`, then use it for `suffixes`.',
      hints: [
        'The step takes three things: the accumulator, the head, and the remaining tail.',
        '`suffixes` is the classic example, because each step needs the tail it has not folded yet.',
      ],
      exports: ['para', 'suffixes'],
      starter: `// para :: ((b, a, [a]) -> b) -> b -> [a] -> b
const para = (step) => (seed) => (xs) => {
}

// suffixes :: [a] -> [[a]]
// [1, 2, 3] -> [[2, 3], [3], []]
const suffixes = (xs) => {
}
`,
      solution: `// para :: ((b, a, [a]) -> b) -> b -> [a] -> b
const para = (step) => (seed) => (xs) => {
  let acc = seed
  for (let i = 0; i < xs.length; i++) {
    acc = step(acc, xs[i], xs.slice(i + 1))
  }
  return acc
}

// suffixes :: [a] -> [[a]]
const suffixes = para((acc, head, tail) => [...acc, tail])([])
`,
      broken: [
        // The step never gets the tail, so it is an ordinary fold.
        `const para = (step) => (seed) => (xs) => {
  let acc = seed
  for (let i = 0; i < xs.length; i++) acc = step(acc, xs[i])
  return acc
}
const suffixes = para((acc, head, tail) => [...acc, tail])([])
`,
        // The tail includes the current element.
        `const para = (step) => (seed) => (xs) => {
  let acc = seed
  for (let i = 0; i < xs.length; i++) acc = step(acc, xs[i], xs.slice(i))
  return acc
}
const suffixes = para((acc, head, tail) => [...acc, tail])([])
`,
        // Hands the same array each time rather than a fresh tail.
        `const para = (step) => (seed) => (xs) => {
  let acc = seed
  for (let i = 0; i < xs.length; i++) acc = step(acc, xs[i], xs)
  return acc
}
const suffixes = para((acc, head, tail) => [...acc, tail])([])
`,
      ],
      checks: (T, exp) => {
        const para = exp.para as (s: (acc: any, h: any, t: any[]) => any) => (seed: any) => (xs: any[]) => any;
        const suffixes = exp.suffixes as (xs: any[]) => any[][];

        T.check('The step sees the remaining tail', () => {
          const seen: any[][] = [];
          para((acc: null, _h: number, tail: number[]) => {
            seen.push(tail);
            return acc;
          })(null)([1, 2, 3]);
          return (
            T.eq(seen, [[2, 3], [3], []]) ||
            `The tails were ${T.fmt(seen)}, expected [[2, 3], [3], []]. The tail is what comes after the current element.`
          );
        });

        T.check('The tail excludes the current element', () => {
          const seen: any[][] = [];
          para((acc: null, _h: number, tail: number[]) => {
            seen.push(tail);
            return acc;
          })(null)([1, 2]);
          return (
            !seen[0]?.includes(1) ||
            `The first tail was ${T.fmt(seen[0])}. It should be what remains after the head, not including it.`
          );
        });

        T.check('It still folds like an ordinary fold', () => {
          const sum = para((acc: number, x: number) => acc + x)(0);
          const r = sum([1, 2, 3]);
          return r === 6 || `Got ${T.fmt(r)}. A paramorphism is a fold with extra information, not a different traversal.`;
        });

        T.check('suffixes gives each remaining tail', () => {
          const r = suffixes([1, 2, 3]);
          return T.eq(r, [[2, 3], [3], []]) || `Got ${T.fmt(r)}, expected [[2, 3], [3], []].`;
        });

        T.check('suffixes of an empty list is empty', () => {
          const r = suffixes([]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('Each suffix is its own array', () => {
          const r = suffixes([1, 2, 3]);
          return (
            new Set(r).size === r.length ||
            'Some suffixes are the same array object. Each step needs a fresh tail, or they all end up pointing at one list.'
          );
        });

        T.check('The input list is untouched', () => {
          const xs = T.freeze([1, 2, 3]);
          suffixes(xs as number[]);
          return T.eq(xs, [1, 2, 3]) || 'The list changed.';
        });
      },
    },

    {
      id: 'recognize',
      covers: ['sees-the-remainder'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does para add?',
      prompt: 'Compared with an ordinary fold, what extra does a paramorphism give the step function?',
      options: [
        {
          code: '// The part of the structure not yet folded',
          correct: true,
          why: 'That is the whole difference, and it is what makes suffixes expressible.',
        },
        {
          code: '// The index of the current element',
          correct: false,
          why: 'Useful, and easy to thread through an ordinary fold. Not what para is for.',
        },
        {
          code: '// The ability to stop early',
          correct: false,
          why: 'Neither offers that on its own.',
        },
        {
          code: '// The result of folding the rest',
          correct: false,
          why: 'Close, but it is the unfolded remainder, not its result. Getting the result would be circular.',
        },
      ],
    },
  ],
};
