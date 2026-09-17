import type { ExerciseSet } from '@fpx/engine/types';

export const partialApplication: ExerciseSet = {
  termId: 'partial-application',
  rubric: [
    {
      id: 'fix-some-now',
      statement:
        "Can fix some arguments now and leave the rest for later, and knows the fixed ones stay on the left.",
    },
    {
      id: 'vs-currying',
      statement:
        "Can say how partial application differs from currying: it takes as many arguments as you give it, in one go.",
    },
    {
      id: 'reuse',
      statement:
        "Can build a reusable specialized function from a general one without naming the remaining argument.",
    },
  ],
  notes: `Partial application fixes some of a function's arguments and hands back a function waiting
for the rest.

\`\`\`js
const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)

const add = (a, b) => a + b
const add10 = partial(add, 10)
add10(5)    // 15
add10(1)    // 11   reusable
\`\`\`

The fixed arguments stay on the **left**, which matters the moment the function is not
commutative:

\`\`\`js
const sub = (a, b) => a - b
partial(sub, 10)(3)   // 7,  10 - 3

// getting the order wrong is silent until it is not
const partial = (fn, ...fixed) => (...rest) => fn(...rest, ...fixed)
partial(sub, 10)(3)   // -7, 3 - 10
\`\`\`

This is the difference from [currying](#currying). A curried function takes exactly one
argument at a time; partial application takes however many you hand it, all at once:

\`\`\`js
const vol = (l, w, h) => l * w * h

partial(vol, 2, 3)(4)     // 24   two fixed in one call
curry(vol)(2)(3)(4)       // 24   one at a time, always
\`\`\`

Nothing runs until the rest arrive, which is what makes the returned function worth keeping:

\`\`\`js
const log = (level, message) => console.log(\`[\${level}] \${message}\`)
const warn = partial(log, 'WARN')   // nothing printed yet
warn('disk filling up')             // [WARN] disk filling up
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['fix-some-now', 'vs-currying'],
      kind: 'code',
      role: 'implement',
      title: 'Write partial',
      prompt:
        "Partial application fixes some arguments now and leaves the rest for later. Unlike currying, it takes as many as you give it in one go. Write `partial`.",
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
      covers: ['reuse', 'fix-some-now'],
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

    {
      id: 'versus',
      kind: 'code',
      role: 'apply',
      covers: ['vs-currying', 'reuse'],
      title: "Partial application against currying, side by side",
      prompt:
        "Both fix arguments for later, and they differ in how many you may supply at a time. `curry3` is written for you, because currying is the next concept and this one is about the comparison. Write `partial`, then build the same specialised function twice: `viaPartial` with yours, and `viaCurry` with the curried one.",
      hints: [
        "`partial` takes as many as you hand it, in one go, and waits for the rest.",
        "`curry3` takes exactly one at a time, three times.",
        "Both `volFixed` definitions should give the same answers, which is the point of putting them next to each other.",
      ],
      sidequests: [
        { termId: 'currying', why: "`curry3` is handed over here so the rung can stay about the comparison. It is built from scratch there." },
      ],
      exports: ['partial', 'curry3', 'viaPartial', 'viaCurry'],
      starter: `const vol = (l, w, h) => l * w * h

// Written for you. Takes exactly one argument at a time, three times over.
//   curry3(vol)(2)(3)(4)  ->  24
//   curry3(vol)(2, 3)     ->  ignores the 3; one at a time means one
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)

// partial :: ((...a) -> r, ...a) -> ((...rest) -> r)
// Takes as many as you hand it, in one go, and waits for the rest.
//   partial(vol, 2, 3)(4)  ->  24
const partial = (fn, ...fixed) => fn

// viaPartial :: Number -> Number   length 2 and width 3 fixed, in one call
const viaPartial = (h) => vol(2, 3, h)

