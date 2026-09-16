import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const endomorphism: ExerciseSet = {
  termId: 'endomorphism',
  rubric: [
    {
      id: 'same-type-both-ends',
      statement:
        "Can recognize an endomorphism from its signature, and knows why the same type at both ends matters.",
    },
    {
      id: 'monoid-under-composition',
      statement:
        "Knows endomorphisms form a monoid under composition, with identity as the empty.",
    },
    {
      id: 'fold-a-pipeline',
      statement:
        "Can combine a list of transformations into one, using the monoid, including the empty case.",
    },
  ],
  notes: `An endomorphism takes a type and gives back the **same** type.

\`\`\`js
// upper :: String -> String    yes
// negate :: Number -> Number   yes
// sort :: [a] -> [a]           yes
// length :: String -> Number   no, different type out
// head :: [a] -> a             no
\`\`\`

That sameness is what makes them always composable with each other, and that in turn makes them
a [monoid](#monoid) under composition:

\`\`\`js
const Endo = (run) => ({
  run,
  concat: (other) => Endo((x) => other.run(run(x)))
})
Endo.empty = () => Endo((x) => x)      // identity is the neutral element
\`\`\`

The laws come for free from composition being associative with an identity:

\`\`\`js
Endo.empty().concat(dbl).run(5)   // 10
dbl.concat(Endo.empty()).run(5)   // 10
\`\`\`

Which means a list of transformations folds into one, and the empty list has an answer:

\`\`\`js
const steps = [(n) => n + 1, (n) => n * 2, (n) => n - 3].map(Endo)
const pipeline = steps.reduce((a, b) => a.concat(b), Endo.empty())

pipeline.run(4)      // 7

const none = [].reduce((a, b) => a.concat(b), Endo.empty())
none.run(4)          // 4, rather than an error
\`\`\`

That last line is the practical payoff. A configurable pipeline with no steps configured is
the identity, not a special case you have to write a branch for.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['same-type-both-ends'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are endomorphisms?',
      prompt: 'An endomorphism takes a type and gives back the same type. Select every one.',
      options: [
        { code: '// uppercase :: String -> String', correct: true, why: 'In and out are both String.' },
        { code: '// length :: String -> Number', correct: false, why: 'Different type out, so not an endomorphism.' },
        { code: '// negate :: Number -> Number', correct: true, why: 'Number to Number.' },
        { code: '// sort :: [a] -> [a]', correct: true, why: 'A list in, a list of the same element type out.' },
        {
          code: '// head :: [a] -> a',
          correct: false,
          why: 'A list goes in and an element comes out, which are different types.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['monoid-under-composition', 'fold-a-pipeline'],
      kind: 'code',
      role: 'implement',
      title: 'Endomorphisms form a monoid',
      prompt:
        'Because an endomorphism returns what it was given, two of them always compose. That makes them a monoid, with identity for its empty.',
      hints: [
        '`concat` composes the two functions. Pick an order and be consistent.',
        'The empty element is the function that changes nothing.',
      ],
      exports: ['Endo'],
      starter: `// Endo :: (a -> a) -> Endo a
const Endo = (run) => ({
  run,
  concat: (other) => {
  },
  inspect: () => 'Endo(?)'
})

// empty :: () -> Endo a
Endo.empty = () => {
}
`,
      solution: `// Endo :: (a -> a) -> Endo a
const Endo = (run) => ({
  run,
  // Left to right: this one, then the other.
  concat: (other) => Endo((x) => other.run(run(x))),
  inspect: () => 'Endo(?)'
})

// empty :: () -> Endo a
Endo.empty = () => Endo((x) => x)
`,
      broken: [
        // empty is not neutral.
        `const Endo = (run) => ({
  run,
  concat: (other) => Endo((x) => other.run(run(x))),
  inspect: () => 'Endo(?)'
})
Endo.empty = () => Endo((x) => 0)
`,
        // concat drops one of the two.
        `const Endo = (run) => ({
  run,
  concat: (other) => Endo(run),
  inspect: () => 'Endo(?)'
})
Endo.empty = () => Endo((x) => x)
`,
      ],
      checks: (T, exp) => {
        const Endo = exp.Endo as any;

        T.check('concat runs both', () => {
          const inc = Endo((n: number) => n + 1);
          const dbl = Endo((n: number) => n * 2);
          const r = inc.concat(dbl).run(5);
          return (
            r === 12 || r === 11 ||
            `Got ${T.fmt(r)}. Composing increment and double should give either 12 or 11 depending on the order you chose, not something else.`
          );
        });

        T.check('Both functions are actually applied', () => {
          const a = T.spyFn((n: number) => n);
          const b = T.spyFn((n: number) => n);
          Endo(a).concat(Endo(b)).run(1);
          return (
            a.calls.length === 1 && b.calls.length === 1 ||
            `The first ran ${a.calls.length} time(s) and the second ${b.calls.length}. concat has to use both.`
          );
        });

        T.check('empty leaves its input alone', () => {
          const r = Endo.empty().run(42);
          return r === 42 || `Got ${T.fmt(r)}`;
        });

        T.check('empty is neutral on both sides', () => {
          const dbl = Endo((n: number) => n * 2);
          const left = Endo.empty().concat(dbl).run(5);
          const right = dbl.concat(Endo.empty()).run(5);
          return (
            left === 10 && right === 10 ||
            `empty first gave ${T.fmt(left)} and empty last gave ${T.fmt(right)}, expected 10 for both.`
          );
        });

        T.check('A whole pipeline can be folded together', () => {
          const steps = [(n: number) => n + 1, (n: number) => n * 2, (n: number) => n - 3].map(Endo);
          const combined: any = steps.reduce((a: any, b: any) => a.concat(b), Endo.empty());
          const r = combined.run(4);
          return (
            r === 7 || r === 5 ||
            `Folding the three steps gave ${T.fmt(r)}. Left to right on 4 gives 7; right to left gives 5. Either is fine as long as concat is consistent.`
          );
        });

        laws.monoid(T, {
          of: (n: number) => Endo((x: number) => x + n),
          lift: (n: number) => Endo((x: number) => x + n),
          empty: () => Endo.empty(),
          // Two endomorphisms are equal when they agree on every input we try.
          equals: (a: any, b: any) => [-3, 0, 1, 7].every((x) => a.run(x) === b.run(x)),
          runs: 50,
        });
      },
    },
  ],
};
