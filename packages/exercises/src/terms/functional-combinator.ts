import type { ExerciseSet } from '@fpx/engine/types';

export const functionalCombinator: ExerciseSet = {
  termId: 'functional-combinator',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'The classic combinators',
      prompt:
        'A combinator is a function built only from its own arguments, with nothing free. Write I (identity), K (constant), C (flip), and S (substitution).',
      hints: [
        'I hands its argument straight back. K ignores its second argument entirely.',
        'C takes a two-step function and swaps the order the arguments arrive in.',
        'S is `f => g => x => f(x)(g(x))`: both branches see the same x.',
      ],
      exports: ['I', 'K', 'C', 'S'],
      starter: `// I :: a -> a
const I = (x) => {
}

// K :: a -> b -> a
const K = (x) => (y) => {
}

// C :: (a -> b -> c) -> b -> a -> c
const C = (f) => (b) => (a) => {
}

// S :: (a -> b -> c) -> (a -> b) -> a -> c
const S = (f) => (g) => (x) => {
}
`,
      solution: `// I :: a -> a
const I = (x) => x

// K :: a -> b -> a
const K = (x) => (y) => x

// C :: (a -> b -> c) -> b -> a -> c
const C = (f) => (b) => (a) => f(a)(b)

// S :: (a -> b -> c) -> (a -> b) -> a -> c
const S = (f) => (g) => (x) => f(x)(g(x))
`,
      broken: [
        // K keeps the wrong one.
        `const I = (x) => x
const K = (x) => (y) => y
const C = (f) => (b) => (a) => f(a)(b)
const S = (f) => (g) => (x) => f(x)(g(x))
`,
        // C forgets to flip.
        `const I = (x) => x
const K = (x) => (y) => x
const C = (f) => (b) => (a) => f(b)(a)
const S = (f) => (g) => (x) => f(x)(g(x))
`,
        // S passes g rather than g's result.
        `const I = (x) => x
const K = (x) => (y) => x
const C = (f) => (b) => (a) => f(a)(b)
const S = (f) => (g) => (x) => f(x)(g)
`,
      ],
      checks: (T, exp) => {
        const I = exp.I as <A>(x: A) => A;
        const K = exp.K as <A>(x: A) => (y: unknown) => A;
        const C = exp.C as (f: any) => (b: any) => (a: any) => any;
        const S = exp.S as (f: any) => (g: any) => (x: any) => any;

        T.law('I hands back exactly what it was given', 60, (G) => {
          const n = G.int();
          return I(n) === n || `I(${n}) gave ${T.fmt(I(n))}.`;
        });

        T.check('I works on anything, not just numbers', () => {
          const o = { a: 1 };
          return I(o) === o || 'I returned a different object. It should hand back the very same value.';
        });

        T.law('K keeps the first and ignores the second', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          const r = K(a)(b);
          return r === a || `K(${a})(${b}) gave ${T.fmt(r)}. K keeps the first argument and throws the second away.`;
        });

        T.check('K never looks at its second argument', () => {
          const spy = T.spyFn(() => 'boom');
          K('kept')(spy);
          return spy.calls.length === 0 || 'K called its second argument. It should ignore it completely.';
        });

        T.law('C swaps the order the arguments arrive in', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          const sub = (x: number) => (y: number) => x - y;
          const flipped = C(sub)(a)(b);
          return (
            flipped === b - a ||
            `With sub = x => y => x - y, C(sub)(${a})(${b}) gave ${T.fmt(flipped)}, expected ${b - a}. C makes the second argument arrive first.`
          );
        });

        T.check('C applied twice is back where it started', () => {
          const sub = (x: number) => (y: number) => x - y;
          const twice = C(C(sub));
          return twice(10)(3) === 7 || `Flipping twice gave ${T.fmt(twice(10)(3))}, expected 7.`;
        });

        T.check('S feeds the same argument to both branches', () => {
          const add = (x: number) => (y: number) => x + y;
          const dbl = S(add)(I as any);
          const r = dbl(5);
          return r === 10 || `S(add)(I)(5) gave ${T.fmt(r)}, expected 10. Both branches see the same 5.`;
        });

        T.check('S(K)(K) behaves like identity', () => {
          const r = S(K)(K)(42);
          return (
            r === 42 ||
            `S(K)(K)(42) gave ${T.fmt(r)}. This identity falls out of the definitions, so if it fails one of K or S is off.`
          );
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What disqualifies a combinator?',
      prompt: 'A combinator uses nothing but its own arguments. Pick the one that is not a combinator.',
      options: [
        { code: 'const I = (x) => x', correct: false, why: 'Only its own argument. The simplest combinator there is.' },
        {
          code: 'const B = (f) => (g) => (x) => f(g(x))',
          correct: false,
          why: 'Three arguments, nothing free. This is composition.',
        },
        {
          code: 'const T = (x) => x * TAX_RATE',
          correct: true,
          why: 'TAX_RATE comes from outside. A free variable is exactly what a combinator does not have.',
        },
        {
          code: 'const W = (f) => (x) => f(x)(x)',
          correct: false,
          why: 'Uses its argument twice, which is fine. Nothing comes from outside.',
        },
      ],
    },
  ],
};
