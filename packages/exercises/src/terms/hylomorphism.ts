import type { ExerciseSet } from '@fpx/engine/types';

export const hylomorphism: ExerciseSet = {
  termId: 'hylomorphism',
  rungs: [
    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Unfold then fold',
      prompt:
        'A hylomorphism builds a structure and immediately tears it down. Compose the two you already have, and use the result for factorial.',
      hints: [
        '`hylo(fold, unfold)` unfolds the seed into a list, then folds that list.',
        'Factorial is: unfold n down to 1, then fold by multiplying.',
      ],
      timeoutMs: 3000,
      exports: ['hylo', 'factorial'],
      starter: `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0]); current = next[1]; next = step(current)
  }
  return out
}
const cata = (step, seed, xs) => xs.reduce(step, seed)

// hylo :: ((b, a) -> b, b, (c -> [a, c] | null)) -> c -> b
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) => {
}

// factorial :: Number -> Number
const factorial = null
`,
      solution: `const unfold = (step, seed) => {
  const out = []
  let current = seed
  let next = step(current)
  while (next !== null) {
    out.push(next[0]); current = next[1]; next = step(current)
  }
  return out
}
const cata = (step, seed, xs) => xs.reduce(step, seed)

// hylo :: ((b, a) -> b, b, (c -> [a, c] | null)) -> c -> b
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) =>
  cata(foldStep, foldSeed, unfold(unfoldStep, seed))

// factorial :: Number -> Number
const factorial = hylo(
  (acc, n) => acc * n,
  1,
  (n) => (n > 0 ? [n, n - 1] : null)
)
`,
      broken: [
        // Folds from 0, so every factorial is 0.
        `const unfold = (step, seed) => {
  const out = []; let current = seed; let next = step(current)
  while (next !== null) { out.push(next[0]); current = next[1]; next = step(current) }
  return out
}
const cata = (step, seed, xs) => xs.reduce(step, seed)
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) => cata(foldStep, foldSeed, unfold(unfoldStep, seed))
const factorial = hylo((acc, n) => acc * n, 0, (n) => (n > 0 ? [n, n - 1] : null))
`,
        // Unfolds down through zero, so the product collapses.
        `const unfold = (step, seed) => {
  const out = []; let current = seed; let next = step(current)
  while (next !== null) { out.push(next[0]); current = next[1]; next = step(current) }
  return out
}
const cata = (step, seed, xs) => xs.reduce(step, seed)
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) => cata(foldStep, foldSeed, unfold(unfoldStep, seed))
const factorial = hylo((acc, n) => acc * n, 1, (n) => (n >= 0 ? [n, n - 1] : null))
`,
        // hylo folds the seed instead of the unfolded list.
        `const unfold = (step, seed) => {
  const out = []; let current = seed; let next = step(current)
  while (next !== null) { out.push(next[0]); current = next[1]; next = step(current) }
  return out
}
const cata = (step, seed, xs) => xs.reduce(step, seed)
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) => cata(foldStep, foldSeed, [seed])
const factorial = hylo((acc, n) => acc * n, 1, (n) => (n > 0 ? [n, n - 1] : null))
`,
      ],
      checks: (T, exp) => {
        const hylo = exp.hylo as (fs: (a: any, b: any) => any, seed: any, us: (c: any) => any) => (c: any) => any;
        const factorial = exp.factorial as (n: number) => number;

        T.check('factorial of the small cases', () => {
          const got = [0, 1, 2, 3, 5].map(factorial);
          return T.eq(got, [1, 1, 2, 6, 120]) || `Got ${T.fmt(got)}, expected [1, 1, 2, 6, 120].`;
        });

        T.check('Zero factorial is 1', () => {
          const r = factorial(0);
          return (
            r === 1 ||
            `Got ${T.fmt(r)}. The unfold produces nothing for 0, so the answer is whatever the fold started from.`
          );
        });

        T.check('The unfold stops before zero', () => {
          const r = factorial(4);
          return (
            r === 24 ||
            `Got ${T.fmt(r)}, expected 24. If this is 0, the unfold ran down through zero and the product swallowed everything.`
          );
        });

        T.check('hylo works for something other than factorial', () => {
          // Sum of 1..n, built the same way.
          const sumTo = hylo((acc: number, n: number) => acc + n, 0, (n: number) => (n > 0 ? [n, n - 1] : null));
          const r = sumTo(5);
          return r === 15 || `Summing 1 to 5 gave ${T.fmt(r)}, expected 15. hylo should not know anything about factorial.`;
        });

        T.check('hylo folds the unfolded list, not the seed', () => {
          const collect = hylo((acc: any[], x: number) => [...acc, x], [], (n: number) => (n > 0 ? [n, n - 1] : null));
          const r = collect(3);
          return (
            T.eq(r, [3, 2, 1]) ||
            `Got ${T.fmt(r)}, expected [3, 2, 1]. The fold should see everything the unfold produced.`
          );
        });

        T.law('factorial matches the recursive definition', 30, (G) => {
          const n = G.nat() % 10;
          let want = 1;
          for (let i = 2; i <= n; i++) want *= i;
          const got = factorial(n);
          return got === want || `factorial(${n}) gave ${T.fmt(got)}, expected ${want}.`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Why name it at all?',
      prompt: 'A hylomorphism is just an unfold followed by a fold. What is the point of the name?',
      options: [
        {
          code: '// The intermediate structure is never needed,\n// so the two halves can be fused into one pass',
          correct: true,
          why: 'Recognizing the shape is what lets a compiler, or you, remove the list that only ever existed to be consumed.',
        },
        {
          code: '// It is faster than either half alone',
          correct: false,
          why: 'It does strictly more work than either half. The saving is in fusing them.',
        },
        {
          code: '// It is the only way to write a recursive function',
          correct: false,
          why: 'Plain recursion works fine. This is about naming a recurring shape.',
        },
        {
          code: '// It guarantees the recursion terminates',
          correct: false,
          why: 'It does not. An unfold that never returns null runs forever.',
        },
      ],
    },
  ],
};
