import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const semigroupoid: ExerciseSet = {
  termId: 'semigroupoid',
  rubric: [
    {
      id: 'compose-stays-inside',
      statement:
        "Can write a compose that returns the same wrapper, so three morphisms chain.",
    },
    {
      id: 'direction',
      statement:
        "Knows compose reads right to left, so the argument runs first.",
    },
    {
      id: 'associativity-only',
      statement:
        "Knows associativity is the only requirement, and that an identity is what a category adds.",
    },
  ],
  notes: `A Semigroupoid is anything with an associative \`compose\`. That is the entire definition, and
it is the same step-up from [semigroup](#semigroup) that a category is from a monoid.

\`\`\`js
const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),   // other runs first
  run: (x) => f(x)
})

const inc = Morphism((n) => n + 1)
const dbl = Morphism((n) => n * 2)

inc.compose(dbl).run(5)    // 11   doubled to 10, then incremented
\`\`\`

Right to left, matching \`compose\` everywhere else. Reversing it is a different function and a
silent one when the operations happen to commute:

\`\`\`js
compose: (other) => Morphism((x) => other.f(f(x)))
inc.compose(dbl).run(5)    // 12. Incremented then doubled.
\`\`\`

And it has to stay inside the wrapper, or a chain of three has nothing to call:

\`\`\`js
compose: (other) => (x) => f(other.f(x))   // a bare function
a.compose(b).compose(c)                     // TypeError
\`\`\`

Associativity is the only law:

\`\`\`js
a.compose(b).compose(c)     // the same morphism as
a.compose(b.compose(c))
\`\`\`

What it lacks is an identity, and that is precisely what [category](#category) adds. The
semigroup-to-monoid step, one level up.`,
  rungs: [
    {
      id: 'implement',
      covers: ['compose-stays-inside', 'direction', 'associativity-only'],
      kind: 'code',
      role: 'implement',
      title: 'Composition that associates',
      prompt:
        "A Semigroupoid is anything with an associative `compose`. Wrap a function so composing two of them gives another one. Write `Morphism`.",
      hints: [
        '`compose` reads right to left: `a.compose(b)` runs b first.',
        'The result has to be another wrapper, or a chain of three will not work.',
      ],
      exports: ['Morphism'],
      starter: `// Morphism :: (a -> b) -> Semigroupoid a b
const Morphism = (f) => ({
  f,
  // compose :: Semigroupoid b c ~> Semigroupoid a b -> Semigroupoid a c
  compose: (other) => {
  },
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
`,
      solution: `// Morphism :: (a -> b) -> Semigroupoid a b
const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
`,
      broken: [
        // Composes left to right, which reverses the meaning.
        `const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => other.f(f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
`,
        // Gives back a bare function, so you cannot compose again.
        `const Morphism = (f) => ({
  f,
  compose: (other) => (x) => f(other.f(x)),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
`,
      ],
      checks: (T, exp) => {
        const Morphism = exp.Morphism as (f: (x: number) => number) => any;

        T.check('compose runs the right-hand one first', () => {
          const inc = Morphism((n: number) => n + 1);
          const dbl = Morphism((n: number) => n * 2);
          const r = inc.compose(dbl).run(5);
          return (
            r === 11 ||
            `inc.compose(dbl).run(5) gave ${T.fmt(r)}, expected 11. Doubling happens first, so 5 becomes 10 and then 11.`
          );
        });

        T.check('compose gives back something you can compose again', () => {
          const m = Morphism((n: number) => n).compose(Morphism((n: number) => n));
          return typeof m?.compose === 'function' || `Got ${T.fmt(m)}`;
        });

        T.check('Three compose in one chain', () => {
          const a = Morphism((n: number) => n + 1);
          const b = Morphism((n: number) => n * 2);
          const c = Morphism((n: number) => n - 3);
          const r = a.compose(b).compose(c).run(10);
          return r === 15 || `Got ${T.fmt(r)}, expected 15 for (10 - 3) * 2 + 1.`;
        });

        laws.semigroupoid(T, {
          lift: (f) => Morphism(f),
          run: (m, x) => m.run(x),
          runs: 60,
        });
      },
    },

    {
      id: 'recognize',
      covers: ['associativity-only'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Semigroupoid or category?',
      prompt: 'What does a Category have that a Semigroupoid does not?',
      options: [
        {
          code: '// An identity morphism, so composing with it changes nothing',
          correct: true,
          why: 'Exactly the same step as semigroup to monoid: add the neutral element.',
        },
        {
          code: '// Associative composition',
          correct: false,
          why: 'A semigroupoid already has that. It is the only thing it has.',
        },
        {
          code: '// A way to map over the contents',
          correct: false,
          why: 'Neither has one. That is Functor.',
        },
        {
          code: '// Composition that works in both directions',
          correct: false,
          why: 'Neither offers that. Reversing an arrow needs an isomorphism.',
        },
      ],
    },

    {
      id: 'no-identity',
      kind: 'code',
      role: 'break',
      covers: ['compose-stays-inside', 'direction'],
      title: "Compose without an identity to fall back on",
      prompt:
        "A semigroupoid has composition and nothing else, which is fine until you need a starting value. Write `composeAll` for a non-empty list, and show what has to happen when the list is empty.",
      hints: [
        "Composition runs right to left, so the last function in the list goes first.",
        "With no identity there is nothing to seed a fold with, so reduce without a seed.",
        "`emptyFails` should report what reducing an empty list with no seed does.",
      ],
      exports: ['composeAll', 'emptyFails'],
      starter: `// composeAll :: [b -> c] -> (a -> c)   right to left, non-empty only
const composeAll = (fns) => (x) => x

// emptyFails :: () -> String   the error name from composing nothing
const emptyFails = () => 'none'
`,
      solution: `// composeAll :: [b -> c] -> (a -> c)   right to left, non-empty only
const composeAll = (fns) => fns.reduce((f, g) => (x) => f(g(x)))

// emptyFails :: () -> String   the error name from composing nothing
const emptyFails = () => {
  try {
    composeAll([])
    return 'none'
  } catch (e) {
    return e.name
  }
}
`,
      broken: [
        `const composeAll = (fns) => fns.reduce((f, g) => (x) => f(g(x)), (x) => x)
const emptyFails = () => {
  try { composeAll([]); return 'none' } catch (e) { return e.name }
}
`,
        `const composeAll = (fns) => fns.reduce((f, g) => (x) => g(f(x)))
const emptyFails = () => {
  try { composeAll([]); return 'none' } catch (e) { return e.name }
}
`,
        `const composeAll = (fns) => fns.reduce((f, g) => (x) => f(g(x)))
const emptyFails = () => 'none'
`,
      ],
      checks: (T, exp) => {
        const { composeAll, emptyFails } = exp;
        const inc = (n: number) => n + 1;
        const dbl = (n: number) => n * 2;

        T.check('One function composes to itself', () => {
          return composeAll([inc])(1) === 2 || `A single function gave ${T.fmt(composeAll([inc])(1))}.`;
        });

        T.check('Composition runs right to left', () => {
          const r = composeAll([inc, dbl])(5);
          return r === 11 || `composeAll([inc, dbl])(5) gave ${T.fmt(r)}. The one on the right goes first.`;
        });

        T.check('Three compose in the right order', () => {
          const r = composeAll([(n: number) => n - 3, dbl, inc])(4);
          return r === 7 || `It gave ${T.fmt(r)}. Add one to 4, double to 10, subtract three to 7.`;
        });

        T.check('The result stays inside the set', () => {
          const r = composeAll([inc, dbl]);
          return typeof r === 'function' || `It gave ${T.fmt(r)}. Composing two morphisms gives a morphism, which is what lets you keep going.`;
        });

        T.law('Composition is associative even with no identity', 60, (G) => {
          const f = G.fn(), g = G.fn(), h = G.fn();
          const n = G.int();
          const a = composeAll([composeAll([f.f, g.f]), h.f])(n);
          const b = composeAll([f.f, composeAll([g.f, h.f])])(n);
          return a === b || `At ${n}: ${T.fmt(a)} against ${T.fmt(b)}.`;
        });

        T.check('Composing nothing has no answer to give', () => {
          const r = emptyFails();
          return (
            r === 'TypeError' ||
            `Composing an empty list reported ${T.fmt(r)}. With no identity there is no value of the right kind to hand back, which is exactly what a category adds.`
          );
        });

        T.check('No identity was quietly supplied as a seed', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const composeAll'), src.indexOf('const emptyFails'));
          return (
            !/reduce\s*\([\s\S]*?,\s*\(\s*x\s*\)\s*=>\s*x/.test(body) ||
            'An identity was passed as the seed. That makes composing nothing work, and it also makes this a category rather than a semigroupoid.'
          );
        });
      },
    },
  ],
};
