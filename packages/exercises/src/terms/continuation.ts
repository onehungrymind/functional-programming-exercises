import type { ExerciseSet } from '@fpx/engine/types';

export const continuation: ExerciseSet = {
  termId: 'continuation',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Convert to continuation-passing style',
      prompt:
        'In continuation-passing style a function never returns. It takes an extra argument, the continuation, and hands its answer to that instead.',
      hints: [
        'Replace every `return x` with `done(x)`.',
        'When one step feeds another, the first step passes a continuation that does the rest.',
      ],
      exports: ['addCps', 'squareCps', 'addThenSquare'],
      starter: `// Direct style:
//   const add = (a, b) => a + b
//   const square = (n) => n * n

// addCps :: (Number, Number, (Number -> r)) -> r
const addCps = (a, b, done) => {
}

// squareCps :: (Number, (Number -> r)) -> r
const squareCps = (n, done) => {
}

// addThenSquare :: (Number, Number, (Number -> r)) -> r
const addThenSquare = (a, b, done) => {
  // use the two above, without returning anything yourself
}
`,
      solution: `// addCps :: (Number, Number, (Number -> r)) -> r
const addCps = (a, b, done) => done(a + b)

// squareCps :: (Number, (Number -> r)) -> r
const squareCps = (n, done) => done(n * n)

// addThenSquare :: (Number, Number, (Number -> r)) -> r
const addThenSquare = (a, b, done) =>
  addCps(a, b, (sum) => squareCps(sum, done))
`,
      broken: [
        // Returns instead of continuing: direct style wearing a CPS signature.
        `const addCps = (a, b, done) => a + b
const squareCps = (n, done) => n * n
const addThenSquare = (a, b, done) => done(squareCps(addCps(a, b)))
`,
        // Squares before adding.
        `const addCps = (a, b, done) => done(a + b)
const squareCps = (n, done) => done(n * n)
const addThenSquare = (a, b, done) => squareCps(a, (sq) => addCps(sq, b, done))
`,
        // Drops the outer continuation and calls it twice over.
        `const addCps = (a, b, done) => done(a + b)
const squareCps = (n, done) => done(n * n)
const addThenSquare = (a, b, done) => addCps(a, b, (sum) => done(squareCps(sum, done)))
`,
      ],
      checks: (T, exp) => {
        const addCps = exp.addCps as (a: number, b: number, k: (n: number) => any) => any;
        const squareCps = exp.squareCps as (n: number, k: (n: number) => any) => any;
        const addThenSquare = exp.addThenSquare as (a: number, b: number, k: (n: number) => any) => any;

        T.check('addCps hands the sum to the continuation', () => {
          let got: number | undefined;
          addCps(2, 3, (n) => {
            got = n;
          });
          return got === 5 || `The continuation received ${T.fmt(got)}. In CPS the answer arrives through the continuation, not as a return value.`;
        });

        T.check('squareCps hands the square to the continuation', () => {
          let got: number | undefined;
          squareCps(4, (n) => {
            got = n;
          });
          return got === 16 || `The continuation received ${T.fmt(got)}.`;
        });

        T.check('addThenSquare adds first, then squares', () => {
          let got: number | undefined;
          addThenSquare(2, 3, (n) => {
            got = n;
          });
          return got === 25 || `The continuation received ${T.fmt(got)}, expected 25. Add 2 and 3 to get 5, then square it.`;
        });

        T.check('The continuation is called exactly once', () => {
          const spy = T.spyFn((n: number) => n);
          addThenSquare(1, 2, spy);
          return (
            spy.calls.length === 1 ||
            `It was called ${spy.calls.length} times, with ${T.fmt(spy.calls)}. Each step passes the answer on to exactly one continuation.`
          );
        });

        T.check('The continuation decides what happens next', () => {
          let out = '';
          addThenSquare(1, 1, (n) => {
            out = `got ${n}`;
          });
          return out === 'got 4' || `Got ${T.fmt(out)}. Whatever the caller wants to do next lives in the continuation.`;
        });

        T.law('It agrees with the direct-style version everywhere', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          let got: number | undefined;
          addThenSquare(a, b, (n) => {
            got = n;
          });
          const want = (a + b) * (a + b);
          return got === want || `On (${a}, ${b}) the continuation received ${T.fmt(got)}, expected ${want}.`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is the continuation?',
      prompt: 'In `addCps(2, 3, (sum) => console.log(sum))`, which part is the continuation?',
      options: [
        {
          code: '(sum) => console.log(sum)',
          correct: true,
          why: 'It is "the rest of the program": what should happen once the answer exists.',
        },
        { code: 'addCps', correct: false, why: 'That is the function taking a continuation, not the continuation itself.' },
        { code: '2 and 3', correct: false, why: 'Ordinary arguments.' },
        {
          code: 'The value 5 that addCps produces',
          correct: false,
          why: 'That is what gets handed to the continuation, not the continuation.',
        },
      ],
    },
  ],
};
