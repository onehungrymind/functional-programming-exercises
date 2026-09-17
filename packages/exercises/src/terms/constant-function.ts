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

    {
      id: 'use-it',
      kind: 'code',
      role: 'apply',
      covers: ['ignores-argument', 'use-it'],
      title: "Where a function that ignores its argument earns its keep",
      prompt:
        "`always` looks useless until something demands a function where you have a value. Write it, then use it three times: as a default, as a map that flattens everything, and as the branch of a fold that discards.",
      hints: [
        "`always(x)` returns a function that gives back `x` whatever it is called with.",
        "`fillWith` maps every element to the same thing. Pass a function built with `always` rather than writing a lambda.",
        "`countOf` folds, and the step ignores the element entirely.",
      ],
      exports: ['always', 'fillWith', 'countOf', 'defaulted'],
      starter: `// always :: a -> (b -> a)
const always = (x) => x

// fillWith :: (a, [b]) -> [a]
const fillWith = (x, xs) => xs

// countOf :: [a] -> Number   folded, ignoring every element
const countOf = (xs) => 0

// defaulted :: (a | undefined, a) -> a   using a thunk, not a value
const defaulted = (maybe, fallback) => fallback
`,
      solution: `// always :: a -> (b -> a)
const always = (x) => () => x

// fillWith :: (a, [b]) -> [a]
const fillWith = (x, xs) => xs.map(always(x))

// countOf :: [a] -> Number   folded, ignoring every element
const countOf = (xs) => xs.reduce((n) => n + 1, 0)

// defaulted :: (a | undefined, a) -> a   using a thunk, not a value
const defaulted = (maybe, fallback) =>
  maybe === undefined ? always(fallback)() : maybe
`,
      broken: [
        `const always = (x) => x
const fillWith = (x, xs) => xs.map(() => x)
const countOf = (xs) => xs.reduce((n) => n + 1, 0)
const defaulted = (maybe, fallback) => (maybe === undefined ? fallback : maybe)
`,
        `const always = (x) => () => x
const fillWith = (x, xs) => xs.map((y) => y)
const countOf = (xs) => xs.reduce((n) => n + 1, 0)
const defaulted = (maybe, fallback) => (maybe === undefined ? always(fallback)() : maybe)
`,
        `const always = (x) => () => x
const fillWith = (x, xs) => xs.map(always(x))
const countOf = (xs) => xs.reduce((n, y) => n + y, 0)
const defaulted = (maybe, fallback) => (maybe === undefined ? always(fallback)() : maybe)
`,
      ],
      checks: (T, exp) => {
        const { always, fillWith, countOf, defaulted } = exp;

        T.check('always gives back a function', () => {
          return typeof always(1) === 'function' || `always(1) gave ${T.fmt(always(1))}, and it should be waiting to be called.`;
        });

        T.check('That function ignores everything it is handed', () => {
          const f = always('k');
          return (f() === 'k' && f(1) === 'k' && f(1, 2, 3) === 'k') || `It gave ${T.fmt([f(), f(1), f(1, 2, 3)])}.`;
        });

        T.check('fillWith replaces every element', () => {
          const r = fillWith(0, [1, 2, 3]);
          return T.eq(r, [0, 0, 0]) || `fillWith(0, [1, 2, 3]) gave ${T.fmt(r)}.`;
        });

        T.check('fillWith ignores what was there', () => {
          const r = fillWith('x', ['a', 'b']);
          return T.eq(r, ['x', 'x']) || `fillWith('x', ['a', 'b']) gave ${T.fmt(r)}.`;
        });

        T.check('fillWith leaves the list it was given alone', () => {
          const xs = T.freeze([1, 2]);
          fillWith(0, xs);
          return T.eq(xs, [1, 2]) || `The original reads ${T.fmt(xs)}.`;
        });

        T.check('countOf counts without looking at the elements', () => {
          const got = [countOf([]), countOf([9, 9, 9]), countOf(['a', null, undefined])];
          return T.eq(got, [0, 3, 3]) || `It counted ${T.fmt(got)}. The step ignores the element, which is why it works for any of them.`;
        });

        T.check('defaulted supplies the fallback when there is nothing', () => {
          return defaulted(undefined, 'fb') === 'fb' || `It gave ${T.fmt(defaulted(undefined, 'fb'))}.`;
        });

        T.check('defaulted keeps a falsy value that is really there', () => {
          const got = [defaulted(0, 9), defaulted('', 'fb'), defaulted(false, true)];
          return T.eq(got, [0, '', false]) || `It gave ${T.fmt(got)}. Only undefined is missing.`;
        });

        T.check('fillWith uses always rather than writing a lambda', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const fillWith'), src.indexOf('const countOf'));
          return (
            /always\s*\(/.test(body) ||
            'fillWith writes its own throwaway lambda. That lambda IS a constant function, and having one already named is the whole convenience.'
          );
        });
      },
    },
  ],
};
