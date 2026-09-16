import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const semigroup: ExerciseSet = {
  termId: 'semigroup',
  rubric: [
    {
      id: 'concat-stays-inside',
      statement:
        "Can write a concat that returns the same type, so three values can be combined in one chain.",
    },
    {
      id: 'associativity',
      statement:
        "Knows associativity is the only requirement, and can name operations that have it and ones that do not.",
    },
    {
      id: 'several-instances',
      statement:
        "Knows one type can be a semigroup in several ways, and that the wrapper is what picks which.",
    },
  ],
  notes: `A Semigroup is a type with an associative \`concat\`. That is the whole definition: no identity,
no inverse, nothing else.

\`\`\`js
const Max = (value) => ({
  value,
  concat: (other) => Max(value > other.value ? value : other.value)
})

Max(3).concat(Max(7))            // Max(7)
Max(1).concat(Max(9)).concat(Max(5))   // Max(9)
\`\`\`

\`concat\` has to stay **inside** the type, or the second link in the chain has nothing to call:

\`\`\`js
concat: (other) => Math.max(value, other.value)   // gives a number
Max(1).concat(Max(2)).concat(Max(3))              // TypeError
\`\`\`

Associativity means the grouping cannot change the answer:

\`\`\`js
(1 + 2) + 3 === 1 + (2 + 3)      // addition: yes
(1 - 2) - 3 === 1 - (2 - 3)      // subtraction: -4 vs 2. No.
(8 / 4) / 2 === 8 / (4 / 2)      // division: 1 vs 4. No.
\`\`\`

Even "always keep the left one" is associative, which is why \`First\` is a legitimate semigroup
if not a very exciting one.

A type is usually a semigroup in **more than one way**, and the wrapper is how you choose:

\`\`\`js
Max(3).concat(Max(7)).value    // 7
Min(3).concat(Min(7)).value    // 3
Sum(3).concat(Sum(7)).value    // 10
\`\`\`

That is why they are wrapped at all. \`Number\` on its own does not say which combination you
meant.`,
  rungs: [
    {
      id: 'implement',
      covers: ['concat-stays-inside', 'associativity', 'several-instances'],
      kind: 'code',
      role: 'implement',
      title: 'Three ways to combine two things',
      prompt:
        'A Semigroup has a `concat` that is associative. Write three of them over numbers: keep the larger, keep the smaller, keep the first.',
      hints: [
        'Each `concat` takes another value of the same type and gives one back.',
        'Associativity is what makes them semigroups. `First` is associative even though it ignores its argument.',
      ],
      exports: ['Max', 'Min', 'First'],
      starter: `const Max = (value) => ({
  value,
  concat: (other) => {
  },
  inspect: () => \`Max(\${value})\`
})

const Min = (value) => ({
  value,
  concat: (other) => {
  },
  inspect: () => \`Min(\${value})\`
})

const First = (value) => ({
  value,
  concat: (other) => {
  },
  inspect: () => \`First(\${value})\`
})
`,
      solution: `const Max = (value) => ({
  value,
  concat: (other) => Max(value > other.value ? value : other.value),
  inspect: () => \`Max(\${value})\`
})

const Min = (value) => ({
  value,
  concat: (other) => Min(value < other.value ? value : other.value),
  inspect: () => \`Min(\${value})\`
})

const First = (value) => ({
  value,
  concat: (other) => First(value),
  inspect: () => \`First(\${value})\`
})
`,
      broken: [
        // Max and Min swapped.
        `const Max = (value) => ({ value, concat: (other) => Max(Math.min(value, other.value)), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.max(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value), inspect: () => \`First(\${value})\` })
`,
        // concat gives back a raw number, so you cannot concat again.
        `const Max = (value) => ({ value, concat: (other) => Math.max(value, other.value), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.min(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value), inspect: () => \`First(\${value})\` })
`,
        // First keeps the last instead, and subtraction is not associative.
        `const Max = (value) => ({ value, concat: (other) => Max(Math.max(value, other.value)), inspect: () => \`Max(\${value})\` })
const Min = (value) => ({ value, concat: (other) => Min(Math.min(value, other.value)), inspect: () => \`Min(\${value})\` })
const First = (value) => ({ value, concat: (other) => First(value - other.value), inspect: () => \`First(\${value})\` })
`,
      ],
      checks: (T, exp) => {
        const Max = exp.Max as (n: number) => any;
        const Min = exp.Min as (n: number) => any;
        const First = exp.First as (n: number) => any;

        T.check('Max keeps the larger', () => {
          const r = Max(3).concat(Max(7));
          return r?.value === 7 || `Got ${T.fmt(r)}, expected Max(7).`;
        });

        T.check('Min keeps the smaller', () => {
          const r = Min(3).concat(Min(7));
          return r?.value === 3 || `Got ${T.fmt(r)}, expected Min(3).`;
        });

        T.check('First keeps the left-hand one', () => {
          const r = First(3).concat(First(7));
          return r?.value === 3 || `Got ${T.fmt(r)}, expected First(3).`;
        });

        T.check('concat gives back something you can concat again', () => {
          const r = Max(1).concat(Max(2));
          return (
            typeof r?.concat === 'function' ||
            `Got ${T.fmt(r)}. concat has to stay inside the type, or a chain of three cannot work.`
          );
        });

        T.check('Three combine in one chain', () => {
          const r = Max(1).concat(Max(9)).concat(Max(5));
          return r?.value === 9 || `Got ${T.fmt(r)}, expected Max(9).`;
        });

        laws.semigroup(T, { of: Max, lift: Max, runs: 50 });
        laws.semigroup(T, { of: Min, lift: Min, runs: 50 });
        laws.semigroup(T, { of: First, lift: First, runs: 50 });
      },
    },

    {
      id: 'recognize',
      covers: ['associativity'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which operations are associative?',
      prompt: 'A semigroup needs associativity and nothing else. Select every operation that has it.',
      options: [
        { code: '(a, b) => a + b', correct: true, why: 'Addition groups either way.' },
        {
          code: '(a, b) => a - b',
          correct: false,
          why: '(1 - 2) - 3 is -4, but 1 - (2 - 3) is 2.',
        },
        { code: '(a, b) => Math.max(a, b)', correct: true, why: 'The largest of three is the largest however you group them.' },
        {
          code: '(a, b) => a / b',
          correct: false,
          why: 'Division is not associative either. Try 8, 4, 2.',
        },
        { code: '(a, b) => a.concat(b)  // string concat', correct: true, why: 'Joining text groups either way.' },
        { code: '(a, b) => a', correct: true, why: 'Always keeping the left one is associative, if not very useful.' },
      ],
    },
  ],
};
