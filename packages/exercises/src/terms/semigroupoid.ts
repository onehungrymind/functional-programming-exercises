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
        'A Semigroupoid is anything with an associative `compose`. Wrap a function so composing two of them gives another one.',
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
  ],
};
