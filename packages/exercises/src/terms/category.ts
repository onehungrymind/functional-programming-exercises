import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const category: ExerciseSet = {
  termId: 'category',
  rubric: [
    {
      id: 'identity-morphism',
      statement:
        "Can supply an identity morphism and knows it must be neutral composed on either side.",
    },
    {
      id: 'id-is-a-morphism',
      statement:
        "Knows the identity has to be a morphism itself, not a bare function, so it can be composed.",
    },
    {
      id: 'what-is-required',
      statement:
        "Can say what a category requires and what it does not, in particular that arrows need no inverses.",
    },
  ],
  notes: `A Category is a [semigroupoid](#semigroupoid) with an identity: associative composition, plus
an arrow that changes nothing.

\`\`\`js
Morphism.id = () => Morphism((x) => x)

const dbl = Morphism((n) => n * 2)

Morphism.id().compose(dbl).run(5)   // 10
dbl.compose(Morphism.id()).run(5)   // 10
\`\`\`

Both sides have to be neutral, and the identity has to be a **morphism**, not a bare function,
or there is nothing to compose it with:

\`\`\`js
Morphism.id = () => (x) => x         // a function
Morphism.id().compose(dbl)           // TypeError: compose is not a function
\`\`\`

What a category does **not** require is inverses. Most arrows cannot be reversed and that is
fine; requiring them would make it a groupoid:

\`\`\`js
const length = Morphism((s) => s.length)   // perfectly good morphism, no way back
\`\`\`

Nor does it require the objects to be types or the arrows to be functions. Functions and types
are one example. [Kleisli composition](#kleisli-composition) is another: the arrows are
\`a -> M b\` and the identity is \`M.of\`, and that is a category for exactly the same reasons.

\`\`\`js
composeK(composeK(h, g), f)   // associative
composeK(M.of, f)             // the same as f
composeK(f, M.of)             // the same as f
\`\`\`

Which is what the monad laws are, read sideways: the two identity laws and associativity say
precisely that Kleisli arrows form a category.`,
  rungs: [
    {
      id: 'implement',
      covers: ['identity-morphism', 'id-is-a-morphism'],
      kind: 'code',
      role: 'implement',
      title: 'Composition with an identity',
      prompt:
        'A Category is a Semigroupoid with an `id` that leaves any morphism alone, composed on either side.',
      hints: [
        '`id` is the morphism that does nothing at all to its input.',
        'It hangs off the constructor: `Morphism.id()`.',
      ],
      exports: ['Morphism'],
      starter: `const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})

// id :: () -> Category a a
Morphism.id = () => {
}
`,
      solution: `const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})

// id :: () -> Category a a
Morphism.id = () => Morphism((x) => x)
`,
      broken: [
        // id does something, so it is not an identity.
        `const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
Morphism.id = () => Morphism((x) => x + 0.0001)
`,
        // id is a bare function, not a morphism, so it cannot be composed.
        `const Morphism = (f) => ({
  f,
  compose: (other) => Morphism((x) => f(other.f(x))),
  run: (x) => f(x),
  inspect: () => 'Morphism(?)'
})
Morphism.id = () => (x) => x
`,
      ],
      checks: (T, exp) => {
        const Morphism = exp.Morphism as any;

        T.check('id is a morphism', () => {
          const i = Morphism.id();
          return (
            i && typeof i.compose === 'function' ||
            `Got ${T.fmt(i)}. id has to be a morphism, or it cannot be composed with one.`
          );
        });

        T.check('id passes its input through', () => {
          const r = Morphism.id().run(7);
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('Composing id first changes nothing', () => {
          const dbl = Morphism((n: number) => n * 2);
          const r = Morphism.id().compose(dbl).run(5);
          return r === 10 || `Got ${T.fmt(r)}, expected 10.`;
        });

        T.check('Composing id last changes nothing either', () => {
          const dbl = Morphism((n: number) => n * 2);
          const r = dbl.compose(Morphism.id()).run(5);
          return r === 10 || `Got ${T.fmt(r)}, expected 10. Both sides have to be neutral.`;
        });

        laws.category(T, {
          lift: (f) => Morphism(f),
          id: () => Morphism.id(),
          run: (m, x) => m.run(x),
          runs: 60,
        });
      },
    },

    {
      id: 'recognize',
      covers: ['what-is-required'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'What makes a category?',
      prompt: 'Select every requirement a Category has.',
      options: [
        { code: '// Composition is associative', correct: true, why: 'Inherited from Semigroupoid.' },
        {
          code: '// There is an identity for every object',
          correct: true,
          why: 'And it has to be neutral composed on either side.',
        },
        {
          code: '// Every morphism has an inverse',
          correct: false,
          why: 'That would be a groupoid. Most categories have arrows you cannot reverse.',
        },
        {
          code: '// The objects are types and the morphisms are functions',
          correct: false,
          why: 'One example, not a requirement. Objects and arrows can be many things.',
        },
      ],
    },

    {
      id: 'check-the-laws',
      kind: 'code',
      role: 'apply',
      covers: ['what-is-required', 'identity-morphism', 'id-is-a-morphism'],
      title: "Write the check for what a category requires",
      prompt:
        "A category needs composition that is associative and an identity at every object. Write `isCategory`, which takes a candidate and reports whether both hold, then show it rejecting one that composes fine and has no identity.",
      hints: [
        "Two laws. Composing three ways must not depend on the bracketing, and `id` must vanish on either side.",
        "The candidate gives you `compose`, `id`, and some sample morphisms to try them on.",
        "`noIdentity` should compose perfectly well. That is what makes it a useful thing to be rejected.",
      ],
      exports: ['isCategory', 'associative', 'hasIdentity', 'noIdentity'],
      starter: `// A candidate :: { compose, id, samples, apply }
// apply runs a morphism on a test value so you can compare behaviour.

// associative :: Candidate -> Boolean
const associative = (c) => true

// hasIdentity :: Candidate -> Boolean
const hasIdentity = (c) => true

// isCategory :: Candidate -> Boolean
const isCategory = (c) => true

// noIdentity :: Candidate   composes fine, has no identity
const noIdentity = {
  compose: (f, g) => (x) => f(g(x)),
  id: (x) => x,
  samples: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
  apply: (m, x) => m(x)
}
`,
      solution: `// A candidate :: { compose, id, samples, apply }
// apply runs a morphism on a test value so you can compare behaviour.

const same = (c, m, n) => [0, 1, 2, 7].every((x) => c.apply(m, x) === c.apply(n, x))

// associative :: Candidate -> Boolean
const associative = (c) =>
  c.samples.every((f) =>
    c.samples.every((g) =>
      c.samples.every((h) =>
        same(c, c.compose(c.compose(f, g), h), c.compose(f, c.compose(g, h)))
      )
    )
  )

// hasIdentity :: Candidate -> Boolean
const hasIdentity = (c) =>
  c.samples.every((f) => same(c, c.compose(f, c.id), f) && same(c, c.compose(c.id, f), f))

// isCategory :: Candidate -> Boolean
const isCategory = (c) => associative(c) && hasIdentity(c)

// noIdentity :: Candidate   composes fine, has no identity
const noIdentity = {
  compose: (f, g) => (x) => f(g(x)),
  id: (x) => x + 1,
  samples: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
  apply: (m, x) => m(x)
}
`,
      broken: [
        `const same = (c, m, n) => [0, 1, 2, 7].every((x) => c.apply(m, x) === c.apply(n, x))
const associative = (c) =>
  c.samples.every((f) => same(c, c.compose(c.compose(f, f), f), c.compose(f, c.compose(f, f))))
const hasIdentity = (c) =>
  c.samples.every((f) => same(c, c.compose(f, c.id), f) && same(c, c.compose(c.id, f), f))
const isCategory = (c) => associative(c) && hasIdentity(c)
const noIdentity = {
  compose: (f, g) => (x) => f(g(x)),
  id: (x) => x + 1,
  samples: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
  apply: (m, x) => m(x)
}
`,
        `const same = (c, m, n) => [0, 1, 2, 7].every((x) => c.apply(m, x) === c.apply(n, x))
const associative = (c) =>
  c.samples.every((f) =>
    c.samples.every((g) =>
      c.samples.every((h) =>
        same(c, c.compose(c.compose(f, g), h), c.compose(f, c.compose(g, h)))
      )
    )
  )
const hasIdentity = (c) => c.samples.every((f) => same(c, c.compose(f, c.id), f))
const isCategory = (c) => associative(c) && hasIdentity(c)
const noIdentity = {
  compose: (f, g) => (x) => f(g(x)),
  id: (x) => x,
  samples: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
  apply: (m, x) => m(x)
}
`,
        `const same = (c, m, n) => [0, 1, 2, 7].every((x) => c.apply(m, x) === c.apply(n, x))
const associative = (c) => true
const hasIdentity = (c) =>
  c.samples.every((f) => same(c, c.compose(f, c.id), f) && same(c, c.compose(c.id, f), f))
const isCategory = (c) => associative(c) && hasIdentity(c)
const noIdentity = {
  compose: (f, g) => (x) => f(g(x)),
  id: (x) => x + 1,
  samples: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
  apply: (m, x) => m(x)
}
`,
      ],
      checks: (T, exp) => {
        const { isCategory, associative, hasIdentity, noIdentity } = exp;
        const fns = {
          compose: (f: (x: number) => number, g: (x: number) => number) => (x: number) => f(g(x)),
          id: (x: number) => x,
          samples: [(n: number) => n + 1, (n: number) => n * 2, (n: number) => n - 3],
          apply: (m: (x: number) => number, x: number) => m(x),
        };

        T.check('Functions under composition are a category', () => {
          return isCategory(fns) === true || `Functions under composition were reported as ${T.fmt(isCategory(fns))}.`;
        });

        T.check('Composition is associative there', () => {
          return associative(fns) === true || `Associativity was reported as ${T.fmt(associative(fns))}.`;
        });

        T.check('The identity is the identity there', () => {
          return hasIdentity(fns) === true || `The identity law was reported as ${T.fmt(hasIdentity(fns))}.`;
        });

        T.check('A non-associative composition is caught', () => {
          const bad = { ...fns, compose: (f: (x: number) => number, g: (x: number) => number) => (x: number) => f(g(x)) + 1 };
          return associative(bad) === false || `A composition that adds one each time was reported as ${T.fmt(associative(bad))}.`;
        });

        T.check('The candidate with the wrong identity composes perfectly well', () => {
          return (
            associative(noIdentity) === true ||
            `noIdentity was reported as non-associative. It is meant to compose fine, so that the thing it is missing is exactly one law.`
          );
        });

        T.check('And it is still rejected', () => {
          const h = hasIdentity(noIdentity);
          const c = isCategory(noIdentity);
          return (
            h === false && c === false ||
            `The identity law reported ${T.fmt(h)} and isCategory reported ${T.fmt(c)}. Composition alone is a semigroupoid; the identity is what makes it a category.`
          );
        });

        T.check('Both sides of the identity law are checked', () => {
          const leftOnly = {
            ...fns,
            compose: (f: (x: number) => number, g: (x: number) => number) => (x: number) =>
              g === fns.id ? f(x) : f(g(x) + 1),
          };
          return (
            hasIdentity(leftOnly) === false ||
            `A composition where the identity vanishes on one side only was reported as ${T.fmt(hasIdentity(leftOnly))}. The law has to hold from both directions.`
          );
        });

        T.check('Mixed triples are tried, not just one morphism against itself', () => {
          // Counting compose calls would not tell them apart, because checking f against
          // itself still composes twice per sample. Counting how much of the candidate
          // actually gets run does: 27 triples is an order of magnitude more work than 3.
          let ran = 0;
          const counting = {
            ...fns,
            apply: (m: (x: number) => number, x: number) => {
              ran += 1;
              return m(x);
            },
          };
          associative(counting);
          return (
            ran >= 100 ||
            `The candidate's morphisms ran ${ran} times. Three samples give 27 triples, and an implementation that only checks f against itself does a fraction of that, so it misses every case where the bracketing could matter.`
          );
        });
      },
    },
  ],
};
