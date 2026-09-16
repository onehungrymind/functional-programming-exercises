import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const semigroup: ExerciseSet = {
  termId: 'semigroup',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
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
