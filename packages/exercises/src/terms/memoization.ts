import type { ExerciseSet } from '@fpx/engine/types';

export const memoization: ExerciseSet = {
  termId: 'memoization',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Cache by argument',
      prompt:
        '`memoize` should remember what a function returned for each argument, and never compute the same one twice.',
      hints: [
        'A Map keyed by the argument is enough for a single-argument function.',
        'Check whether the key is present rather than whether the stored value is truthy, or a cached 0 recomputes forever.',
      ],
      exports: ['memoize'],
      starter: `// memoize :: (a -> b) -> (a -> b)
const memoize = (fn) => {
  // remember the answer for each argument
}
`,
      solution: `// memoize :: (a -> b) -> (a -> b)
const memoize = (fn) => {
  const cache = new Map()
  return (x) => {
    if (!cache.has(x)) cache.set(x, fn(x))
    return cache.get(x)
  }
}
`,
      broken: [
        // Truthiness test: a cached 0, '' or false is recomputed every time.
        `const memoize = (fn) => {
  const cache = new Map()
  return (x) => {
    if (!cache.get(x)) cache.set(x, fn(x))
    return cache.get(x)
  }
}
`,
        // One slot for everything: a new argument evicts the old answer.
        `const memoize = (fn) => {
  let lastArg
  let lastResult
  return (x) => {
    if (x !== lastArg) {
      lastArg = x
      lastResult = fn(x)
    }
    return lastResult
  }
}
`,
        // Remembers the first answer and hands it back whatever you ask for.
        `const memoize = (fn) => {
  let result
  return (x) => {
    if (result === undefined) result = fn(x)
    return result
  }
}
`,
      ],
      checks: (T, exp) => {
        const memoize = exp.memoize as <A, B>(fn: (a: A) => B) => (a: A) => B;

        T.check('It still computes the right answer', () => {
          const sq = memoize((n: number) => n * n);
          return sq(4) === 16 || `Got ${T.fmt(sq(4))}`;
        });

        T.check('The same argument is computed once', () => {
          const spy = T.spyFn((n: number) => n * n);
          const sq = memoize(spy);
          sq(4);
          sq(4);
          sq(4);
          return spy.calls.length === 1 || `It computed ${spy.calls.length} times for the same argument.`;
        });

        T.check('Different arguments are each computed', () => {
          const spy = T.spyFn((n: number) => n * n);
          const sq = memoize(spy);
          const got = [sq(2), sq(3), sq(2)];
          if (!T.eq(got, [4, 9, 4])) return `Got ${T.fmt(got)}, expected [4, 9, 4].`;
          return (
            spy.calls.length === 2 ||
            `It computed ${spy.calls.length} times for two distinct arguments. Each argument needs its own entry, not one shared slot.`
          );
        });

        T.check('Old answers survive a new argument', () => {
          const spy = T.spyFn((n: number) => n * n);
          const sq = memoize(spy);
          sq(2);
          sq(3);
          sq(2);
          return (
            spy.calls.length === 2 ||
            'Asking for a new argument threw away the earlier answer. A cache of size one is not a cache.'
          );
        });

        T.check('A result of 0 is cached like any other', () => {
          const spy = T.spyFn(() => 0);
          const f = memoize(spy);
          f(1);
          f(1);
          return (
            spy.calls.length === 1 ||
            'It recomputed because the cached value was 0. Ask whether the key is present, not whether the value is truthy.'
          );
        });

        T.check('Two memoized functions do not share a cache', () => {
          const a = memoize((n: number) => n + 1);
          const b = memoize((n: number) => n + 100);
          a(1);
          return b(1) === 101 || `The second function gave ${T.fmt(b(1))}, so the cache is shared.`;
        });
      },
    },

    {
      id: 'break',
      kind: 'code',
      role: 'break',
      inverted: true,
      title: 'Watch memoization lie',
      prompt:
        'Memoizing an impure function makes it report a stale answer. Write `nextId` so that memoizing it produces a wrong result, and the check catches the lie.',
      hints: [
        'A pure function of its argument can be memoized safely. Make yours depend on something else.',
        'It still has to take an argument, or there is nothing to key on.',
      ],
      exports: ['nextId'],
      starter: `// nextId should return a different id each call,
// which is exactly what a cache cannot preserve.
const nextId = (prefix) => \`\${prefix}-1\`
`,
      solution: `let counter = 0
// Depends on counter, not just on prefix, so a cache keyed on prefix is wrong.
const nextId = (prefix) => {
  counter += 1
  return \`\${prefix}-\${counter}\`
}
`,
      broken: [
        // Pure: memoizing it is perfectly safe, so there is no lie to catch.
        `const nextId = (prefix) => \`\${prefix}-1\`
`,
        // Also pure, just more elaborate.
        `const nextId = (prefix) => \`\${prefix}-\${prefix.length}\`
`,
      ],
      checks: (T, exp) => {
        const nextId = exp.nextId as (p: string) => string;

        T.check('nextId takes a prefix and returns a string', () => {
          const r = nextId('user');
          return (
            typeof r === 'string' && r.includes('user') ||
            `Got ${T.fmt(r)}. Keep the shape: a prefix in, a string containing it out.`
          );
        });

        T.check('Calling it twice gives two different ids', () => {
          const a = nextId('user');
          const b = nextId('user');
          return (
            a !== b ||
            `Both calls gave ${T.fmt(a)}. A function that already returns the same thing for the same argument is safe to memoize, so there would be nothing to catch.`
          );
        });

        T.check('Memoizing it makes it repeat itself, which is the lie', () => {
          const memoize = <A, B>(fn: (a: A) => B) => {
            const cache = new Map<A, B>();
            return (x: A) => {
              if (!cache.has(x)) cache.set(x, fn(x));
              return cache.get(x)!;
            };
          };
          const memoized = memoize(nextId);
          const a = memoized('user');
          const b = memoized('user');
          return (
            a === b ||
            `The memoized version still gave two different ids, ${T.fmt(a)} and ${T.fmt(b)}, so the cache is not being consulted.`
          );
        });
      },
    },
  ],
};
