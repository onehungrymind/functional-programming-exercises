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
  notes: `Three separate promises, and code usually breaks exactly one. Being able to say which is the
difference between "this is impure" and knowing how to repair it.

**Every input gets an output.**

\`\`\`js
const half = (n) => {          // broken: odd numbers fall off the end
  if (n % 2 === 0) return n / 2
}
half(4)  // 2
half(3)  // undefined, which is not a Number

const half = (n) => n / 2      // every number has a half
\`\`\`

**Each input gets exactly one output.**

\`\`\`js
const roll = (sides) => Math.ceil(Math.random() * sides)
roll(6)  // 4
roll(6)  // 1     same input, different answer

const roll = (sides, draw) => Math.ceil(draw * sides)
roll(6, 0.5)  // 3
roll(6, 0.5)  // 3     the randomness moved to the caller
\`\`\`

**Nothing else happens.**

\`\`\`js
const hits = []
const track = (n) => {
  hits.push(n)                 // the caller can see this
  return n * 2
}

const track = (n) => [n * 2, n]   // hand the record back instead
\`\`\`

The three are independent, which is the part worth holding onto. Each of these breaks exactly
one:

\`\`\`js
const first = (xs) => xs[0]                    // 1: [] has no first element
const rate = (amount) => amount * TAX_RATE     // 2: TAX_RATE is not an input
const save = (user) => { db.write(user); return user.id }   // 3: the write
\`\`\``,
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

    {
      id: 'repair',
      kind: 'code',
      role: 'apply',
      covers: ['diagnose', 'no-gaps', 'three-requirements'],
      title: "Repair three near-misses",
      prompt:
        "Each of these fails exactly one of the three requirements. Fix each one so it relates every input to exactly one output and does nothing else observable, without changing what it is obviously for.",
      hints: [
        "`half` is fine for even numbers and falls off a cliff for odd ones. Every input needs an output.",
        "`pick` gives a different answer each time it is called with the same list.",
        "`stamp` reaches outside itself for the time. Anything it needs, it should be handed.",
      ],
      exports: ['half', 'pick', 'stamp'],
      starter: `// half :: Number -> Number
const half = (n) => {
  if (n % 2 === 0) return n / 2
}

// pick :: [a] -> a
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)]

// stamp :: String -> String
const stamp = (message) => Date.now() + ' ' + message
`,
      solution: `// half :: Number -> Number
const half = (n) => n / 2

// pick :: [a] -> a
const pick = (xs) => xs[0]

// stamp :: (Number, String) -> String
const stamp = (at, message) => at + ' ' + message
`,
      broken: [
        `const half = (n) => {
  if (n % 2 === 0) return n / 2
}
const pick = (xs) => xs[0]
const stamp = (at, message) => at + ' ' + message
`,
        `const half = (n) => n / 2
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)]
const stamp = (at, message) => at + ' ' + message
`,
        `const half = (n) => n / 2
const pick = (xs) => xs[0]
const stamp = (at, message) => Date.now() + ' ' + message
`,
        `const half = (n) => (n % 2 === 0 ? n / 2 : null)
const pick = (xs) => xs[0]
const stamp = (at, message) => at + ' ' + message
`,
      ],
      checks: (T, exp) => {
        const { half, pick, stamp } = exp;

        T.law('half has an answer for every number, not just the even ones', 80, (G) => {
          const n = G.int();
          const r = half(n);
          if (r === undefined || r === null) return `half(${n}) gave ${T.fmt(r)}. A gap in the inputs is the requirement it was breaking.`;
          return r === n / 2 || `half(${n}) gave ${T.fmt(r)}, expected ${n / 2}.`;
        });

        T.check('half still halves', () => {
          return half(7) === 3.5 || `half(7) gave ${T.fmt(half(7))}. Covering the odd case does not mean rounding it away.`;
        });

        T.law('pick gives the same answer every time for the same list', 60, (G) => {
          const xs = G.ints();
          if (!xs.length) return true;
          T.effects.length = 0;
          const a = pick(xs);
          const b = pick(xs);
          const c = pick(xs);
          if (T.effects.length) return `pick called ${T.effects[0]}. One input has to mean one output, and a random one means many.`;
          return (a === b && b === c) || `pick(${T.fmt(xs)}) gave ${T.fmt(a)}, then ${T.fmt(b)}, then ${T.fmt(c)}.`;
        });

        T.check('pick still picks from the list it was given', () => {
          const xs = [4, 5, 6];
          const r = pick(xs);
          return xs.includes(r) || `pick([4, 5, 6]) gave ${T.fmt(r)}, which is not in the list.`;
        });

        T.check('stamp takes the time rather than reading it', () => {
          T.effects.length = 0;
          const r = stamp(1700000000000, 'saved');
          if (T.effects.length) return `stamp called ${T.effects[0]}. Whatever it needs from outside should arrive as an argument.`;
          return r === '1700000000000 saved' || `stamp(1700000000000, 'saved') gave ${T.fmt(r)}.`;
        });

        T.check('stamp gives the same answer twice', () => {
          return stamp(1, 'x') === stamp(1, 'x') || 'Two calls with the same arguments disagreed.';
        });
      },
    },
  ],
};
