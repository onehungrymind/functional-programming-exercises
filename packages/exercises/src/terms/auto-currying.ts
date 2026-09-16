import type { ExerciseSet } from '@fpx/engine/types';

export const autoCurrying: ExerciseSet = {
  termId: 'auto-currying',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Curry any function automatically',
      prompt:
        'Hand-curried functions only accept one argument at a time. `curry` should accept any grouping: `f(1)(2)(3)`, `f(1, 2)(3)`, and `f(1, 2, 3)` all work.',
      hints: [
        '`fn.length` tells you how many arguments are still expected in total.',
        'When you have collected enough, call through. Otherwise hand back a function that keeps collecting.',
      ],
      exports: ['curry'],
      starter: `// curry :: ((a, b, ...) -> r) -> a -> b -> ... -> r
const curry = (fn) => {
  // collect arguments until you have fn.length of them
}
`,
      solution: `// curry :: ((a, b, ...) -> r) -> a -> b -> ... -> r
const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}
`,
      broken: [
        // Only handles one argument per step, which is plain currying, not auto-currying.
        `const curry = (fn) => {
  const collect = (args) =>
    args.length >= fn.length ? fn(...args) : (x) => collect([...args, x])
  return collect([])
}
`,
        // Calls through as soon as anything arrives.
        `const curry = (fn) => (...args) => fn(...args)
`,
        // Off by one: fires a step early.
        `const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length - 1 ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}
`,
      ],
      checks: (T, exp) => {
        const curry = exp.curry as (fn: (...a: any[]) => any) => any;
        const add3 = (a: number, b: number, c: number) => a + b + c;

        T.check('One at a time works', () => {
          const r = curry(add3)(1)(2)(3);
          return r === 6 || `curry(add3)(1)(2)(3) gave ${T.fmt(r)}`;
        });

        T.check('All at once works', () => {
          const r = curry(add3)(1, 2, 3);
          return r === 6 || `curry(add3)(1, 2, 3) gave ${T.fmt(r)}`;
        });

        T.check('Any grouping in between works', () => {
          const c = curry(add3);
          const groupings: [string, number][] = [
            ['(1, 2)(3)', c(1, 2)(3)],
            ['(1)(2, 3)', c(1)(2, 3)],
          ];
          const bad = groupings.find(([, v]) => v !== 6);
          return !bad || `curry(add3)${bad[0]} gave ${T.fmt(bad[1])}, expected 6.`;
        });

        T.check('Nothing runs until the last argument arrives', () => {
          const spy = T.spyFn((a: number, b: number, c: number) => a + b + c);
          const c = curry(spy);
          c(1);
          c(1, 2);
          return spy.calls.length === 0 || `It ran early with ${T.fmt(spy.calls[0])}. Wait until fn.length arguments have arrived.`;
        });

        T.check('A partially applied step is reusable', () => {
          const c = curry(add3);
          const withOne = c(1);
          return (withOne(2, 3) === 6 && withOne(10, 10) === 21) || `Reuse gave ${T.fmt(withOne(2, 3))} then ${T.fmt(withOne(10, 10))}.`;
        });

        T.check('It respects fn.length, not a fixed arity', () => {
          const add2 = (a: number, b: number) => a + b;
          const add4 = (a: number, b: number, c: number, d: number) => a + b + c + d;
          if (curry(add2)(1)(2) !== 3) return `A two-argument function came out as ${T.fmt(curry(add2)(1)(2))}.`;
          const r = curry(add4)(1)(2)(3)(4);
          return r === 10 || `A four-argument function came out as ${T.fmt(r)}.`;
        });

        T.check('A nullary function calls through immediately', () => {
          const r = curry(() => 'done')();
          return r === 'done' || `Got ${T.fmt(r)} for a function that takes no arguments.`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Where does auto-currying stop working?',
      prompt: 'Auto-currying leans on `fn.length`. Pick the function it cannot curry correctly.',
      options: [
        {
          code: 'const add = (a, b, c) => a + b + c',
          correct: false,
          why: 'length is 3, which is exactly right.',
        },
        {
          code: 'const sum = (...ns) => ns.reduce((a, b) => a + b, 0)',
          correct: true,
          why: 'A rest parameter makes length 0, so curry calls through immediately and never collects anything.',
        },
        {
          code: 'const greet = (greeting, name) => `${greeting}, ${name}`',
          correct: false,
          why: 'length is 2. Nothing unusual here.',
        },
        {
          code: 'const pair = (a) => (b) => [a, b]',
          correct: false,
          why: 'length is 1 and it is already curried, so currying it again changes nothing.',
        },
      ],
    },
  ],
};
