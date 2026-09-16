import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const category: ExerciseSet = {
  termId: 'category',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
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
