import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const profunctor: ExerciseSet = {
  termId: 'profunctor',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Adjust both ends of a function',
      prompt:
        'A Profunctor consumes on one side and produces on the other. `promap(f, g)` pre-processes the input with f and post-processes the output with g.',
      hints: [
        'f runs first, on the way in. g runs last, on the way out.',
        '`(x) => g(run(f(x)))`.',
      ],
      exports: ['Fn'],
      starter: `// Fn :: (a -> b) -> Profunctor a b
const Fn = (run) => ({
  run,
  // promap :: ((a' -> a), (b -> b')) -> Profunctor a' b'
  promap: (f, g) => {
  },
  inspect: () => 'Fn(?)'
})
`,
      solution: `// Fn :: (a -> b) -> Profunctor a b
const Fn = (run) => ({
  run,
  // promap :: ((a' -> a), (b -> b')) -> Profunctor a' b'
  promap: (f, g) => Fn((x) => g(run(f(x)))),
  inspect: () => 'Fn(?)'
})
`,
      broken: [
        // Both functions on the output side.
        `const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => g(f(run(x)))),
  inspect: () => 'Fn(?)'
})
`,
        // The two ends swapped.
        `const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => f(run(g(x)))),
  inspect: () => 'Fn(?)'
})
`,
      ],
      checks: (T, exp) => {
        const Fn = exp.Fn as (r: (x: any) => any) => any;

        T.check('The input function runs first', () => {
          const length = Fn((s: string) => s.length);
          const trimmedLength = length.promap((s: string) => s.trim(), (n: number) => n);
          const r = trimmedLength.run('  ab  ');
          return (
            r === 2 ||
            `Got ${T.fmt(r)}, expected 2. Trimming has to happen before the length is taken, not after.`
          );
        });

        T.check('The output function runs last', () => {
          const length = Fn((s: string) => s.length);
          const isEven = length.promap((s: string) => s, (n: number) => n % 2 === 0);
          const r = isEven.run('abcd');
          return r === true || `Got ${T.fmt(r)}, expected true.`;
        });

        T.check('Both ends together', () => {
          const length = Fn((s: string) => s.length);
          const p = length.promap((s: string) => s.trim(), (n: number) => n % 2 === 0);
          const four = p.run('  code  ');
          const five = p.run(' hello ');
          return (
            four === true && five === false ||
            `"code" gave ${T.fmt(four)} and "hello" gave ${T.fmt(five)}, expected true and false.`
          );
        });

        T.check('promap gives back something you can promap again', () => {
          const p = Fn((n: number) => n).promap((n: number) => n, (n: number) => n);
          return typeof p?.promap === 'function' || `Got ${T.fmt(p)}`;
        });

        laws.profunctor(T, { of: () => Fn((n: number) => n * 3), runs: 50 });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which end is which?',
      prompt: 'A Profunctor `P a b` consumes an `a` and produces a `b`. How does it vary in each?',
      options: [
        {
          code: '// Contravariant in a, covariant in b',
          correct: true,
          why: 'The input side takes a function pointing the other way, and the output side takes one pointing the usual way.',
        },
        {
          code: '// Covariant in both',
          correct: false,
          why: 'That would be a bifunctor, not a profunctor.',
        },
        {
          code: '// Contravariant in both',
          correct: false,
          why: 'Then you could not post-process the result.',
        },
        {
          code: '// Covariant in a, contravariant in b',
          correct: false,
          why: 'The right idea, the wrong way round. The consuming side is the contravariant one.',
        },
      ],
    },
  ],
};
