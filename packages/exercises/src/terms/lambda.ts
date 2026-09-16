import type { ExerciseSet } from '@fpx/engine/types';

export const lambda: ExerciseSet = {
  termId: 'lambda',
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'What makes something a lambda?',
      prompt:
        'A lambda is a function treated as a value: it needs no name, and it can be passed, returned, and stored. Select every true statement.',
      options: [
        {
          code: '// A lambda can be passed straight to another function\n[1, 2, 3].map(x => x * 2)',
          correct: true,
          why: 'Being usable as an argument without ever being named is the whole point.',
        },
        {
          code: '// A lambda must be assigned to a variable first',
          correct: false,
          why: 'You can name one for convenience, but it is a value either way and can be used inline.',
        },
        {
          code: '// A lambda can be returned from another function\nconst adder = a => b => a + b',
          correct: true,
          why: 'Returning one is as ordinary as returning a number.',
        },
        {
          code: '// A lambda can be invoked the moment it is defined\n(x => x * 2)(4)',
          correct: true,
          why: 'It is a value, so it can be applied on the spot. That is the immediately invoked form.',
        },
        {
          code: '// Lambdas are a different kind of thing from named functions',
          correct: false,
          why: 'Same thing. The only difference is that one happens to have a name bound to it.',
        },
      ],
    },

    {
      id: 'guided',
      kind: 'code',
      role: 'guided',
      title: 'Inline the named callbacks',
      prompt:
        'This pipeline names three one-line helpers that are used once each. Replace them with lambdas written where they are used.',
      hints: [
        'Each helper body becomes the body of an arrow passed straight to map or filter.',
        '`process` should end up as one chained expression with no helper names left.',
      ],
      exports: ['process'],
      starter: `function double(n) { return n * 2 }
function isBig(n) { return n > 10 }
function label(n) { return \`#\${n}\` }

// process :: [Number] -> [String]
const process = (ns) => ns.map(double).filter(isBig).map(label)
`,
      solution: `// process :: [Number] -> [String]
const process = (ns) =>
  ns
    .map((n) => n * 2)
    .filter((n) => n > 10)
    .map((n) => \`#\${n}\`)
`,
      broken: [
        // The starter: still leaning on named declarations.
        `function double(n) { return n * 2 }
function isBig(n) { return n > 10 }
function label(n) { return \`#\${n}\` }

const process = (ns) => ns.map(double).filter(isBig).map(label)
`,
        // Inlined, but the filter boundary moved.
        `const process = (ns) =>
  ns
    .map((n) => n * 2)
    .filter((n) => n >= 10)
    .map((n) => \`#\${n}\`)
`,
      ],
      checks: (T, exp) => {
        const process = exp.process as (ns: number[]) => string[];

        T.check('The pipeline still gives the same answer', () => {
          const r = process([1, 4, 6, 9]);
          return T.eq(r, ['#12', '#18']) || `process([1, 4, 6, 9]) gave ${T.fmt(r)}, expected ['#12', '#18'].`;
        });

        T.check('The boundary is still "greater than 10", not "at least 10"', () => {
          const r = process([5]);
          return T.eq(r, []) || `5 doubles to exactly 10, which is not bigger than 10, so it should drop. Got ${T.fmt(r)}.`;
        });

        T.check('An empty list stays empty', () => {
          const r = process([]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('No named helper functions are left', () => {
          const declared = T.src.match(/function\s+\w+/g) ?? [];
          return (
            declared.length === 0 ||
            `Still declaring ${declared.join(', ')}. A callback used once reads better written where it is used.`
          );
        });
      },
    },
  ],
};
