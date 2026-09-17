import type { ExerciseSet } from '@fpx/engine/types';

export const typeSignatures: ExerciseSet = {
  termId: 'type-signatures',
  rubric: [
    {
      id: 'read-the-arrows',
      statement:
        "Can read a Hindley-Milner signature, and knows each arrow is one argument arriving.",
    },
    {
      id: 'match-implementation',
      statement:
        "Can tell whether an implementation matches its signature, including the order the arguments arrive in.",
    },
    {
      id: 'signature-constrains',
      statement:
        "Knows a signature over any `a` forbids looking inside, and can say what that leaves a function able to do.",
    },
  ],
  notes: `A signature says what goes in and what comes out. Every arrow is **one argument arriving**.

\`\`\`js
// add :: Number -> Number -> Number
const add = (a) => (b) => a + b

// add :: (Number, Number) -> Number     parentheses mean both at once
const add = (a, b) => a + b
\`\`\`

So the shape of the arrows tells you how to call it, and getting the order wrong is a different
function:

\`\`\`js
// map :: (a -> b) -> [a] -> [b]
const map = (fn) => (xs) => xs.map(fn)     // matches
const map = (xs) => (fn) => xs.map(fn)     // does not: the list arrives first
const map = (fn) => (xs) => xs.forEach(fn) // does not: forEach returns undefined, not [b]
\`\`\`

The interesting part is what a lowercase variable **forbids**. \`a\` means "any type at all",
so the function cannot know anything about it, which rules out almost everything:

\`\`\`js
// identity :: a -> a
const identity = (a) => a          // the only thing it could be

// first :: a -> b -> a
const first = (a) => (b) => a      // the only a it has is the first argument

// count :: [a] -> Number
const count = (xs) => xs.length              // fine: never looks at an element
const count = (xs) => xs.filter(Boolean).length   // not fine: it inspected an a
\`\`\`

That is why signatures are worth reading before implementations. \`[a] -> Number\` has very few
possible honest implementations, and \`a -> a\` has exactly one.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['read-the-arrows', 'match-implementation'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which implementation fits the signature?',
      prompt: 'The signature is `map :: (a -> b) -> [a] -> [b]`. Pick the implementation that matches it.',
      options: [
        {
          code: 'const map = (fn, xs) => xs.map(fn)',
          correct: false,
          why: 'The arrows say one argument at a time. This takes both at once.',
        },
        {
          code: 'const map = (fn) => (xs) => xs.map(fn)',
          correct: true,
          why: 'A function in, then a list, then a list out. Each arrow is one step.',
        },
        {
          code: 'const map = (xs) => (fn) => xs.map(fn)',
          correct: false,
          why: 'The arguments arrive in the wrong order: the signature asks for the function first.',
        },
        {
          code: 'const map = (fn) => (xs) => xs.forEach(fn)',
          correct: false,
          why: 'forEach returns undefined, and the signature promises a [b].',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['signature-constrains', 'read-the-arrows'],
      kind: 'code',
      role: 'implement',
      title: 'Write the functions the signatures describe',
      prompt:
        "Each signature below determines almost everything about its function. Write the implementation each one describes. The four are `identity`, `first`, `count` and `flip`.",
      hints: [
        '`a -> a` can only hand its argument back. There is nothing else it could return.',
        '`a -> b -> a` has to return the first argument: it is the only `a` it has.',
        '`[a] -> Number` cannot look inside the elements, because it knows nothing about `a`.',
      ],
      exports: ['identity', 'first', 'count', 'flip'],
      starter: `// identity :: a -> a
const identity = (a) => {
}

// first :: a -> b -> a
const first = (a) => (b) => {
}

// count :: [a] -> Number
const count = (xs) => {
}

// flip :: (a -> b -> c) -> b -> a -> c
const flip = (f) => (b) => (a) => {
}
`,
      solution: `// identity :: a -> a
const identity = (a) => a

// first :: a -> b -> a
const first = (a) => (b) => a

// count :: [a] -> Number
const count = (xs) => xs.length

// flip :: (a -> b -> c) -> b -> a -> c
const flip = (f) => (b) => (a) => f(a)(b)
`,
      broken: [
        // first returns the wrong one, which the signature forbids.
        `const identity = (a) => a
const first = (a) => (b) => b
const count = (xs) => xs.length
const flip = (f) => (b) => (a) => f(a)(b)
`,
        // flip does not flip.
        `const identity = (a) => a
const first = (a) => (b) => a
const count = (xs) => xs.length
const flip = (f) => (b) => (a) => f(b)(a)
`,
        // count looks inside the elements, which a signature over any a cannot do.
        `const identity = (a) => a
const first = (a) => (b) => a
const count = (xs) => xs.filter((x) => x > 0).length
const flip = (f) => (b) => (a) => f(a)(b)
`,
      ],
      checks: (T, exp) => {
        const identity = exp.identity as <A>(a: A) => A;
        const first = exp.first as <A>(a: A) => (b: unknown) => A;
        const count = exp.count as (xs: unknown[]) => number;
        const flip = exp.flip as (f: any) => (b: any) => (a: any) => any;

        T.law('identity hands its argument back', 60, (G) => {
          const n = G.int();
          return identity(n) === n || `identity(${n}) gave ${T.fmt(identity(n))}. With a signature of a -> a there is nothing else it could return.`;
        });

        T.law('first keeps the first argument', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          const r = first(a)(b);
          return (
            r === a ||
            `first(${a})(${b}) gave ${T.fmt(r)}. The signature promises an a, and the only a it has is the first argument.`
          );
        });

        T.law('count measures the list, whatever is in it', 60, (G) => {
          const xs = G.ints();
          const r = count(xs);
          return (
            r === xs.length ||
            `count(${T.fmt(xs)}) gave ${T.fmt(r)}, expected ${xs.length}. The signature says nothing about a, so nothing may depend on the elements.`
          );
        });

        T.check('count does not look inside the elements', () => {
          const shapes = [count([1, 2, 3]), count(['a', 'b', 'c']), count([null, undefined, {}])];
          return (
            T.eq(shapes, [3, 3, 3]) ||
            `Three lists of three gave ${T.fmt(shapes)}. A function over any a cannot inspect the elements, so all three must agree.`
          );
        });

        T.law('flip swaps the order the arguments arrive in', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          const sub = (x: number) => (y: number) => x - y;
          const r = flip(sub)(a)(b);
          return r === b - a || `flip(sub)(${a})(${b}) gave ${T.fmt(r)}, expected ${b - a}.`;
        });

        T.check('Flipping twice gets you back', () => {
          const sub = (x: number) => (y: number) => x - y;
          const r = flip(flip(sub))(10)(3);
          return r === 7 || `Got ${T.fmt(r)}, expected 7.`;
        });
      },
    },

    {
      id: 'constrains',
      kind: 'code',
      role: 'implement',
      covers: ['match-implementation', 'signature-constrains'],
      title: "Write the only function each signature allows",
      prompt:
        "A signature made of type variables leaves almost nothing to decide. Write the three functions so each one works for every type at once, which is what a variable in a signature means.",
      hints: [
        "`same :: a -> a` has exactly one implementation. There is no value of type `a` to invent, so the only `a` available is the one you were handed.",
        "`count :: [a] -> Number` cannot look at the elements, because `a` could be anything. It can only count them.",
        "`both :: (a -> b, [a]) -> [b]` has to produce `b`s, and the only way to make one is to call the function it was given.",
      ],
      exports: ['same', 'count', 'both'],
      starter: `// same :: a -> a
const same = (x) => null

// count :: [a] -> Number
const count = (xs) => 0

// both :: ((a -> b), [a]) -> [b]
const both = (f, xs) => []
`,
      solution: `// same :: a -> a
const same = (x) => x

// count :: [a] -> Number
const count = (xs) => xs.length

// both :: ((a -> b), [a]) -> [b]
const both = (f, xs) => xs.map(f)
`,
      broken: [
        `const same = (x) => x
const count = (xs) => xs.filter(Boolean).length
const both = (f, xs) => xs.map(f)
`,
        `const same = (x) => x
const count = (xs) => xs.length
const both = (f, xs) => xs.map(f).filter(Boolean)
`,
        `const same = (x) => String(x)
const count = (xs) => xs.length
const both = (f, xs) => xs.map(f)
`,
        `const same = (x) => x
const count = (xs) => xs.length
const both = (f, xs) => xs.map((x) => x)
`,
      ],
      checks: (T, exp) => {
        const { same, count, both } = exp;

        T.check('same gives back exactly what it was handed', () => {
          const o = { a: 1 };
          const f = (n: number) => n;
          return (
            same(3) === 3 && same('x') === 'x' && same(o) === o && same(f) === f ||
            `same changed something on the way through. With \`a -> a\` there is no other \`a\` in scope, so there is nothing else it could return.`
          );
        });

        T.check('same does not convert anything', () => {
          const r = same(3);
          return (
            typeof r === 'number' ||
            `same(3) came back as a ${typeof r}. The signature says the type going out is the same variable as the one going in.`
          );
        });

        T.check('same works on null and undefined too', () => {
          return (same(null) === null && same(undefined) === undefined) || 'same treats some values specially, and it has no way to know what it is holding.';
        });

        T.check('count counts', () => {
          const got = [count([]), count([1, 2, 3]), count(['a'])];
          return T.eq(got, [0, 3, 1]) || `count gave ${T.fmt(got)} for an empty list, a three, and a one.`;
        });

        T.check('count cannot be looking at the elements', () => {
          const r = count([0, '', false, null]);
          return (
            r === 4 ||
            `A list of four falsy values counted as ${T.fmt(r)}. With \`[a] -> Number\` the elements could be anything, so testing them is not something the signature permits.`
          );
        });

        T.check('both applies the function to every element', () => {
          const r = both((n: number) => n * 2, [1, 2, 3]);
          return T.eq(r, [2, 4, 6]) || `both gave ${T.fmt(r)}.`;
        });

        T.check('both keeps every element, including the falsy results', () => {
          const r = both((n: number) => n - 1, [1, 2]);
          return (
            T.eq(r, [0, 1]) ||
            `both gave ${T.fmt(r)}, expected [0, 1]. The signature says \`[a] -> [b]\`, and dropping one would mean the lengths could differ.`
          );
        });

        T.check('both actually uses the function it was given', () => {
          const r = both((s: string) => s.length, ['ab', 'c']);
          return T.eq(r, [2, 1]) || `both gave ${T.fmt(r)}. There is no other way to produce a \`b\` than to call the \`a -> b\` you were handed.`;
        });

        T.law('both preserves length', 60, (G) => {
          const xs = G.ints();
          const f = G.fn();
          const r = both(f.f, xs);
          return r.length === xs.length || `A list of ${xs.length} came back with ${r.length}.`;
        });
      },
    },
  ],
};
