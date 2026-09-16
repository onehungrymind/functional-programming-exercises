import type { ExerciseSet } from '@fpx/engine/types';

export const functionTerm: ExerciseSet = {
  termId: 'function',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which one is a function in the strict sense?',
      prompt:
        'A function relates every input to exactly one output, and does nothing else that you could observe. Pick the one that meets all of it.',
      options: [
        {
          code: 'const half = (n) => {\n  if (n % 2) return\n  return n / 2\n}',
          correct: false,
          why: 'Odd numbers fall off the end and get undefined, so not every input is related to an output.',
        },
        {
          code: 'const roll = (sides) => Math.ceil(Math.random() * sides)',
          correct: false,
          why: 'The same input gives different outputs, so it relates one input to many.',
        },
        {
          code: 'const double = (n) => n * 2',
          correct: true,
          why: 'Every number has exactly one double, and nothing outside the expression is touched.',
        },
        {
          code: 'const track = (n) => {\n  hits.push(n)\n  return n * 2\n}',
          correct: false,
          why: 'The return value is fine, but pushing to hits is an effect you can observe from outside.',
        },
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Relate every input to exactly one output',
      prompt:
        '`toLabel` should hand back a string for any integer at all, with no gaps. Negative, zero, and huge values included.',
      hints: [
        'Every branch has to end in a return. A path that falls off the end returns undefined, which is a gap.',
        'Think about what is left over once you have handled negative and zero.',
      ],
      exports: ['toLabel'],
      starter: `// toLabel :: Number -> String
// negative -> "below", zero -> "zero", positive -> "above"
const toLabel = (n) => {
  if (n < 0) return 'below'
  if (n === 0) return 'zero'
}
`,
      solution: `// toLabel :: Number -> String
const toLabel = (n) => {
  if (n < 0) return 'below'
  if (n === 0) return 'zero'
  return 'above'
}
`,
      broken: [
        // The starter: positives fall through and get undefined.
        `const toLabel = (n) => {
  if (n < 0) return 'below'
  if (n === 0) return 'zero'
}
`,
        // Zero is swallowed by the negative branch.
        `const toLabel = (n) => {
  if (n <= 0) return 'below'
  return 'above'
}
`,
      ],
      checks: (T, exp) => {
        const toLabel = exp.toLabel as (n: number) => string;

        T.check('The three cases come back with the right label', () => {
          const cases: [number, string][] = [
            [-5, 'below'],
            [0, 'zero'],
            [7, 'above'],
          ];
          for (const [n, want] of cases) {
            const got = toLabel(n);
            if (got !== want) return `toLabel(${n}) gave ${T.fmt(got)} instead of ${T.fmt(want)}.`;
          }
          return true;
        });

        T.law('Every integer gets a string, with no gaps', 120, (G) => {
          const n = G.int();
          const out = toLabel(n);
          return (
            typeof out === 'string' ||
            `toLabel(${n}) gave ${T.fmt(out)}. A function relates every input to exactly one output, so no input may fall through.`
          );
        });

        T.law('The same input always gives the same output', 60, (G) => {
          const n = G.int();
          const a = toLabel(n);
          const b = toLabel(n);
          return a === b || `toLabel(${n}) gave ${T.fmt(a)} then ${T.fmt(b)}. One input, one output.`;
        });

        T.check('Nothing outside the function is touched', () => {
          T.effects.length = 0;
          toLabel(3);
          return T.effects.length === 0 || `Called ${[...new Set(T.effects)].join(', ')}.`;
        });
      },
    },
  ],
};
