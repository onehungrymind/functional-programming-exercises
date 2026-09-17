import type { ExerciseSet } from '@fpx/engine/types';

export const hylomorphism: ExerciseSet = {
  termId: 'hylomorphism',
  rubric: [
    {
      id: 'unfold-then-fold',
      statement:
        "Can compose an unfold and a fold into one function over a seed.",
    },
    {
      id: 'intermediate-is-throwaway',
      statement:
        "Knows the structure in the middle exists only to be consumed, which is what makes fusing the two halves possible.",
    },
    {
      id: 'general',
      statement:
        "Knows the shape is not specific to any one problem, and can use the same hylo for a different fold.",
    },
  ],
  notes: `A hylomorphism builds a structure and immediately tears it down. Unfold, then fold, with the
middle never really needed.

\`\`\`js
const hylo = (foldStep, foldSeed, unfoldStep) => (seed) =>
  cata(foldStep, foldSeed, unfold(unfoldStep, seed))

const factorial = hylo(
  (acc, n) => acc * n,                      // fold: multiply
  1,                                        // seed: the identity for multiplication
  (n) => (n > 0 ? [n, n - 1] : null)        // unfold: n down to 1
)

factorial(5)   // 120
factorial(0)   // 1, because the unfold produces nothing and the seed stands
\`\`\`

Both boundaries matter, and both are silent when wrong:

\`\`\`js
hylo((acc, n) => acc * n, 0, ...)                 // every factorial is 0
hylo(..., 1, (n) => (n >= 0 ? [n, n - 1] : null)) // includes 0, so the product collapses
\`\`\`

The shape is general, not a factorial trick. Change the fold and you have something else
entirely:

\`\`\`js
const sumTo = hylo((acc, n) => acc + n, 0, (n) => (n > 0 ? [n, n - 1] : null))
sumTo(5)     // 15

const collect = hylo((acc, x) => [...acc, x], [], (n) => (n > 0 ? [n, n - 1] : null))
collect(3)   // [3, 2, 1]
\`\`\`

Worth naming because the intermediate list is **pure overhead**: it is built one element at a
time and consumed one element at a time, and nothing else ever sees it. Recognizing the shape is
what lets you fuse the two halves and never allocate it. A compiler doing deforestation is
spotting exactly this.

It does not guarantee termination. An unfold that never returns null runs forever, and
composing a fold onto it does not help.`,
  rungs: [
    {
      id: 'apply',
      covers: ['unfold-then-fold', 'general'],
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
      covers: ['intermediate-is-throwaway'],
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

    {
      id: 'throwaway',
      kind: 'code',
      role: 'apply',
      covers: ['intermediate-is-throwaway', 'unfold-then-fold', 'general'],
      title: "Count what the middle costs, then remove it",
      prompt:
        "A hylomorphism unfolds and then folds, and the list in between exists only to be consumed. Write the two-pass version and a fused one that never builds it, and measure the difference.",
      hints: [
        "`hylo` is `fold(unfold(seed))`. Write it that way first, honestly, with the list really there.",
        "`fused` does the same arithmetic without ever pushing to an array. The recursion carries the value straight into the fold.",
        "`built` should report how many elements the two-pass version put in its intermediate array.",
      ],
      exports: ['unfold', 'hylo', 'fused', 'built'],
      starter: `// unfold :: ((b -> [a, b] | null), b) -> [a]
const unfold = (step, seed) => []

// hylo :: (step, fold, seed, init) -> b   unfold, then fold the list
const hylo = (step, f, init, seed) => init

// fused :: (step, fold, seed, init) -> b   same answer, no list
const fused = (step, f, init, seed) => init

// built :: (step, seed) -> Number   how many elements the middle list held
const built = (step, seed) => 0
`,
      solution: `// unfold :: ((b -> [a, b] | null), b) -> [a]
const unfold = (step, seed) => {
  const out = []
  let s = seed
  let next = step(s)
  while (next !== null) {
    out.push(next[0])
    s = next[1]
    next = step(s)
  }
  return out
}

// hylo :: (step, fold, seed, init) -> b   unfold, then fold the list
const hylo = (step, f, init, seed) => unfold(step, seed).reduce(f, init)

// fused :: (step, fold, seed, init) -> b   same answer, no list
const fused = (step, f, init, seed) => {
  let acc = init
  let s = seed
  let next = step(s)
  while (next !== null) {
    acc = f(acc, next[0])
    s = next[1]
    next = step(s)
  }
  return acc
}

// built :: (step, seed) -> Number   how many elements the middle list held
const built = (step, seed) => unfold(step, seed).length
`,
      broken: [
        `const unfold = (step, seed) => {
  const out = []
  let s = seed
  let next = step(s)
  while (next !== null) {
    out.push(next[0])
    s = next[1]
    next = step(s)
  }
  return out
}
const hylo = (step, f, init, seed) => unfold(step, seed).reduce(f, init)
const fused = (step, f, init, seed) => unfold(step, seed).reduce(f, init)
const built = (step, seed) => unfold(step, seed).length
`,
        `const unfold = (step, seed) => {
  const out = []
  let s = seed
  let next = step(s)
  while (next !== null) {
    out.push(next[1])
    s = next[1]
    next = step(s)
  }
  return out
}
const hylo = (step, f, init, seed) => unfold(step, seed).reduce(f, init)
const fused = (step, f, init, seed) => {
  let acc = init
  let s = seed
  let next = step(s)
  while (next !== null) {
    acc = f(acc, next[0])
    s = next[1]
    next = step(s)
  }
  return acc
}
const built = (step, seed) => unfold(step, seed).length
`,
        `const unfold = (step, seed) => {
  const out = []
  let s = seed
  let next = step(s)
  while (next !== null) {
    out.push(next[0])
    s = next[1]
    next = step(s)
  }
  return out
}
const hylo = (step, f, init, seed) => unfold(step, seed).reduce(f, init)
const fused = (step, f, init, seed) => {
  let acc = init
  let s = seed
  let next = step(s)
  while (next !== null) {
    acc = f(next[0], acc)
    s = next[1]
    next = step(s)
  }
  return acc
}
const built = (step, seed) => unfold(step, seed).length
`,
      ],
      checks: (T, exp) => {
        const { unfold, hylo, fused, built } = exp;
        const countdown = (n: number) => (n === 0 ? null : [n, n - 1]);
        const add = (a: number, b: number) => a + b;

        T.check('unfold builds from a seed', () => {
          const r = unfold(countdown, 4);
          return T.eq(r, [4, 3, 2, 1]) || `unfold gave ${T.fmt(r)}, expected [4, 3, 2, 1].`;
        });

        T.check('A seed that stops immediately gives nothing', () => {
          return T.eq(unfold(countdown, 0), []) || `unfold from 0 gave ${T.fmt(unfold(countdown, 0))}.`;
        });

        T.check('The two-pass version folds the list', () => {
          const r = hylo(countdown, add, 0, 4);
          return r === 10 || `hylo gave ${T.fmt(r)}, expected 10.`;
        });

        T.check('The fused version gives the same answer', () => {
          const r = fused(countdown, add, 0, 4);
          return r === 10 || `fused gave ${T.fmt(r)}, expected 10.`;
        });

        T.check('The middle list really is built by the two-pass version', () => {
          const r = built(countdown, 100);
          return r === 100 || `built reported ${T.fmt(r)} for a countdown from 100. The whole list is materialised before the fold can start.`;
        });

        T.check('The fused version builds no array at all', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const fused'), src.indexOf('const built'));
          return (
            !/unfold\s*\(|\.push\(|\[\s*\.\.\./.test(body) ||
            'fused still goes through a list. The intermediate structure existing only to be thrown away is exactly the cost the fusion removes.'
          );
        });

        T.law('Both agree at every seed', 60, (G) => {
          const n = G.nat() % 20;
          const a = hylo(countdown, add, 0, n);
          const b = fused(countdown, add, 0, n);
          return a === b || `From ${n}: two-pass gave ${T.fmt(a)} and fused gave ${T.fmt(b)}.`;
        });

        T.check('Both work for a fold that is not a sum', () => {
          const a = hylo(countdown, (acc: string, n: number) => acc + n, '', 3);
          const b = fused(countdown, (acc: string, n: number) => acc + n, '', 3);
          return (a === '321' && b === '321') || `Two-pass gave ${T.fmt(a)} and fused gave ${T.fmt(b)}, expected '321' from both.`;
        });
      },
    },
  ],
};
