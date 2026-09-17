import type { ExerciseSet } from '@fpx/engine/types';

export const functionalCombinator: ExerciseSet = {
  termId: 'functional-combinator',
  rubric: [
    {
      id: 'no-free-variables',
      statement:
        "Knows a combinator uses nothing but its own arguments, and can tell one from a function that closes over something.",
    },
    {
      id: 'the-classics',
      statement:
        "Can write I, K, C and S, and say what each does in one sentence.",
    },
    {
      id: 'identities',
      statement:
        "Can verify a combinator identity such as S(K)(K) behaving like I, and knows a failure points at one of the definitions.",
    },
  ],
  notes: `A combinator is a function built from nothing but its own arguments. No globals, no closure over
something outside, no free variables at all.

\`\`\`js
const I = (x) => x                          // a combinator
const withTax = (x) => x * TAX_RATE         // not one: TAX_RATE comes from outside
\`\`\`

The classic four:

\`\`\`js
const I = (x) => x                          // identity: hand it back
const K = (x) => (y) => x                   // constant: keep the first, ignore the second
const C = (f) => (b) => (a) => f(a)(b)      // flip: swap the order they arrive in
const S = (f) => (g) => (x) => f(x)(g(x))   // substitution: both branches see the same x
\`\`\`

K is worth dwelling on, because it genuinely never looks at its second argument:

\`\`\`js
K('kept')(() => { throw new Error('never runs') })   // 'kept'
\`\`\`

And S is where the shape becomes interesting, because \`x\` is used twice:

\`\`\`js
const add = (x) => (y) => x + y
const double = S(add)(I)
double(5)    // 10, because both branches got the same 5
\`\`\`

The identities fall straight out of the definitions, which makes them a good check on your own
work. If this one fails, either K or S is wrong:

\`\`\`js
S(K)(K)(42)   // 42, the same as I(42)
C(C(f))       // the same function as f
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['the-classics', 'identities'],
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
      covers: ['no-free-variables'],
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

    {
      id: 'identities',
      kind: 'code',
      role: 'implement',
      covers: ['no-free-variables', 'the-classics', 'identities'],
      title: "Write S, K, I and check that S(K)(K) is I",
      prompt:
        "A combinator uses nothing but its own arguments. Write the three classics, then `skk`, built only out of them, and confirm it behaves like `I`.",
      hints: [
        "`I` gives back what it was handed. `K` takes two and keeps the first.",
        "`S` takes three, one at a time. It hands the third to each of the first two, and then applies what one gave back to what the other gave back.",
        "`skk` is `S(K)(K)`. Build it from the pieces rather than writing it out, or the identity proves nothing.",
      ],
      exports: ['I', 'K', 'S', 'skk'],
      starter: `// I :: a -> a
const I = (x) => x

// K :: a -> b -> a
const K = (x) => (y) => y

// S :: (a -> b -> c) -> (a -> b) -> a -> c
const S = (f) => (g) => (x) => x

// skk :: a -> a   built from S and K, not written out
const skk = I
`,
      solution: `// I :: a -> a
const I = (x) => x

// K :: a -> b -> a
const K = (x) => (y) => x

// S :: (a -> b -> c) -> (a -> b) -> a -> c
const S = (f) => (g) => (x) => f(x)(g(x))

// skk :: a -> a   built from S and K, not written out
const skk = S(K)(K)
`,
      broken: [
        `const I = (x) => x
const K = (x) => (y) => y
const S = (f) => (g) => (x) => f(x)(g(x))
const skk = S(K)(K)
`,
        `const I = (x) => x
const K = (x) => (y) => x
const S = (f) => (g) => (x) => f(g(x))
const skk = (x) => x
`,
        `const I = (x) => x
const K = (x) => (y) => x
const S = (f) => (g) => (x) => f(x)(g(x))
const skk = (x) => x
`,
        `const answer = 1
const I = (x) => x
const K = (x) => (y) => x
const S = (f) => (g) => (x) => f(x)(g(x))
const skk = (x) => answer
`,
      ],
      checks: (T, exp) => {
        const { I, K, S, skk } = exp;

        T.law('I hands back what it was given', 60, (G) => {
          const n = G.int();
          return I(n) === n || `I(${n}) gave ${T.fmt(I(n))}.`;
        });

        T.law('K keeps the first and discards the second', 60, (G) => {
          const a = G.int();
          const b = G.str();
          const r = K(a)(b);
          return r === a || `K(${a})(${T.fmt(b)}) gave ${T.fmt(r)}. It keeps the one on the left.`;
        });

        T.check('K does not evaluate what it discards', () => {
          const kept = K(1);
          return typeof kept === 'function' || `K(1) gave ${T.fmt(kept)}. It should still be waiting for the second argument.`;
        });

        T.check('S hands the argument to both, then applies one to the other', () => {
          const r = S((a: number) => (b: number) => a + b)((a: number) => a * 10)(3);
          return r === 33 || `S(add)(times ten)(3) gave ${T.fmt(r)}, expected 33: 3 plus 30.`;
        });

        T.law('S is not just composition', 40, (G) => {
          const n = G.int();
          const r = S((a: number) => (b: number) => a - b)((a: number) => 1)(n);
          return r === n - 1 || `S with subtract and a constant at ${n} gave ${T.fmt(r)}, expected ${n - 1}.`;
        });

        T.law('S(K)(K) behaves like I', 80, (G) => {
          const v = G.bool() ? G.int() : G.str();
          const r = skk(v);
          return (
            r === v ||
            `skk(${T.fmt(v)}) gave ${T.fmt(r)}. If this fails, one of S, K or I is wrong, because the identity holds whenever they are right.`
          );
        });

        T.check('skk was built from the combinators, not written out', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const line = src.split('\n').find((l) => /const\s+skk\s*=/.test(l)) ?? '';
          return (
            /S\s*\(\s*K\s*\)\s*\(\s*K\s*\)/.test(line) ||
            'skk should be S(K)(K). Writing the identity function out by hand makes the check pass and demonstrates nothing.'
          );
        });

        T.check('None of them reaches outside its own arguments', () => {
          for (const name of ['I', 'K', 'S']) {
            const r = T.shape.usesOnly(name, []);
            if (r !== true) return `${name}: ${r} A combinator is closed over nothing.`;
          }
          return true;
        });
      },
    },
  ],
};
