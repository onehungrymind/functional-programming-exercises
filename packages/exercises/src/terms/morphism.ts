import type { ExerciseSet } from '@fpx/engine/types';

export const morphism: ExerciseSet = {
  termId: 'morphism',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'recognize',
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
