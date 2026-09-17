import type { ExerciseSet } from '@fpx/engine/types';

export const functionComposition: ExerciseSet = {
  termId: 'function-composition',
  rubric: [
    {
      id: 'both-directions',
      statement:
        "Can write variadic compose and pipe, and knows which way each one reads.",
    },
    {
      id: 'laws',
      statement:
        "Knows composition is associative and that identity is neutral, and can say what those buy you.",
    },
    {
      id: 'build-a-pipeline',
      statement:
        "Can express a multi-step transformation as one composed function, in the order the steps happen.",
    },
  ],
  notes: `Composition threads a value through a list of functions. The only real decision is which way
to read:

\`\`\`js
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x)
const pipe    = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)

const inc = (n) => n + 1
const dbl = (n) => n * 2

compose(inc, dbl)(5)   // 11   dbl first, the way the maths reads
pipe(inc, dbl)(5)      // 12   inc first, the way the steps happen
\`\`\`

They are the same function with the list reversed, so \`compose(a, b, c)\` and
\`pipe(c, b, a)\` are interchangeable. Pick one per codebase and stop thinking about it.

Composition is **associative**, which is why a pipeline of ten can be grouped into three named
stages without changing anything:

\`\`\`js
compose(compose(f, g), h)   // the same function as
compose(f, compose(g, h))
\`\`\`

And **identity is neutral**, which is why composing nothing has to be the identity rather than
an error:

\`\`\`js
const id = (x) => x
compose(id, f)(x)   // same as f(x)
compose(f, id)(x)   // same as f(x)
compose()(9)        // 9
\`\`\`

Those two laws are exactly what makes a [category](#category), which is the general version of
this idea.`,
  rungs: [
    {
      id: 'implement',
      covers: ['both-directions', 'laws'],
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
      covers: ['build-a-pipeline'],
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

    {
      id: 'laws',
      kind: 'code',
      role: 'apply',
      covers: ['both-directions', 'laws', 'build-a-pipeline'],
      title: "compose, pipe, and the laws that hold between them",
      prompt:
        "Write `compose`, which runs right to left, and `pipe`, which runs left to right, then `slug`, a pipeline built from the given pieces. The two directions are the same operation read from opposite ends.",
      hints: [
        "`compose(f, g)(x)` is `f(g(x))`. `pipe(f, g)(x)` is `g(f(x))`.",
        "Both take any number of functions. `reduce` and `reduceRight` differ by exactly the direction.",
        "`slug` trims, lowercases, then replaces spaces. Build it from the helpers rather than writing the steps out.",
      ],
      exports: ['compose', 'pipe', 'slug', 'identity'],
      starter: `const trim = (s) => s.trim()
const lower = (s) => s.toLowerCase()
const dashes = (s) => s.split(' ').join('-')

// identity :: a -> a
const identity = (x) => null

// compose :: (...(a -> a)) -> (a -> a)   right to left
const compose = (...fns) => identity

// pipe :: (...(a -> a)) -> (a -> a)   left to right
const pipe = (...fns) => identity

// slug :: String -> String
const slug = (s) => s
`,
      solution: `const trim = (s) => s.trim()
const lower = (s) => s.toLowerCase()
const dashes = (s) => s.split(' ').join('-')

// identity :: a -> a
const identity = (x) => x

// compose :: (...(a -> a)) -> (a -> a)   right to left
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)

// pipe :: (...(a -> a)) -> (a -> a)   left to right
const pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x)

// slug :: String -> String
const slug = pipe(trim, lower, dashes)
`,
      broken: [
        `const trim = (s) => s.trim()
const lower = (s) => s.toLowerCase()
const dashes = (s) => s.split(' ').join('-')
const identity = (x) => x
const compose = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x)
const pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x)
const slug = pipe(trim, lower, dashes)
`,
        `const trim = (s) => s.trim()
const lower = (s) => s.toLowerCase()
const dashes = (s) => s.split(' ').join('-')
const identity = (x) => x
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)
const pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x)
const slug = pipe(dashes, lower, trim)
`,
        `const trim = (s) => s.trim()
const lower = (s) => s.toLowerCase()
const dashes = (s) => s.split(' ').join('-')
const identity = (x) => ''
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x)
const pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x)
const slug = pipe(trim, lower, dashes)
`,
      ],
      checks: (T, exp) => {
        const { compose, pipe, slug, identity } = exp;
        const inc = (n: number) => n + 1;
        const dbl = (n: number) => n * 2;

        T.check('compose runs right to left', () => {
          const r = compose(inc, dbl)(5);
          return r === 11 || `compose(inc, dbl)(5) gave ${T.fmt(r)}. Doubling happens first, then the increment.`;
        });

        T.check('pipe runs left to right', () => {
          const r = pipe(inc, dbl)(5);
          return r === 12 || `pipe(inc, dbl)(5) gave ${T.fmt(r)}. The increment happens first.`;
        });

        T.check('The two directions really differ', () => {
          return compose(inc, dbl)(5) !== pipe(inc, dbl)(5) || 'Both gave the same answer for a pair that is not commutative.';
        });

        T.law('Reversing the arguments turns one into the other', 60, (G) => {
          const f = G.fn(), g = G.fn(), h = G.fn();
          const n = G.int();
          const a = compose(f.f, g.f, h.f)(n);
          const b = pipe(h.f, g.f, f.f)(n);
          return a === b || `At ${n}: compose gave ${T.fmt(a)} and the reversed pipe gave ${T.fmt(b)}.`;
        });

        T.law('Identity composes away on either side', 60, (G) => {
          const f = G.fn();
          const n = G.int();
          const got = [compose(f.f, identity)(n), compose(identity, f.f)(n), f.f(n)];
          return (got[0] === got[2] && got[1] === got[2]) || `At ${n}: ${T.fmt(got)}. The identity has to vanish from both sides.`;
        });

        T.law('Composition is associative', 60, (G) => {
          const f = G.fn(), g = G.fn(), h = G.fn();
          const n = G.int();
          const a = compose(compose(f.f, g.f), h.f)(n);
          const b = compose(f.f, compose(g.f, h.f))(n);
          return a === b || `At ${n}: ${T.fmt(a)} against ${T.fmt(b)}.`;
        });

        T.check('Composing nothing is the identity', () => {
          return (compose()(7) === 7 && pipe()(7) === 7) || `Empty compose gave ${T.fmt(compose()(7))} and empty pipe gave ${T.fmt(pipe()(7))}.`;
        });

        T.check('slug does the three steps in the right order', () => {
          const r = slug('  Hello World  ');
          return r === 'hello-world' || `slug('  Hello World  ') gave ${T.fmt(r)}. Dashing before trimming leaves the spaces as dashes.`;
        });

        T.check('slug names no argument', () => T.shape.isPointFree('slug'));
      },
    },
  ],
};