// viaCurry :: Number -> Number   same, one argument at a time
const viaCurry = (h) => vol(2, 3, h)
`,
      solution: `const vol = (l, w, h) => l * w * h

// partial :: ((...a) -> r, ...a) -> ((...rest) -> r)
const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)

// curry3 :: ((a, b, c) -> r) -> (a -> b -> c -> r)
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)

// viaPartial :: Number -> Number   length 2 and width 3 fixed, in one call
const viaPartial = partial(vol, 2, 3)

// viaCurry :: Number -> Number   same, one argument at a time
const viaCurry = curry3(vol)(2)(3)
`,
      broken: [
        `const vol = (l, w, h) => l * w * h
const partial = (fn, ...fixed) => (...rest) => fn(...rest, ...fixed)
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)
const viaPartial = partial(vol, 2, 3)
const viaCurry = curry3(vol)(2)(3)
`,
        `const vol = (l, w, h) => l * w * h
const partial = (fn, ...fixed) => (...rest) => fn(...fixed, ...rest)
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)
const viaPartial = partial(vol, 2, 3)
const viaCurry = (h) => curry3(vol)(2)(3)(h)
`,
        `const vol = (l, w, h) => l * w * h
const partial = (fn, first) => (...rest) => fn(first, ...rest)
const curry3 = (fn) => (a) => (b) => (c) => fn(a, b, c)
const viaPartial = partial(vol, 2, 3)
const viaCurry = curry3(vol)(2)(3)
`,
      ],
      checks: (T, exp) => {
        const { partial, curry3, viaPartial, viaCurry } = exp;
        const vol = (l: number, w: number, h: number) => l * w * h;

        T.check('partial takes several arguments at once', () => {
          const r = partial(vol, 2, 3)(4);
          return r === 24 || `partial(vol, 2, 3)(4) gave ${T.fmt(r)}. Fixing two in one call is the thing partial can do.`;
        });

        T.check('The fixed arguments stay on the left', () => {
          const sub = (a: number, b: number) => a - b;
          const r = partial(sub, 10)(3);
          return r === 7 || `partial(sub, 10)(3) gave ${T.fmt(r)}, expected 7.`;
        });

        T.check('curry3 takes exactly one at a time', () => {
          const step = curry3(vol)(2);
          return typeof step === 'function' && typeof step(3) === 'function' || 'curry3(vol)(2)(3) should still be waiting for the third argument.';
        });

        T.check('curry3 reaches the answer after three', () => {
          const r = curry3(vol)(2)(3)(4);
          return r === 24 || `curry3(vol)(2)(3)(4) gave ${T.fmt(r)}.`;
        });

        T.check('The two specialised functions agree', () => {
          const a = viaPartial(4);
          const b = viaCurry(4);
          return (a === 24 && b === 24) || `partial gave ${T.fmt(a)} and curry gave ${T.fmt(b)}, and both should be 24.`;
        });

        T.law('They agree at every height', 60, (G) => {
          const h = G.int();
          return viaPartial(h) === viaCurry(h) || `At height ${h}: ${T.fmt(viaPartial(h))} against ${T.fmt(viaCurry(h))}.`;
        });

        T.check('Both are reusable', () => {
          return (viaPartial(1) === 6 && viaPartial(5) === 30) || `Reusing it gave ${T.fmt(viaPartial(1))} then ${T.fmt(viaPartial(5))}.`;
        });

        T.check('Neither names the remaining argument', () => {
          const a = T.shape.isPointFree('viaPartial');
          if (a !== true) return `viaPartial: ${a}`;
          return T.shape.isPointFree('viaCurry');
        });

        T.check('Nothing runs until the last argument arrives', () => {
          const spy = T.spyFn((a: number, b: number, c: number) => a + b + c);
          partial(spy, 1, 2);
          curry3(spy)(1)(2);
          return spy.calls.length === 0 || `The function ran early, with ${T.fmt(spy.calls[0])}.`;
        });
      },
    },
  ],
};
