import type { ExerciseSet } from '@fpx/engine/types';

export const currying: ExerciseSet = {
  termId: 'currying',
  rubric: [
    {
      id: 'one-at-a-time',
      statement:
        "Can recognize a fully curried definition, and knows every step takes exactly one argument.",
    },
    {
      id: 'write-it',
      statement:
        "Can curry a two-argument function by hand, and knows nothing should run until the last argument arrives.",
    },
    {
      id: 'enables-point-free',
      statement:
        "Can say why currying makes point-free style possible, and can use it to drop a named argument.",
    },
  ],
  notes: `A curried function takes its arguments **one at a time**, returning a new function at every
step until the last.

\`\`\`js
const add = (a, b) => a + b          // not curried: arity 2
const add = (a) => (b) => a + b      // curried: three unary steps in disguise

add(2)      // a function
add(2)(3)   // 5
\`\`\`

Partly curried is not curried. Every step has to take exactly one:

\`\`\`js
const sum3 = (a) => (b, c) => a + b + c     // step 2 takes two
const clamp = (min) => (max) => (x) => Math.min(max, Math.max(min, x))   // curried
\`\`\`

Nothing should happen until the last argument lands. That is what makes an intermediate step
worth keeping and reusing:

\`\`\`js
const curry2 = (f) => (a) => (b) => f(a, b)

let calls = 0
const spy = curry2((a, b) => { calls++; return a + b })
const add10 = spy(10)
calls        // 0, nothing has run
add10(1)     // 11
add10(5)     // 15
\`\`\`

The payoff is [point-free style](#point-free-style). Because every argument arrives on its own,
the last one can simply be left off:

\`\`\`js
const map = (fn) => (list) => list.map(fn)
const add = (a) => (b) => a + b

const incrementAll = (numbers) => map(add(1))(numbers)   // names the list
const incrementAll = map(add(1))                         // does not
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['one-at-a-time'],
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
      covers: ['write-it', 'one-at-a-time'],
      kind: 'code',
      role: 'implement',
      title: 'Write curry2',
      prompt:
        "Turn any two-argument function into a curried one. Nothing should run until both arguments have arrived. Write `curry2`.",
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
      covers: ['enables-point-free'],
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

    {
      id: 'point-free-pipeline',
      kind: 'code',
      role: 'apply',
      covers: ['write-it', 'enables-point-free'],
      title: "Curry three, then drop every argument",
      prompt:
        "Currying is what makes point-free possible: a curried function partly applied is already the function you wanted. Write `curry3`, then build `describe` from the curried helpers without naming a single argument.",
      hints: [
        "`curry3` is three nested single-argument arrows, and nothing runs until the third arrives.",
        "`between(2)(8)` is already a predicate. `label('n')` is already a formatter.",
        "`describe` composes the two. If you write `(n) =>` anywhere, the currying bought you nothing.",
      ],
      sidequests: [
        { termId: 'function-composition', why: "`compose` is given here. It gets its own rung, with both directions and the laws between them." },
      ],
      exports: ['curry3', 'between', 'label', 'describe'],
      starter: `const compose = (f, g) => (x) => f(g(x))

// curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
const curry3 = (fn) => fn

// between :: Number -> Number -> Number -> Boolean
const between = curry3((lo, hi, n) => n >= lo && n <= hi)

// label :: String -> String -> Boolean -> String
const label = curry3((name, unit, ok) => name + ' is ' + (ok ? 'in' : 'out') + ' ' + unit)

// describe :: Number -> String   between 2 and 8, labelled 'n' in 'range'
const describe = (n) => label('n')('range')(between(2)(8)(n))
`,
      solution: `const compose = (f, g) => (x) => f(g(x))

// curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)

// between :: Number -> Number -> Number -> Boolean
const between = curry3((lo, hi, n) => n >= lo && n <= hi)

// label :: String -> String -> Boolean -> String
const label = curry3((name, unit, ok) => name + ' is ' + (ok ? 'in' : 'out') + ' ' + unit)

// describe :: Number -> String   between 2 and 8, labelled 'n' in 'range'
const describe = compose(label('n')('range'), between(2)(8))
`,
      broken: [
        `const compose = (f, g) => (x) => f(g(x))
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)
const between = curry3((lo, hi, n) => n >= lo && n <= hi)
const label = curry3((name, unit, ok) => name + ' is ' + (ok ? 'in' : 'out') + ' ' + unit)
const describe = (n) => label('n')('range')(between(2)(8)(n))
`,
        `const compose = (f, g) => (x) => f(g(x))
const curry3 = (fn) => (a, b, c) => fn(a, b, c)
const between = curry3((lo, hi, n) => n >= lo && n <= hi)
const label = curry3((name, unit, ok) => name + ' is ' + (ok ? 'in' : 'out') + ' ' + unit)
const describe = (n) => label('n', 'range', between(2, 8, n))
`,
        `const compose = (f, g) => (x) => f(g(x))
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)
const between = curry3((lo, hi, n) => n >= lo && n <= hi)
const label = curry3((name, unit, ok) => name + ' is ' + (ok ? 'in' : 'out') + ' ' + unit)
const describe = compose(between(2)(8), label('n')('range'))
`,
      ],
      checks: (T, exp) => {
        const { curry3, between, label, describe } = exp;

        T.check('curry3 takes one argument at a time', () => {
          const add = curry3((a: number, b: number, c: number) => a + b + c);
          return (
            typeof add(1) === 'function' && typeof add(1)(2) === 'function' && add(1)(2)(3) === 6 ||
            'Each step should hand back a function until the third argument arrives.'
          );
        });

        T.check('Nothing runs until the last argument', () => {
          const spy = T.spyFn((a: number, b: number, c: number) => a + b + c);
          curry3(spy)(1)(2);
          return spy.calls.length === 0 || `It ran early, with ${T.fmt(spy.calls[0])}.`;
        });

        T.check('between works when fully applied', () => {
          const got = [between(2)(8)(5), between(2)(8)(1), between(2)(8)(8)];
          return T.eq(got, [true, false, true]) || `It gave ${T.fmt(got)} for 5, 1 and 8.`;
        });

        T.check('Partly applying it gives a usable predicate', () => {
          const inRange = between(2)(8);
          return (
            typeof inRange === 'function' && T.eq([3, 9].map(inRange), [true, false]) ||
            'between(2)(8) should already be the predicate, with nothing left to say.'
          );
        });

        T.check('describe puts the two together', () => {
          const got = [describe(5), describe(1)];
          return T.eq(got, ['n is in range', 'n is out range']) || `It gave ${T.fmt(got)}.`;
        });

        T.check('describe names no argument', () => T.shape.isPointFree('describe'));

        T.check('The pieces are composed in the right order', () => {
          const r = describe(5);
          return (
            typeof r === 'string' ||
            `describe(5) gave ${T.fmt(r)}. The range test runs first and its answer is what gets labelled, not the other way round.`
          );
        });

        T.law('describe agrees with doing it by hand', 60, (G) => {
          const n = G.int();
          const want = 'n is ' + (n >= 2 && n <= 8 ? 'in' : 'out') + ' range';
          return describe(n) === want || `At ${n}: ${T.fmt(describe(n))} against ${T.fmt(want)}.`;
        });
      },
    },
  ],
};
