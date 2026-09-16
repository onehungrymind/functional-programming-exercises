import type { ExerciseSet } from '@fpx/engine/types';

export const constantFunction: ExerciseSet = {
  termId: 'constant-function',
  rubric: [
    {
      id: 'value-to-function',
      statement:
        "Can turn a value into a function that answers it regardless of what it is asked.",
    },
    {
      id: 'ignores-argument',
      statement:
        "Knows it never looks at its argument, so it is safe to pass one that would be expensive or would throw.",
    },
    {
      id: 'use-it',
      statement:
        "Can use it where a function is required but the input is irrelevant, without naming the argument.",
    },
  ],
  notes: `\`constant\` turns a value into a function that answers with it, whatever it is asked. It is the
K combinator wearing a friendlier name.

\`\`\`js
const constant = (a) => () => a

const always5 = constant(5)
always5()          // 5
always5('x')       // 5
always5(null, 1)   // 5
\`\`\`

It genuinely never looks at what it is given, which is what makes it safe in places an ordinary
function would not be:

\`\`\`js
constant('kept')(() => { throw new Error('never runs') })   // 'kept'
\`\`\`

Its use is anywhere an API demands a function but the input is beside the point:

\`\`\`js
const map = (fn) => (xs) => xs.map(fn)

const allZero = (xs) => xs.map(() => 0)   // names the list, and the element
const allZero = map(constant(0))          // neither

allZero([1, 'two', { three: 3 }])          // [0, 0, 0]
\`\`\`

It also turns up as the default branch of a fold, and as the "leave it alone" case in optics,
where you need a function with the right shape that does nothing interesting.`,
  rungs: [
    {
      id: 'implement',
      covers: ['value-to-function', 'ignores-argument'],
      kind: 'code',
      role: 'implement',
      title: 'Write constant',
      prompt:
        '`constant(a)` gives back a function that answers `a` no matter what it is asked. It is the K combinator, and it turns a value into a function.',
      hints: ['One argument in, a function out. That function ignores everything it is given.'],
      exports: ['constant'],
      starter: `// constant :: a -> (b -> a)
const constant = (a) => {
}
`,
      solution: `// constant :: a -> (b -> a)
const constant = (a) => () => a
`,
      broken: [
        // Returns the argument it is later given rather than the one it was built with.
        `const constant = (a) => (b) => b
`,
        // Returns the value, not a function.
        `const constant = (a) => a
`,
      ],
      checks: (T, exp) => {
        const constant = exp.constant as <A>(a: A) => (...args: unknown[]) => A;

        T.check('It gives back a function', () => {
          const f = constant(1);
          return typeof f === 'function' || `Got ${T.fmt(f)}. constant turns a value into a function.`;
        });

        T.law('The function always answers the value it was built with', 60, (G) => {
          const a = G.int();
          const b = G.int();
          const r = constant(a)(b);
          return r === a || `constant(${a})(${b}) gave ${T.fmt(r)}. Whatever it is asked, the answer is ${a}.`;
        });

        T.check('It ignores its argument completely', () => {
          const spy = T.spyFn(() => 'boom');
          constant('kept')(spy);
          return spy.calls.length === 0 || 'It called its argument. A constant function should not look at it at all.';
        });

        T.check('It works for any value, not just numbers', () => {
          const o = { a: 1 };
          return constant(o)('anything') === o || 'It should hand back the very same value it was given.';
        });

        T.check('Calling it repeatedly gives the same answer', () => {
          const f = constant(7);
          return (f(1) === 7 && f('x') === 7 && f(null) === 7) || `Repeated calls gave ${T.fmt([f(1), f('x'), f(null)])}.`;
        });
      },
    },

    {
      id: 'apply',
      covers: ['use-it', 'value-to-function'],
      kind: 'code',
      role: 'apply',
      title: 'Use it to blank a list',
      prompt:
        'Using `constant`, define `allZero`, which replaces every element of a list with 0. Write it without naming the list or the element.',
      hints: ['`map(constant(0))` already does it. Bind that directly.'],
      exports: ['allZero'],
      starter: `const constant = (a) => () => a
const map = (fn) => (xs) => xs.map(fn)

// allZero :: [a] -> [Number]
const allZero = (xs) => xs.map(() => 0)
`,
      solution: `const constant = (a) => () => a
const map = (fn) => (xs) => xs.map(fn)

// allZero :: [a] -> [Number]
const allZero = map(constant(0))
`,
      broken: [
        // Right answer, wrong shape: the rung is about composing the pieces.
        `const constant = (a) => () => a
const map = (fn) => (xs) => xs.map(fn)

const allZero = (xs) => xs.map(() => 0)
`,
        // Point-free, wrong constant.
        `const constant = (a) => () => a
const map = (fn) => (xs) => xs.map(fn)

const allZero = map(constant(1))
`,
      ],
      checks: (T, exp) => {
        const allZero = exp.allZero as (xs: unknown[]) => number[];

        T.check('Every element becomes 0', () => {
          const r = allZero([1, 'two', { three: 3 }]);
          return T.eq(r, [0, 0, 0]) || `Got ${T.fmt(r)}, expected [0, 0, 0].`;
        });

        T.check('An empty list stays empty', () => {
          const r = allZero([]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('The input list is left alone', () => {
          const xs = T.freeze([1, 2, 3]);
          allZero(xs as number[]);
          return T.eq(xs, [1, 2, 3]) || 'The list changed.';
        });

        T.check('It is built from map and constant', () => T.shape.isPointFree('allZero'));
      },
    },
  ],
};
