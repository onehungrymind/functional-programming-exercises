import type { ExerciseSet } from '@fpx/engine/types';

export const partialApplication: ExerciseSet = {
  termId: 'partial-application',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Write partial',
      prompt:
        'Partial application fixes some arguments now and leaves the rest for later. Unlike currying, it takes as many as you give it in one go.',
      hints: [
        'Keep the arguments you were given, then join them with the ones that arrive later.',
        '`(...later) => fn(...first, ...later)` is the whole idea.',
      ],
      exports: ['partial'],
      starter: `// partial :: ((a, b, ...) -> r) -> a -> ((b, ...) -> r)
const partial = (fn, ...fixed) => {
  // return a function that takes the rest
}
`,
      solution: `// partial :: ((a, b, ...) -> r) -> a -> ((b, ...) -> r)
const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
`,
      broken: [
        // Order reversed: later arguments land in front of the fixed ones.
        `const partial = (fn, ...fixed) => (...rest) => fn(...rest, ...fixed)
`,
        // Only remembers the first fixed argument.
        `const partial = (fn, first) => (...rest) => fn(first, ...rest)
`,
        // Calls straight through, fixing nothing.
        `const partial = (fn, ...fixed) => fn(...fixed)
`,
      ],
      checks: (T, exp) => {
        const partial = exp.partial as (fn: (...a: any[]) => any, ...fixed: any[]) => (...rest: any[]) => any;

        T.check('partial gives back a function', () => {
          const f = partial((a: number, b: number) => a + b, 1);
          return typeof f === 'function' || `Got ${T.fmt(f)}. Fixing some arguments leaves a function waiting for the rest.`;
        });

        T.check('Fixing one argument of two works', () => {
          const add = (a: number, b: number) => a + b;
          const r = partial(add, 10)(5);
          return r === 15 || `partial(add, 10)(5) gave ${T.fmt(r)}`;
        });

        T.check('The fixed arguments stay on the left', () => {
          const sub = (a: number, b: number) => a - b;
          const r = partial(sub, 10)(3);
          return (
            r === 7 ||
            `partial(sub, 10)(3) gave ${T.fmt(r)}, expected 7. The arguments you fixed come first, and the later ones follow.`
          );
        });

        T.check('More than one argument can be fixed at a time', () => {
          const vol = (l: number, w: number, h: number) => l * w * h;
          const r = partial(vol, 2, 3)(4);
          return r === 24 || `partial(vol, 2, 3)(4) gave ${T.fmt(r)}, expected 24.`;
        });

        T.check('Fixing nothing leaves the function as it was', () => {
          const add = (a: number, b: number) => a + b;
          const r = partial(add)(1, 2);
          return r === 3 || `partial(add)(1, 2) gave ${T.fmt(r)}`;
        });

        T.check('Nothing runs until the rest of the arguments arrive', () => {
          const spy = T.spyFn((a: number, b: number) => a + b);
          partial(spy, 1);
          return spy.calls.length === 0 || `The function ran while being partially applied, with ${T.fmt(spy.calls[0])}.`;
        });

        T.check('A partially applied function can be reused', () => {
          const add = (a: number, b: number) => a + b;
          const add10 = partial(add, 10);
          return (add10(1) === 11 && add10(5) === 15) || `Reusing it gave ${T.fmt(add10(1))} then ${T.fmt(add10(5))}.`;
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Build fivePlus',
      prompt:
        'Use `partial` to make `fivePlus`, which adds 5 to whatever it is given. Write it without naming the argument.',
      hints: ['`partial(add, 5)` is already the function you want. Bind it directly.'],
      exports: ['fivePlus'],
      starter: `const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
const add = (a, b) => a + b

// fivePlus :: Number -> Number
const fivePlus = (n) => add(5, n)
`,
      solution: `const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
const add = (a, b) => a + b

// fivePlus :: Number -> Number
const fivePlus = partial(add, 5)
`,
      broken: [
        // Right answer, wrong shape: the rung is about not naming the argument.
        `const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
const add = (a, b) => a + b

const fivePlus = (n) => add(5, n)
`,
        // Point-free, wrong number.
        `const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
const add = (a, b) => a + b

const fivePlus = partial(add, 4)
`,
      ],
      checks: (T, exp) => {
        const fivePlus = exp.fivePlus as (n: number) => number;

        T.law('It adds five to any number', 60, (G) => {
          const n = G.int();
          const r = fivePlus(n);
          return r === n + 5 || `fivePlus(${n}) gave ${T.fmt(r)}, expected ${n + 5}.`;
        });

        T.check('Built by partially applying add, not written out again', () => T.shape.isPointFree('fivePlus'));
      },
    },
  ],
};
