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
  notes: `A higher-order function does one of two things, or both: it **takes** a function as
an argument, or it **returns** one. Nothing else is required, and JavaScript's built-ins are
full of them.

The taking kind is the familiar half. \`map\`, \`filter\`, \`reduce\`, \`sort\`: each
takes the varying part as a function and keeps the walking part for itself. When you write one,
the discipline is to build a new structure rather than edit the one you were handed, because
the caller still holds it.

The returning kind is the one that unlocks the rest of this vocabulary. \`is(Array)\` does not
test anything; it hands back a function that will. That is only useful because of
[closure](#closure): the returned function still has access to \`type\` after \`is\` has
finished. Every curried function, every partially applied one, every combinator in this glossary
is this shape.

The third use is **wrapping**: take a function, return a function with the same signature but
different timing. \`once\`, \`memoize\`, \`debounce\`, \`withContract\` are all this.

Wrapping has a trap worth naming. When the wrapper remembers something, track *whether it has
run* separately from *what it returned*. Using the stored result as the flag looks tidier and
breaks the moment the function legitimately returns \`0\`, \`''\`, \`false\`, or
\`undefined\`: the wrapper decides it has not run yet and runs again.`,
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
  ],
};
