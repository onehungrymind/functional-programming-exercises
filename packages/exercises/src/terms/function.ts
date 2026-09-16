import type { ExerciseSet } from '@fpx/engine/types';

export const functionTerm: ExerciseSet = {
  termId: 'function',
  rubric: [
    {
      id: 'three-requirements',
      statement:
        'Can state what a function has to do to earn the name: relate every input to exactly one output, and do nothing else you could observe.',
    },
    {
      id: 'diagnose',
      statement:
        'Given a definition that falls short, can say which of the three requirements it breaks, rather than just that it is "impure".',
    },
    {
      id: 'no-gaps',
      statement:
        'Can write a definition with no input that falls through, including the cases a quick reading misses.',
    },
  ],
  notes: `A glossary will tell you a function maps inputs to outputs. The useful version is
three separate promises, because code usually breaks exactly one of them and it is worth
being able to say which.

**Every input gets an output.** Not most inputs. A branch with no \`return\` hands back
\`undefined\`, which is a gap wearing a value's clothing. This is the requirement
[partial functions](#partial-function) fail.

**Each input gets exactly one output.** The same argument, today and tomorrow, gives the same
answer. Reading a clock, a global, or a random number breaks this, because the input no longer
determines the result.

**Nothing else happens.** No writing to anything the caller can see, no logging, no mutating
the argument. This is the requirement [side effects](#side-effects) fail.

Only the first is about the function's shape; the other two are about what it touches. That is
why \`const half = (n) => n / 2\` is a function and \`const roll = (n) => Math.ceil(Math.random() * n)\`
is not, even though both are one line and neither throws.

The three are independent, which is the part worth internalizing. A definition can be perfectly
total and still read a global. It can be deterministic and still push to an array. When
something is not a function, the interesting question is which promise it broke, because that
tells you how to repair it.`,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      covers: ['three-requirements', 'diagnose'],
      title: 'Which one is a function in the strict sense?',
      prompt:
        'A function relates every input to exactly one output, and does nothing else that you could observe. Pick the one that meets all three.',
      options: [
        {
          code: 'const half = (n) => {\n  if (n % 2) return\n  return n / 2\n}',
          correct: false,
          why: 'Breaks the first promise. Odd numbers fall off the end and get undefined, so not every input has an output.',
        },
        {
          code: 'const roll = (sides) => Math.ceil(Math.random() * sides)',
          correct: false,
          why: 'Breaks the second. The same input gives different answers, so the input does not determine the output.',
        },
        {
          code: 'const double = (n) => n * 2',
          correct: true,
          why: 'All three hold. Every number has a double, it is always the same one, and nothing outside is touched.',
        },
        {
          code: 'const track = (n) => {\n  hits.push(n)\n  return n * 2\n}',
          correct: false,
          why: 'Breaks the third. The return value is fine, but pushing to hits is visible from outside.',
        },
      ],
    },

    {
      id: 'diagnose',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      covers: ['diagnose'],
      title: 'Which promise does each one break?',
      prompt:
        'Each definition below fails exactly one of the three. Select the ones that fail the second: same input, same output.',
      options: [
        {
          code: 'const idFor = (name) => `${name}-${Date.now()}`',
          correct: true,
          why: 'Reads the clock, so calling it twice with the same name gives two answers.',
        },
        {
          code: 'const first = (xs) => xs[0]',
          correct: false,
          why: 'Deterministic and effect-free. It fails the first promise instead: an empty list has no first element.',
        },
        {
          code: 'let count = 0\nconst next = () => ++count',
          correct: true,
          why: 'Depends on a binding outside itself, so the answer changes every call. It also fails the third by writing to it.',
        },
        {
          code: 'const save = (user) => {\n  db.write(user)\n  return user.id\n}',
          correct: false,
          why: 'Fails the third. The return value is perfectly predictable; the write to db is the problem.',
        },
        {
          code: 'const rateFor = (amount) => amount * TAX_RATE',
          correct: true,
          why: 'TAX_RATE is not an input. Change it and the same amount gives a different answer.',
        },
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      covers: ['no-gaps', 'three-requirements'],
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
          T.logs.length = 0;
          toLabel(3);
          if (T.effects.length) return `Called ${[...new Set(T.effects)].join(', ')}.`;
          return T.logs.length === 0 || `It printed ${T.fmt(T.logs)}. Logging is observable from outside.`;
        });
      },
    },
  ],
};
