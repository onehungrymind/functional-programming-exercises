import type { ExerciseSet } from '@fpx/engine/types';

export const autoCurrying: ExerciseSet = {
  termId: 'auto-currying',
  rubric: [
    {
      id: 'any-grouping',
      statement:
        "Can write a curry that accepts any grouping of arguments, not just one at a time.",
    },
    {
      id: 'reads-length',
      statement:
        "Knows it decides when to call through by reading `fn.length`, and can name the definitions where that goes wrong.",
    },
    {
      id: 'waits',
      statement:
        "Knows nothing runs until enough arguments have arrived, however they were grouped.",
    },
  ],
  notes: `Hand-currying gives you one argument at a time and nothing else. Auto-currying accepts **any
grouping**:

\`\`\`js
const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}

const add3 = (a, b, c) => a + b + c
const c = curry(add3)

c(1)(2)(3)    // 6
c(1, 2)(3)    // 6
c(1)(2, 3)    // 6
c(1, 2, 3)    // 6
\`\`\`

The whole mechanism rests on \`fn.length\`, which is why [arity](#arity) is worth knowing
precisely. Anything that makes declared arity smaller than what the function wants breaks it:

\`\`\`js
const sum = (...ns) => ns.reduce((a, b) => a + b, 0)
sum.length          // 0
curry(sum)(1)       // 1, not a function. It called through immediately.

const greet = (greeting, name, punct = '!') => greeting + name + punct
greet.length        // 2, not 3
curry(greet)('hi')('ada')   // fires after two, punct takes its default
\`\`\`

Until enough arguments arrive, nothing runs:

\`\`\`js
let calls = 0
const spy = curry((a, b, c) => { calls++; return a + b + c })
spy(1)
spy(1, 2)
calls    // 0
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['any-grouping', 'waits'],
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
      covers: ['reads-length'],
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

    {
      id: 'arity',
      kind: 'expr',
      role: 'recognize',
      covers: ['reads-length', 'waits'],
      title: "Predict what arity each definition reports",
      prompt:
        "Auto-currying decides when to call through by reading `fn.length`. Type an array of the four lengths, in order. Getting this right is the difference between using it and being surprised by it.",
      hints: [
        "`fn.length` counts the parameters before the first one with a default, and stops there.",
        "A rest parameter is not counted at all.",
        "Destructuring one object still counts as one parameter.",
      ],
      context: `const plain   = (a, b, c) => a + b + c
const defaulted = (a, b, c = 1) => a + b + c
const rested  = (a, ...rest) => a
const destructured = ({ x, y }) => x + y
`,
      placeholder: "[_, _, _, _]",
      expect: [3,2,1,1],
      solution: "[plain.length, defaulted.length, rested.length, destructured.length]",
      broken: ["[3, 3, 2, 2]", "[3, 3, 1, 1]", "[3, 2, 2, 1]", "[3, 2, 1, 2]"],
    },

    {
      id: 'groupings',
      kind: 'code',
      role: 'apply',
      covers: ['any-grouping', 'waits'],
      title: "Every grouping reaches the same answer",
      prompt:
        "Auto-currying differs from currying by accepting the arguments in any grouping at all. Write `autoCurry`, then `allGroupings`, which applies a three-argument function every way there is and collects the results.",
      hints: [
        "Collect what arrives, and call through only once you have enough.",
        "More than one argument can arrive in a single call, so take a rest parameter.",
        "There are four ways to group three arguments, and all four should reach the same number.",
      ],
      exports: ['autoCurry', 'allGroupings'],
      starter: `// autoCurry :: ((...a) -> r) -> curried
const autoCurry = (fn) => fn

// allGroupings :: ((a, b, c) -> r, a, b, c) -> [r]
const allGroupings = (fn, a, b, c) => []
`,
      solution: `// autoCurry :: ((...a) -> r) -> curried
const autoCurry = (fn) => {
  const collect = (got) =>
    got.length >= fn.length ? fn(...got) : (...more) => collect([...got, ...more])
  return collect([])
}

// allGroupings :: ((a, b, c) -> r, a, b, c) -> [r]
const allGroupings = (fn, a, b, c) => {
  const f = autoCurry(fn)
  return [f(a, b, c), f(a)(b, c), f(a, b)(c), f(a)(b)(c)]
}
`,
      broken: [
        `const autoCurry = (fn) => {
  const collect = (got) => (got.length >= fn.length ? fn(...got) : (more) => collect([...got, more]))
  return collect([])
}
const allGroupings = (fn, a, b, c) => {
  const f = autoCurry(fn)
  return [f(a, b, c), f(a)(b, c), f(a, b)(c), f(a)(b)(c)]
}
`,
        `const autoCurry = (fn) => {
  const collect = (got) => (got.length > fn.length ? fn(...got) : (...more) => collect([...got, ...more]))
  return collect([])
}
const allGroupings = (fn, a, b, c) => {
  const f = autoCurry(fn)
  return [f(a, b, c), f(a)(b, c), f(a, b)(c), f(a)(b)(c)]
}
`,
        `const autoCurry = (fn) => {
  const collect = (got) =>
    got.length >= fn.length ? fn(...got) : (...more) => collect([...got, ...more])
  return collect([])
}
const allGroupings = (fn, a, b, c) => {
  const f = autoCurry(fn)
  return [f(a)(b)(c)]
}
`,
      ],
      checks: (T, exp) => {
        const { autoCurry, allGroupings } = exp;
        const vol = (l: number, w: number, h: number) => l * w * h;

        T.check('All at once works', () => {
          return autoCurry(vol)(2, 3, 4) === 24 || `It gave ${T.fmt(autoCurry(vol)(2, 3, 4))}.`;
        });

        T.check('One at a time works', () => {
          return autoCurry(vol)(2)(3)(4) === 24 || `It gave ${T.fmt(autoCurry(vol)(2)(3)(4))}.`;
        });

        T.check('One then two works', () => {
          const r = autoCurry(vol)(2)(3, 4);
          return r === 24 || `It gave ${T.fmt(r)}. More than one argument can arrive in a single call, which is the difference from ordinary currying.`;
        });

        T.check('Two then one works', () => {
          const r = autoCurry(vol)(2, 3)(4);
          return r === 24 || `It gave ${T.fmt(r)}.`;
        });

        T.check('Every grouping reaches the same answer', () => {
          const r = allGroupings(vol, 2, 3, 4);
          return (
            Array.isArray(r) && r.length === 4 && r.every((x: number) => x === 24) ||
            `The four groupings gave ${T.fmt(r)}. All four should be 24, and there should be four of them.`
          );
        });

        T.check('Nothing runs until enough have arrived', () => {
          const spy = T.spyFn((a: number, b: number, c: number) => a + b + c);
          const f = autoCurry(spy);
          f(1);
          f(1, 2);
          f(1)(2);
          return spy.calls.length === 0 || `It ran early, with ${T.fmt(spy.calls[0])}.`;
        });

        T.check('It calls through as soon as it has enough, not later', () => {
          const r = autoCurry(vol)(2, 3, 4);
          return typeof r === 'number' || `With all three supplied it gave ${T.fmt(r)}, which is still waiting for something.`;
        });

        T.check('A partly applied one is reusable', () => {
          const base = autoCurry(vol)(2, 3);
          return (base(4) === 24 && base(5) === 30) || `Reusing it gave ${T.fmt(base(4))} then ${T.fmt(base(5))}.`;
        });

        T.law('Any grouping agrees with calling directly', 60, (G) => {
          const a = G.int(), b = G.int(), c = G.int();
          const got = allGroupings(vol, a, b, c);
          const want = vol(a, b, c);
          return got.every((x: number) => x === want) || `At ${T.fmt([a, b, c])}: ${T.fmt(got)}, all should be ${want}.`;
        });
      },
    },
  ],
};
