import type { ExerciseSet } from '@fpx/engine/types';

export const functionComposition: ExerciseSet = {
  termId: 'function-composition',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Write compose and pipe',
      prompt:
        'Both take any number of functions and thread a value through them. `compose` reads right to left, the way the maths does; `pipe` reads left to right.',
      hints: [
        '`reduceRight` walks a list from the end, which is the direction compose needs.',
        'They are the same function with the list reversed.',
      ],
      exports: ['compose', 'pipe'],
      starter: `// compose :: ((y -> z), (x -> y), ...) -> a -> z
const compose = (...fns) => {
  // apply the rightmost function first
}

// pipe :: ((a -> x), (x -> y), ...) -> a -> z
const pipe = (...fns) => {
  // apply the leftmost function first
}
`,
      solution: `// compose :: ((y -> z), (x -> y), ...) -> a -> z
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)

// pipe :: ((a -> x), (x -> y), ...) -> a -> z
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)
`,
      broken: [
        // The two directions swapped.
        `const compose = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)
const pipe = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
`,
        // Only handles two functions.
        `const compose = (f, g) => (x) => f(g(x))
const pipe = (f, g) => (x) => g(f(x))
`,
        // Passes the accumulator and the function the wrong way round.
        `const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => acc(fn), x)
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)
`,
      ],
      checks: (T, exp) => {
        type F = (x: number) => number;
        const compose = exp.compose as (...fns: F[]) => F;
        const pipe = exp.pipe as (...fns: F[]) => F;

        const inc: F = (n) => n + 1;
        const dbl: F = (n) => n * 2;
        const neg: F = (n) => -n;

        T.check('compose applies right to left', () => {
          const r = compose(inc, dbl)(5);
          return r === 11 || `compose(inc, dbl)(5) gave ${T.fmt(r)}. Doubling happens first, so 5 becomes 10 and then 11.`;
        });

        T.check('pipe applies left to right', () => {
          const r = pipe(inc, dbl)(5);
          return r === 12 || `pipe(inc, dbl)(5) gave ${T.fmt(r)}. Incrementing happens first, so 5 becomes 6 and then 12.`;
        });

        T.check('Both take more than two functions', () => {
          const c = compose(neg, inc, dbl)(3);
          const p = pipe(dbl, inc, neg)(3);
          if (c !== -7) return `compose(neg, inc, dbl)(3) gave ${T.fmt(c)}, expected -7.`;
          return p === -7 || `pipe(dbl, inc, neg)(3) gave ${T.fmt(p)}, expected -7.`;
        });

        T.check('Composing nothing is the identity', () => {
          const c = compose()(9);
          const p = pipe()(9);
          return (c === 9 && p === 9) || `With no functions, compose gave ${T.fmt(c)} and pipe gave ${T.fmt(p)}.`;
        });

        T.check('compose and pipe are each other reversed', () => {
          const a = compose(neg, inc, dbl)(4);
          const b = pipe(dbl, inc, neg)(4);
          return a === b || `Got ${T.fmt(a)} and ${T.fmt(b)}. Reversing the list should turn one into the other.`;
        });

        T.law('Associativity: grouping the composition makes no difference', 60, (G) => {
          const [f, g, h] = [G.fn(), G.fn(), G.fn()];
          const n = G.int();
          const left = compose(compose(f.f, g.f), h.f)(n);
          const right = compose(f.f, compose(g.f, h.f))(n);
          return (
            left === right ||
            `On ${n} with ${f.name}, ${g.name}, ${h.name}: grouping left gave ${T.fmt(left)}, grouping right gave ${T.fmt(right)}.`
          );
        });

        T.law('Identity: composing with x => x changes nothing', 60, (G) => {
          const f = G.fn();
          const n = G.int();
          const id = (x: number) => x;
          const before = compose(id, f.f)(n);
          const after = compose(f.f, id)(n);
          const plain = f.f(n);
          return (
            (before === plain && after === plain) ||
            `On ${n} with ${f.name}: identity first gave ${T.fmt(before)}, identity last gave ${T.fmt(after)}, the function alone gave ${T.fmt(plain)}.`
          );
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Read a name out of a record',
      prompt:
        'Using the given pieces and `pipe`, define `shout`: take the name, trim it, upper-case it, and add an exclamation mark.',
      hints: ['`pipe(prop("name"), trim, upper, exclaim)` reads in exactly the order the steps happen.'],
      exports: ['shout'],
      starter: `const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)

const prop = (k) => (o) => o[k]
const trim = (s) => s.trim()
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'

// shout :: { name :: String } -> String
const shout = null
`,
      solution: `const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)

const prop = (k) => (o) => o[k]
const trim = (s) => s.trim()
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'

// shout :: { name :: String } -> String
const shout = pipe(prop('name'), trim, upper, exclaim)
`,
      broken: [
        // Steps in the wrong order: the exclamation mark gets trimmed away.
        `const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)
const prop = (k) => (o) => o[k]
const trim = (s) => s.trim()
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'

const shout = pipe(prop('name'), exclaim, trim, upper)
`,
        // Forgets to trim.
        `const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)
const prop = (k) => (o) => o[k]
const trim = (s) => s.trim()
const upper = (s) => s.toUpperCase()
const exclaim = (s) => s + '!'

const shout = pipe(prop('name'), upper, exclaim)
`,
      ],
      checks: (T, exp) => {
        const shout = exp.shout as (o: { name: string }) => string;

        T.check('It shouts a plain name', () => {
          const r = shout({ name: 'ada' });
          return r === 'ADA!' || `Got ${T.fmt(r)}, expected "ADA!".`;
        });

        T.check('Surrounding whitespace is trimmed first', () => {
          const r = shout({ name: '  grace  ' });
          return (
            r === 'GRACE!' ||
            `Got ${T.fmt(r)}. Trimming has to happen before the exclamation mark is added, or it trims the wrong thing.`
          );
        });

        T.check('It is built from the pieces, not written out by hand', () => T.shape.isPointFree('shout'));
      },
    },
  ],
};
