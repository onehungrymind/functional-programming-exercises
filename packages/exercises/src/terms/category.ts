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
  ],
};
