import type { ExerciseSet } from '@fpx/engine/types';

export const higherOrderFunctions: ExerciseSet = {
  termId: 'higher-order-functions-hof',
  rubric: [
    {
      id: 'two-shapes',
      statement: 'Can recognize both shapes: a function that takes a function, and one that returns a function.',
    },
    {
      id: 'takes-one',
      statement: 'Can write one that takes a function, walking a structure and leaving the input alone.',
    },
    {
      id: 'returns-one',
      statement: 'Can write one that returns a function, and knows the closure is what makes the returned function remember anything.',
    },
    {
      id: 'wrapping',
      statement:
        'Can wrap an existing function to change when or how often it runs, without changing what it computes.',
    },
  ],
  notes: `A higher-order function **takes** a function, **returns** one, or both.

The taking kind is the familiar half, and the discipline is to build rather than edit:

\`\`\`js
const filter = (predicate, xs) => {
  const out = []
  for (const x of xs) if (predicate(x)) out.push(x)
  return out                              // a new list; xs is untouched
}
\`\`\`

The returning kind is what unlocks the rest of this vocabulary. It works because of
[closure](#closure): the returned function still sees \`type\` after \`is\` has finished.

\`\`\`js
const is = (type) => (x) => x instanceof type

const isArray = is(Array)
isArray([])       // true
isArray('nope')   // false
\`\`\`

The third use is **wrapping**: same signature, different timing.

\`\`\`js
const once = (fn) => {
  let called = false
  let result
  return (...args) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
\`\`\`

Track *whether it ran* separately from *what it returned*. Using the result as the flag looks
tidier and breaks on any falsy value:

\`\`\`js
const once = (fn) => {
  let result
  return (...args) => {
    if (!result) result = fn(...args)   // 0, '', false, undefined all fail here
    return result
  }
}

const readCount = once(() => 0)
readCount()   // 0, and it runs
readCount()   // 0, and it runs again
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['two-shapes', 'takes-one', 'returns-one'],
      kind: 'code',
      role: 'implement',
      title: 'Write filter and is',
      prompt:
        'A higher-order function takes a function, returns one, or both. `filter` takes one; `is` returns one.',
      hints: [
        '`filter` walks the list and keeps the elements the predicate says yes to.',
        '`is` does not test anything itself. It hands back a function that does.',
      ],
      exports: ['filter', 'is'],
      starter: `// filter :: (a -> Boolean) -> [a] -> [a]
const filter = (predicate, xs) => {
  // keep the elements the predicate accepts
}

// is :: Type -> a -> Boolean
const is = (type) => {
  // return a function that tests its argument against type
}
`,
      solution: `// filter :: (a -> Boolean) -> [a] -> [a]
const filter = (predicate, xs) => {
  const out = []
  for (const x of xs) {
    if (predicate(x)) out.push(x)
  }
  return out
}

// is :: Type -> a -> Boolean
const is = (type) => (x) => x instanceof type
`,
      broken: [
        // Mutates the list it was handed instead of building a new one.
        `const filter = (predicate, xs) => {
  for (let i = xs.length - 1; i >= 0; i--) {
    if (!predicate(xs[i])) xs.splice(i, 1)
  }
  return xs
}
const is = (type) => (x) => x instanceof type
`,
        // is tests immediately instead of returning a function.
        `const filter = (predicate, xs) => xs.reduce((acc, x) => (predicate(x) ? [...acc, x] : acc), [])
const is = (type, x) => x instanceof type
`,
        // Keeps the elements the predicate rejected.
        `const filter = (predicate, xs) => xs.reduce((acc, x) => (predicate(x) ? acc : [...acc, x]), [])
const is = (type) => (x) => x instanceof type
`,
      ],
      checks: (T, exp) => {
        const filter = exp.filter as (p: (x: any) => boolean, xs: any[]) => any[];
        const is = exp.is as (t: any) => (x: any) => boolean;

        T.check('filter keeps what the predicate accepts', () => {
          const r = filter((n: number) => n % 2 === 0, [1, 2, 3, 4, 5, 6]);
          return T.eq(r, [2, 4, 6]) || `Got ${T.fmt(r)}. Keep the elements the predicate says yes to, not the ones it rejects.`;
        });

        T.check('filter leaves the input list alone', () => {
          const xs = T.freeze([1, 2, 3, 4]);
          filter((n: number) => n > 2, xs as number[]);
          return T.eq(xs, [1, 2, 3, 4]) || 'The list you were handed changed. Build a new one.';
        });

        T.check('filter on an empty list gives an empty list', () => {
          const r = filter(() => true, []);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('The predicate sees every element exactly once', () => {
          const spy = T.spyFn((n: number) => n > 0);
          filter(spy, [1, -2, 3]);
          const seen = spy.calls.map((c) => c[0]);
          return T.eq(seen, [1, -2, 3]) || `The predicate was called with ${T.fmt(seen)}.`;
        });

        T.check('is(Array) returns a function, it does not test right away', () => {
          const r = is(Array);
          return typeof r === 'function' || `is(Array) gave ${T.fmt(r)}. A higher-order function hands the test back.`;
        });

        T.check('is(Array) recognizes arrays and rejects other things', () => {
          const isArray = is(Array);
          if (isArray([]) !== true) return `is(Array)([]) gave ${T.fmt(isArray([]))}.`;
          if (isArray('nope') !== false) return `is(Array)("nope") gave ${T.fmt(isArray('nope'))}.`;
          return true;
        });

        T.check('is works for any constructor, not just Array', () => {
          const isDate = is(Date);
          return (
            (isDate(new Date()) === true && isDate(42) === false) ||
            `is(Date) said ${T.fmt(isDate(new Date()))} for a Date and ${T.fmt(isDate(42))} for a number.`
          );
        });
      },
    },

    {
      id: 'apply',
      covers: ['wrapping', 'returns-one'],
      kind: 'code',
      role: 'apply',
      title: 'Write once',
      prompt:
        '`once` wraps a function so it can only ever run a single time. Every later call gives back the first result without calling through.',
      hints: [
        'You need to remember two things between calls: whether it has run, and what it gave back.',
        'A closure is the place to keep them.',
      ],
      exports: ['once'],
      starter: `// once :: (a -> b) -> (a -> b)
const once = (fn) => {
  // call fn the first time, then keep handing back that same result
}
`,
      solution: `// once :: (a -> b) -> (a -> b)
const once = (fn) => {
  let called = false
  let result
  return (...args) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
`,
      broken: [
        // Uses the result itself as the flag, so a falsy result runs again.
        `const once = (fn) => {
  let result
  return (...args) => {
    if (!result) result = fn(...args)
    return result
  }
}
`,
        // Remembers nothing: calls through every time.
        `const once = (fn) => (...args) => fn(...args)
`,
      ],
      checks: (T, exp) => {
        const once = exp.once as <F extends (...a: any[]) => any>(f: F) => F;

        T.check('once gives back a function', () => {
          const f = once((n: number) => n * 2);
          return typeof f === 'function' || `Got ${T.fmt(f)}. once wraps a function and hands the wrapper back.`;
        });

        T.check('The first call goes through', () => {
          const f = once((n: number) => n * 2);
          const r = f(21);
          return r === 42 || `Got ${T.fmt(r)}`;
        });

        T.check('The wrapped function only ever runs once', () => {
          const spy = T.spyFn((n: number) => n * 2);
          const f = once(spy);
          f(1);
          f(2);
          f(3);
          return spy.calls.length === 1 || `It ran ${spy.calls.length} times, with ${T.fmt(spy.calls)}.`;
        });

        T.check('Later calls give back the first result', () => {
          const f = once((n: number) => n * 2);
          f(1);
          const r = f(100);
          return r === 2 || `The second call gave ${T.fmt(r)}. It should still be the first result, 2.`;
        });

        T.check('A falsy first result is still remembered', () => {
          const spy = T.spyFn(() => 0);
          const f = once(spy);
          f();
          f();
          return (
            spy.calls.length === 1 ||
            'It ran twice because the first result was 0. Track whether it has run separately from what it returned, or every falsy result runs again.'
          );
        });

        T.check('Two wrapped functions do not share their state', () => {
          const a = once((n: number) => n + 1);
          const b = once((n: number) => n + 100);
          a(1);
          const r = b(1);
          return r === 101 || `The second wrapper gave ${T.fmt(r)}, so the two are sharing state.`;
        });
      },
    },

    {
      id: 'both-shapes',
      kind: 'code',
      role: 'apply',
      covers: ['two-shapes', 'takes-one', 'wrapping'],
      title: "Take one, return one, and do both at once",
      prompt:
        "A higher-order function takes a function, returns one, or both. Write `applyN`, which takes one, `always`, which returns one, and `withRetry`, which does both.",
      hints: [
        "`applyN` applies `f` to `x` exactly `n` times. Zero times means the value comes back untouched.",
        "`always` is handed a value and gives back a function ignoring whatever it is called with.",
        "`withRetry` wraps a function and hands back one with the same shape, so callers cannot tell.",
      ],
      exports: ['applyN', 'always', 'withRetry'],
      starter: `// applyN :: ((a -> a), Number, a) -> a
const applyN = (f, n, x) => x

// always :: a -> (b -> a)
const always = (x) => x

// withRetry :: ((a -> b), Number) -> (a -> b)
const withRetry = (f, attempts) => f
`,
      solution: `// applyN :: ((a -> a), Number, a) -> a
const applyN = (f, n, x) => (n <= 0 ? x : applyN(f, n - 1, f(x)))

// always :: a -> (b -> a)
const always = (x) => () => x

// withRetry :: ((a -> b), Number) -> (a -> b)
const withRetry = (f, attempts) => (arg) => {
  let last
  for (let i = 0; i < attempts; i += 1) {
    try {
      return f(arg)
    } catch (e) {
      last = e
    }
  }
  throw last
}
`,
      broken: [
        `const applyN = (f, n, x) => f(x)
const always = (x) => () => x
const withRetry = (f, attempts) => (arg) => {
  let last
  for (let i = 0; i < attempts; i += 1) {
    try { return f(arg) } catch (e) { last = e }
  }
  throw last
}
`,
        `const applyN = (f, n, x) => (n <= 0 ? x : applyN(f, n - 1, f(x)))
const always = (x) => x
const withRetry = (f, attempts) => (arg) => {
  let last
  for (let i = 0; i < attempts; i += 1) {
    try { return f(arg) } catch (e) { last = e }
  }
  throw last
}
`,
        `const applyN = (f, n, x) => (n <= 0 ? x : applyN(f, n - 1, f(x)))
const always = (x) => () => x
const withRetry = (f, attempts) => f
`,
      ],
      checks: (T, exp) => {
        const { applyN, always, withRetry } = exp;

        T.check('applyN applies the function n times', () => {
          const r = applyN((n: number) => n * 2, 3, 1);
          return r === 8 || `Doubling 1 three times gave ${T.fmt(r)}, expected 8.`;
        });

        T.check('Zero times leaves the value alone', () => {
          const r = applyN((n: number) => n * 2, 0, 5);
          return r === 5 || `applyN(double, 0, 5) gave ${T.fmt(r)}.`;
        });

        T.check('always gives back a function', () => {
          const f = always(7);
          return typeof f === 'function' || `always(7) gave ${T.fmt(f)}. Returning a function is the other shape a higher-order function takes.`;
        });

        T.check('That function ignores what it is called with', () => {
          const f = always(7);
          return (f(1) === 7 && f('x') === 7) || `It gave ${T.fmt(f(1))} and ${T.fmt(f('x'))}.`;
        });

        T.check('withRetry gives back something with the same shape', () => {
          const wrapped = withRetry((n: number) => n + 1, 3);
          return (typeof wrapped === 'function' && wrapped(1) === 2) || `The wrapped function gave ${T.fmt(wrapped)}.`;
        });

        T.check('It retries until one attempt works', () => {
          let calls = 0;
          const flaky = (n: number) => {
            calls += 1;
            if (calls < 3) throw new Error('not yet');
            return n * 10;
          };
          const r = withRetry(flaky, 5)(4);
          return (r === 40 && calls === 3) || `It gave ${T.fmt(r)} after ${calls} attempts.`;
        });

        T.check('It gives up after the attempts run out', () => {
          let calls = 0;
          const always = () => {
            calls += 1;
            throw new Error('always fails');
          };
          let threw = false;
          try {
            withRetry(always, 2)(1);
          } catch {
            threw = true;
          }
          return (threw && calls === 2) || `It threw: ${threw}, after ${calls} attempts, expected 2.`;
        });

        T.check('A function that works first time is called once', () => {
          let calls = 0;
          withRetry((n: number) => {
            calls += 1;
            return n;
          }, 5)(1);
          return calls === 1 || `It called the function ${calls} times when the first attempt already worked.`;
        });
      },
    },
  ],
};
