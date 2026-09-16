import type { ExerciseSet } from '@fpx/engine/types';

export const morphism: ExerciseSet = {
  termId: 'morphism',
  rubric: [
    {
      id: 'objects-and-arrows',
      statement:
        "Can identify the objects and the arrow in a piece of code, and knows the arrow need not be reversible.",
    },
    {
      id: 'the-named-kinds',
      statement:
        "Can name a morphism by the relationship it has to its endpoints: endo, iso, or neither.",
    },
  ],
  notes: `A morphism is an arrow between two objects. In everyday code the objects are types and the
arrows are functions.

\`\`\`js
// length :: String -> Number
//           ^^^^^^    ^^^^^^ the objects
// the function itself is the morphism
\`\`\`

Most arrows do not reverse. Many strings share a length, so there is no way back:

\`\`\`js
length('abc')   // 3
length('xyz')   // 3   given 3, which string was it?
\`\`\`

The glossary's "-morphism" words are just names for the relationship an arrow has to its
endpoints:

\`\`\`js
// endomorphism   A -> A          same object at both ends
const upper = (s) => s.toUpperCase()

// isomorphism    A -> B with an inverse
const toPair = (c) => [c.x, c.y]
const toCoords = (p) => ({ x: p[0], y: p[1] })

// automorphism   A -> A with an inverse
const negate = (n) => -n

// neither        A -> B, no way back
const length = (s) => s.length
\`\`\`

The other family in this glossary, catamorphism and its relatives, names arrows by the **shape
of the recursion** rather than by the endpoints. Same suffix, different question being answered.

The reason any of it is worth naming: once you know arrows compose and that composition is
associative with an identity, you have a [category](#category), and every result about
categories applies.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['objects-and-arrows'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Objects and arrows',
      prompt:
        'In `const length = (s: String): Number => s.length`, which statements are true?',
      options: [
        { code: '// String and Number are the objects', correct: true, why: 'The things the arrow goes between.' },
        { code: '// length is the morphism', correct: true, why: 'The arrow itself: a transformation from one object to another.' },
        {
          code: '// The morphism has to be reversible',
          correct: false,
          why: 'Only an isomorphism is. Many strings share a length, so this one cannot be undone.',
        },
        {
          code: '// A morphism can go from an object to itself',
          correct: true,
          why: 'That is an endomorphism, and it is perfectly ordinary.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['the-named-kinds', 'objects-and-arrows'],
      kind: 'code',
      role: 'implement',
      title: 'Classify the arrows',
      prompt:
        'Write `classify`, which reports how a morphism relates its two objects: `endo` when they are the same, and `iso` when a reverse morphism is supplied.',
      hints: [
        'The names describe the shape of the arrow, not what it computes.',
        'A morphism from an object to itself that also has an inverse is both, and "auto" is the word for it.',
      ],
      exports: ['classify'],
      starter: `// classify :: ({ from, to, hasInverse }) -> String
// "endo"  from and to are the same object
// "iso"   there is an inverse
// "auto"  both
// "plain" neither
const classify = (arrow) => {
}
`,
      solution: `// classify :: ({ from, to, hasInverse }) -> String
const classify = (arrow) => {
  const endo = arrow.from === arrow.to
  const iso = arrow.hasInverse === true
  if (endo && iso) return 'auto'
  if (endo) return 'endo'
  if (iso) return 'iso'
  return 'plain'
}
`,
      broken: [
        // Checks endo first and returns early, so "auto" is never reached.
        `const classify = (arrow) => {
  if (arrow.from === arrow.to) return 'endo'
  if (arrow.hasInverse === true) return 'iso'
  return 'plain'
}
`,
        // Treats any truthy hasInverse the same, and has the two names swapped.
        `const classify = (arrow) => {
  const endo = arrow.from === arrow.to
  const iso = arrow.hasInverse === true
  if (endo && iso) return 'auto'
  if (endo) return 'iso'
  if (iso) return 'endo'
  return 'plain'
}
`,
      ],
      checks: (T, exp) => {
        const classify = exp.classify as (a: { from: string; to: string; hasInverse: boolean }) => string;

        T.check('An arrow between two different objects with no inverse is plain', () => {
          const r = classify({ from: 'String', to: 'Number', hasInverse: false });
          return r === 'plain' || `Got ${T.fmt(r)}`;
        });

        T.check('An arrow from an object to itself is endo', () => {
          const r = classify({ from: 'Number', to: 'Number', hasInverse: false });
          return r === 'endo' || `Got ${T.fmt(r)}`;
        });

        T.check('An arrow with an inverse between different objects is iso', () => {
          const r = classify({ from: 'Celsius', to: 'Fahrenheit', hasInverse: true });
          return r === 'iso' || `Got ${T.fmt(r)}`;
        });

        T.check('Both at once is auto', () => {
          const r = classify({ from: 'Number', to: 'Number', hasInverse: true });
          return (
            r === 'auto' ||
            `Got ${T.fmt(r)}. Checking endo first and returning straight away would never reach this case.`
          );
        });

        T.check('Every combination gets its own name', () => {
          const all = [
            classify({ from: 'A', to: 'B', hasInverse: false }),
            classify({ from: 'A', to: 'A', hasInverse: false }),
            classify({ from: 'A', to: 'B', hasInverse: true }),
            classify({ from: 'A', to: 'A', hasInverse: true }),
          ];
          return (
            new Set(all).size === 4 ||
            `The four combinations gave ${T.fmt(all)}. Each one has its own name.`
          );
        });
      },
    },
  ],
};
