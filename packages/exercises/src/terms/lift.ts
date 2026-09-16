import type { ExerciseSet } from '@fpx/engine/types';

export const lift: ExerciseSet = {
  termId: 'lift',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Lift an ordinary function into a container',
      prompt:
        'Lifting takes a function that knows nothing about containers and makes it work on them. Write `liftA2` once, and use it on two different types.',
      hints: [
        'The same definition works for anything with `map` and `ap`. That is the point of writing it once.',
        '`ma.map(curried).ap(mb)`.',
      ],
      exports: ['liftA2'],
      starter: `// liftA2 :: ((a, b) -> c) -> f a -> f b -> f c
const liftA2 = (f) => (ma) => (mb) => {
}
`,
      solution: `// liftA2 :: ((a, b) -> c) -> f a -> f b -> f c
const liftA2 = (f) => (ma) => (mb) => ma.map((a) => (b) => f(a, b)).ap(mb)
`,
      broken: [
        // Forgets to curry before ap.
        `const liftA2 = (f) => (ma) => (mb) => ma.map(f).ap(mb)
`,
        // Arguments swapped.
        `const liftA2 = (f) => (ma) => (mb) => mb.map((b) => (a) => f(a, b)).ap(ma)
`,
      ],
      checks: (T, exp) => {
        const liftA2 = exp.liftA2 as (f: (a: any, b: any) => any) => (ma: any) => (mb: any) => any;

        // Two unrelated applicatives, to show the same lift works on both.
        const Box = (value: any): any => ({
          value,
          map: (f: any) => Box(f(value)),
          ap: (other: any) => other.map(value),
          inspect: () => `Box(${JSON.stringify(value)})`,
        });
        const List = (xs: any[]): any => ({
          xs,
          map: (f: any) => List(xs.map(f)),
          ap: (other: any) => List(xs.flatMap((f: any) => other.xs.map(f))),
          inspect: () => `List(${JSON.stringify(xs)})`,
        });

        T.check('It works on a single-value container', () => {
          const r = liftA2((a: number, b: number) => a + b)(Box(2))(Box(3));
          return r?.value === 5 || `Got ${T.fmt(r)}, expected Box(5).`;
        });

        T.check('The arguments arrive in the order they were given', () => {
          const r = liftA2((a: number, b: number) => a - b)(Box(10))(Box(3));
          return r?.value === 7 || `Got ${T.fmt(r)}, expected Box(7).`;
        });

        T.check('The same definition works on a list', () => {
          const r = liftA2((a: number, b: number) => a + b)(List([1, 2]))(List([10, 20]));
          return (
            T.eq(r?.xs, [11, 21, 12, 22]) ||
            `Got ${T.fmt(r)}, expected List([11, 21, 12, 22]). One definition should serve every applicative, because it only uses map and ap.`
          );
        });

        T.check('It never reaches inside the container', () => {
          // A container with no readable field: only map and ap are available.
          const Opaque = (v: any): any => ({
            map: (f: any) => Opaque(f(v)),
            ap: (o: any) => o.map(v),
            reveal: () => v,
          });
          const r = liftA2((a: number, b: number) => a * b)(Opaque(3))(Opaque(4));
          return (
            r?.reveal?.() === 12 ||
            `Got ${T.fmt(r)}. If this fails, the definition is reading a field like .value instead of going through map and ap.`
          );
        });

        T.check('It is curried, one argument at a time', () => {
          const add = liftA2((a: number, b: number) => a + b);
          const addTo2 = add(Box(2));
          return (
            typeof add === 'function' && typeof addTo2 === 'function' && addTo2(Box(8))?.value === 10 ||
            'Each step should take one argument and hand back the next function.'
          );
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does lifting need from the container?',
      prompt: 'One `liftA2` serves every applicative. What does it rely on?',
      options: [
        {
          code: '// map and ap, and nothing else',
          correct: true,
          why: 'It never looks inside. That is exactly why the same definition works for Box, Array, Maybe and the rest.',
        },
        {
          code: '// A .value field to read',
          correct: false,
          why: 'Then it would only work for containers shaped that way, which defeats the purpose.',
        },
        {
          code: '// chain',
          correct: false,
          why: 'chain is stronger than needed. Applicative is enough, and some things have ap without chain.',
        },
        {
          code: '// A way to compare two containers',
          correct: false,
          why: 'Useful for testing the laws, but lifting itself never compares anything.',
        },
      ],
    },
  ],
};
