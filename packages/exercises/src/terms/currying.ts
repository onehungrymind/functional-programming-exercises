import type { ExerciseSet } from '@fpx/engine/types';

export const currying: ExerciseSet = {
  termId: 'currying',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Spot the curried functions',
      prompt:
        'A curried function takes one argument at a time. Select every definition below that is fully curried.',
      options: [
        {
          code: 'const add = (a, b) => a + b',
          correct: false,
          why: 'Takes both arguments at once, so its arity is 2.',
        },
        {
          code: 'const add = a => b => a + b',
          correct: true,
          why: 'Each call takes one argument and returns the next function.',
        },
        {
          code: 'const clamp = min => max => x =>\n  Math.min(max, Math.max(min, x))',
          correct: true,
          why: 'Three unary steps. Curried functions can be as deep as you need.',
        },
        {
          code: 'const sum3 = a => (b, c) => a + b + c',
          correct: false,
          why: 'The second step takes two arguments, so it is only partly curried.',
        },
        {
          code: 'const sumAll = (...xs) =>\n  xs.reduce((a, b) => a + b, 0)',
          correct: false,
          why: 'Variadic: it takes any number of arguments in one call.',
        },
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Write curry2',
      prompt:
        'Turn any two-argument function into a curried one. Nothing should run until both arguments have arrived.',
      hints: [
        'The outer function takes `f` and returns a function that takes `a`.',
        'That function returns another function, and only the innermost one has both `a` and `b` to call `f` with.',
      ],
      exports: ['curry2'],
      starter: `// curry2 :: ((a, b) -> c) -> a -> b -> c
const curry2 = (f) => {
  // return a function that takes a,
  // which returns a function that takes b
}
`,
      solution: `// curry2 :: ((a, b) -> c) -> a -> b -> c
const curry2 = (f) => (a) => (b) => f(a, b)
`,
      broken: [
        // The classic mistake: collapsing the two steps back into one call.
        `const curry2 = (f) => (a, b) => f(a, b)\n`,
        // Eager: calls f before the second argument exists.
        `const curry2 = (f) => (a) => f(a, undefined)\n`,
      ],
      checks: (T, exp) => {
        const curry2 = exp.curry2 as (f: (a: number, b: number) => number) => any;
        const sub = (a: number, b: number) => a - b;

        T.check('curry2(sub) returns a function', () =>
          typeof curry2(sub) === 'function' || `Got ${T.fmt(curry2(sub))}`);

        T.check('curry2(sub)(10)(3) is 7', () => {
          const r = curry2(sub)(10)(3);
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('Every step takes exactly one argument', () => {
          const s1 = curry2(sub);
          const s2 = s1(1);
          if (typeof s2 !== 'function') return `After one argument you got ${T.fmt(s2)}, not a function.`;
          return (
            (s1.length === 1 && s2.length === 1) ||
            `Step arities were ${s1.length} and ${s2.length}. Each step of a curried function takes exactly one argument.`
          );
        });

        T.check('f waits until both arguments arrive', () => {
          const spy = T.spyFn((a: number, b: number) => a + b);
          curry2(spy)(1);
          return spy.calls.length === 0 || `f ran after only one argument, with ${T.fmt(spy.calls[0])}.`;
        });

        T.check('Partially applied steps are reusable', () => {
          const add = curry2((a: number, b: number) => a + b);
          const add10 = add(10);
          return (
            (add10(1) === 11 && add10(5) === 15) ||
            `add(10) gave ${T.fmt(add10(1))} then ${T.fmt(add10(5))}. A partially applied step has to keep working.`
          );
        });

        T.check('The definition is a chain of single-argument steps', () => T.shape.isCurried('curry2', 3));
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Go point-free',
      prompt:
        'Because map and add are curried, incrementAll never needs to name its list. Rewrite it so the definition has no arrow function.',
      hints: ['`map(add(1))` is already a function from a list to a list. Give it the name directly.'],
      exports: ['incrementAll'],
      starter: `const map = (fn) => (list) => list.map(fn)
const add = (a) => (b) => a + b

// Rewrite without mentioning numbers:
const incrementAll = (numbers) => map(add(1))(numbers)
`,
      solution: `const map = (fn) => (list) => list.map(fn)
const add = (a) => (b) => a + b

const incrementAll = map(add(1))
`,
      broken: [
        // Behaviorally right, but the point of the rung is the shape.
        `const map = (fn) => (list) => list.map(fn)
const add = (a) => (b) => a + b

const incrementAll = (numbers) => map(add(1))(numbers)
`,
        // Point-free in shape, wrong function underneath.
        `const map = (fn) => (list) => list.map(fn)
const add = (a) => (b) => a + b

const incrementAll = map(add(0))
`,
      ],
      checks: (T, exp) => {
        const incrementAll = exp.incrementAll as (xs: number[]) => number[];

        T.check('incrementAll([1, 2, 3]) is [2, 3, 4]', () => {
          const r = incrementAll([1, 2, 3]);
          return T.eq(r, [2, 3, 4]) || `Got ${T.fmt(r)}`;
        });

        T.check('Works on an empty list', () => {
          const r = incrementAll([]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('Leaves the input list alone', () => {
          const xs = T.freeze([1, 2, 3]);
          incrementAll(xs as number[]);
          return T.eq(xs, [1, 2, 3]) || 'The input list changed.';
        });

        T.check('The definition is point-free', () => T.shape.isPointFree('incrementAll'));
      },
    },
  ],
};
