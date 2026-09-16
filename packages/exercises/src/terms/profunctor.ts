import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const profunctor: ExerciseSet = {
  termId: 'profunctor',
  rubric: [
    {
      id: 'both-ends',
      statement:
        "Can adapt the input and the output of a function-like structure in one step, with the input function running first.",
    },
    {
      id: 'variance',
      statement:
        "Knows it is contravariant in what it consumes and covariant in what it produces.",
    },
    {
      id: 'composition-order',
      statement:
        "Knows the input functions compose in reverse and the output functions compose forwards.",
    },
  ],
  notes: `A profunctor consumes on one side and produces on the other, so it can be adapted at both ends
at once.

\`\`\`js
const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => g(run(f(x))))
//                        ^^^^^^^^^^^^^^^ f on the way in, g on the way out
})

const length = Fn((s) => s.length)

const trimmedIsEven = length.promap(
  (s) => s.trim(),          // pre-process the input
  (n) => n % 2 === 0        // post-process the output
)

trimmedIsEven.run('  code  ')   // true   trims to 'code', length 4
trimmedIsEven.run(' hello ')    // false  trims to 'hello', length 5
\`\`\`

Order matters and is easy to get backwards. Running both functions on the output is a common
slip and it silently changes what the thing means:

\`\`\`js
promap: (f, g) => Fn((x) => g(f(run(x))))   // trims a number
\`\`\`

The variance follows from the direction of travel. The input side is
[contravariant](#contravariant-functor), because adapting it means accepting a **wider** set of
things by converting them first. The output side is covariant, the ordinary kind.

So the composition law is mixed:

\`\`\`js
p.promap(f, g).promap(h, i)
// equals
p.promap((x) => f(h(x)), (y) => i(g(y)))
//        ^^^^^^^^^^^^^^ reversed     ^^^^^^^^^^^^^^ forwards
\`\`\`

Functions are the canonical profunctor, and profunctors are the foundation under the optics in
this glossary: a lens is a profunctor transformation.`,
  rungs: [
    {
      id: 'implement',
      covers: ['both-ends', 'composition-order'],
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
      covers: ['variance'],
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
