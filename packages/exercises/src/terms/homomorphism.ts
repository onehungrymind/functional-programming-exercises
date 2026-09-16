import type { ExerciseSet } from '@fpx/engine/types';

export const homomorphism: ExerciseSet = {
  termId: 'homomorphism',
  rubric: [
    {
      id: 'structure-preserving',
      statement:
        "Knows a homomorphism makes combining before the map equal combining after, and can state that as an equation.",
    },
    {
      id: 'identify',
      statement:
        "Can tell whether a map between two combining operations preserves the structure, including cases where it does not.",
    },
    {
      id: 'identity-maps-to-identity',
      statement:
        "Knows the identity of the source has to map to the identity of the target.",
    },
  ],
  notes: `A homomorphism carries one structure into another so that **combining before the map equals
combining after**. That single equation is the whole definition.

\`\`\`js
length(a.concat(b)) === length(a) + length(b)
//     ^^^^^^^^^^^ combine then map      ^^^ map then combine
\`\`\`

So \`length\` is a homomorphism from lists-under-concatenation to numbers-under-addition:

\`\`\`js
length([1, 2].concat([3]))         // 3
length([1, 2]) + length([3])       // 3
\`\`\`

The target operation has to be the right one. \`maximum\` does not preserve into addition, but
it does into max:

\`\`\`js
maximum([1, 5].concat([3]))           // 5
maximum([1, 5]) + maximum([3])        // 8    not a homomorphism into (Number, +)
Math.max(maximum([1, 5]), maximum([3])) // 5  but it is into (Number, max)
\`\`\`

And anything that collapses duplicates breaks it, because the two sides stop counting the same
things:

\`\`\`js
const unique = (xs) => new Set(xs).size
unique([1].concat([1]))            // 1
unique([1]) + unique([1])          // 2
\`\`\`

One consequence worth remembering: the identity has to map to the identity, which follows from
the law and is a quick sanity check.

\`\`\`js
length([])   // 0, which is the identity for addition
\`\`\`

This is also the name of one of the applicative laws, \`A.of(f).ap(A.of(x))\` equals
\`A.of(f(x))\`, which says \`of\` is structure-preserving in exactly this sense.`,
  rungs: [
    {
      id: 'implement',
      covers: ['structure-preserving', 'identity-maps-to-identity'],
      kind: 'code',
      role: 'implement',
      title: 'A map that preserves the structure',
      prompt:
        'A homomorphism carries one structure into another so that combining before or after the map gives the same answer. Write one from lists to their lengths.',
      hints: [
        'Lists combine by concatenation; numbers combine by addition.',
        '`length(a ++ b)` has to equal `length(a) + length(b)`. That equation is the whole definition.',
      ],
      exports: ['toLength', 'combineLists', 'combineLengths'],
      starter: `// toLength :: [a] -> Number
const toLength = (xs) => {
}

// combineLists :: ([a], [a]) -> [a]
const combineLists = (a, b) => {
}

// combineLengths :: (Number, Number) -> Number
const combineLengths = (a, b) => {
}
`,
      solution: `// toLength :: [a] -> Number
const toLength = (xs) => xs.length

// combineLists :: ([a], [a]) -> [a]
const combineLists = (a, b) => [...a, ...b]

// combineLengths :: (Number, Number) -> Number
const combineLengths = (a, b) => a + b
`,
      broken: [
        // Multiplying does not match concatenation.
        `const toLength = (xs) => xs.length
const combineLists = (a, b) => [...a, ...b]
const combineLengths = (a, b) => a * b
`,
        // Deduplicating breaks the correspondence.
        `const toLength = (xs) => xs.length
const combineLists = (a, b) => [...new Set([...a, ...b])]
const combineLengths = (a, b) => a + b
`,
        // Counting distinct elements does not preserve the structure either.
        `const toLength = (xs) => new Set(xs).size
const combineLists = (a, b) => [...a, ...b]
const combineLengths = (a, b) => a + b
`,
      ],
      checks: (T, exp) => {
        const toLength = exp.toLength as (xs: unknown[]) => number;
        const combineLists = exp.combineLists as (a: unknown[], b: unknown[]) => unknown[];
        const combineLengths = exp.combineLengths as (a: number, b: number) => number;

        T.check('toLength measures the list', () => {
          const r = toLength([1, 2, 3]);
          return r === 3 || `Got ${T.fmt(r)}`;
        });

        T.check('Lists combine by joining them', () => {
          const r = combineLists([1, 2], [3]);
          return T.eq(r, [1, 2, 3]) || `Got ${T.fmt(r)}`;
        });

        T.check('The empty cases line up', () => {
          const emptyList = toLength(combineLists([], []));
          const emptyNumber = combineLengths(toLength([]), toLength([]));
          return (
            emptyList === emptyNumber ||
            `Joining two empty lists measured ${T.fmt(emptyList)}, but combining their lengths gave ${T.fmt(emptyNumber)}. The identity has to map to the identity.`
          );
        });

        T.law('Combining before the map equals combining after', 80, (G) => {
          const a = G.ints();
          const b = G.ints();
          const before = toLength(combineLists(a, b));
          const after = combineLengths(toLength(a), toLength(b));
          return (
            before === after ||
            `With ${T.fmt(a)} and ${T.fmt(b)}: measuring the joined list gave ${T.fmt(before)}, combining the two measurements gave ${T.fmt(after)}. A homomorphism is exactly the promise that these agree.`
          );
        });

        T.check('Duplicates are not collapsed anywhere', () => {
          const a = [1, 1];
          const b = [1];
          const before = toLength(combineLists(a, b));
          const after = combineLengths(toLength(a), toLength(b));
          return (
            before === 3 && after === 3 ||
            `With ${T.fmt(a)} and ${T.fmt(b)}: got ${T.fmt(before)} and ${T.fmt(after)}, expected 3 for both. Deduplicating on either side breaks the correspondence.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['identify', 'structure-preserving'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are homomorphisms?',
      prompt:
        'Each maps one monoid into another. Select the ones where combining before the map equals combining after.',
      options: [
        {
          code: '// length :: ([a], ++) -> (Number, +)',
          correct: true,
          why: 'The length of a join is the sum of the lengths.',
        },
        {
          code: '// sum :: ([Number], ++) -> (Number, +)',
          correct: true,
          why: 'The sum of a joined list is the sum of the two sums.',
        },
        {
          code: '// head :: ([a], ++) -> (a, first)',
          correct: true,
          why: 'The head of a join is the head of the first, which is what "keep the first" does. It needs a Maybe for the empty case.',
        },
        {
          code: '// maximum :: ([Number], ++) -> (Number, +)',
          correct: false,
          why: 'The maximum of a join is the larger of the two maxima, not their sum. It would be a homomorphism into (Number, max).',
        },
        {
          code: '// unique :: ([a], ++) -> (Number, +)',
          correct: false,
          why: 'Joining two lists that share an element loses one from the count, so the two sides disagree.',
        },
      ],
    },
  ],
};
