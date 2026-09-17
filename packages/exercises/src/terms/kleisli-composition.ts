import type { ExerciseSet } from '@fpx/engine/types';

export const kleisliComposition: ExerciseSet = {
  termId: 'kleisli-composition',
  rubric: [
    {
      id: 'why-compose-fails',
      statement:
        "Can say why ordinary composition cannot join two functions that each return a container.",
    },
    {
      id: 'compose-with-chain',
      statement:
        "Can write composeK, and knows it reads right to left the way compose does.",
    },
    {
      id: 'short-circuits',
      statement:
        "Knows a failure in the first step skips the second entirely, and that the composition is associative.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can write ordinary compose and Kleisli compose side by side and point at the exact place the types stop lining up.",
    },
  ],
  notes: `Ordinary composition needs the output of one function to be the input of the next. Two functions
that each return a container do not line up:

\`\`\`js
const half = (n) => (n % 2 === 0 ? Just(n / 2) : Nothing())   // Number -> Maybe Number

compose(half, half)(8)   // half receives Just(4), and it expects a Number
\`\`\`

\`chain\` is what bridges the gap, and \`composeK\` packages that up:

\`\`\`js
const composeK = (g, f) => (a) => f(a).chain(g)

const positive = (n) => (n > 0 ? Just(n) : Nothing())
const halfThenPositive = composeK(positive, half)

halfThenPositive(8)    // Just(4)
\`\`\`

It reads right to left, the same as \`compose\`, so the rightmost function runs first. Using
\`map\` instead leaves you doubly wrapped:

\`\`\`js
const composeK = (g, f) => (a) => f(a).map(g)   // Just(Just(4))
\`\`\`

A failure anywhere ends it, and the later steps never run:

\`\`\`js
halfThenPositive(7)     // Nothing. half failed, positive was never called.
halfThenPositive(-4)    // Nothing. half gave Just(-2), positive rejected it.
\`\`\`

And it is associative, which is what makes it a [category](#category) rather than just a handy
function: you can group a long chain into named stages freely.

\`\`\`js
composeK(composeK(h, g), f)   // the same function as
composeK(h, composeK(g, f))
\`\`\``,
  typedNotes: `Same track, second lap. The reason ordinary composition fails here is not a runtime surprise,
it is a type error you can read off the page.

\`\`\`ts
const compose = <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C => g(f(a))
\`\`\`

That works because \`f\` produces a \`B\` and \`g\` consumes a \`B\`. Same letter, so they meet. Now
make both of them able to fail:

\`\`\`ts
type Kleisli<A, B> = (a: A) => Maybe<B>

const safeDiv = (n: number): Maybe<number> => ...   // Kleisli<number, number>
const safeSqrt = (n: number): Maybe<number> => ...  // Kleisli<number, number>

compose(safeSqrt, safeDiv)   // error
\`\`\`

Read where it breaks. \`safeDiv\` returns \`Maybe<number>\`, so \`compose\` infers \`B = Maybe<number>\`.
\`safeSqrt\` takes a plain \`number\`. \`Maybe<number>\` is not \`number\`, and there is no assignment
of variables that makes those the same. The mismatch is one layer of wrapper, in one place.

Kleisli composition is the version whose types do line up:

\`\`\`ts
const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => f(a).chain(g)
\`\`\`

Check the ends. It takes an \`A\` and returns \`Maybe<C>\`. Not \`Maybe<Maybe<C>>\`: \`f(a)\` gives a
\`Maybe<B>\`, and \`chain\` is the operation that takes \`(b: B) => Maybe<C>\` and returns
\`Maybe<C>\`, which is exactly \`g\`'s type. \`chain\` is the only thing that fits in that hole, and
the signature is what tells you so.

\`\`\`ts
const pipeline = composeK(safeSqrt, safeDiv)   // Kleisli<number, number>
pipeline(16)   // a Maybe holding 2
pipeline(0)    // empty, and safeSqrt never ran
\`\`\`

The result is a \`Kleisli<A, C>\`, the same shape as the two things that went in, which is why
you can keep going:

\`\`\`ts
composeK(safeLog, composeK(safeSqrt, safeDiv))
\`\`\`

Short-circuiting is not extra machinery either. It is whatever \`chain\` does on an empty value,
and that is already settled by [monad](#monad).`,
  rungs: [
    {
      id: 'implement',
      covers: ['compose-with-chain', 'short-circuits'],
      kind: 'code',
      role: 'implement',
      title: 'Compose functions that return containers',
      prompt:
        'Ordinary composition cannot join `a -> M b` with `b -> M c`, because the second takes a `b` and gets an `M b`. `composeK` bridges that with chain.',
      hints: [
        'Run the first function, then chain the second onto its result.',
        'Like compose, it reads right to left: the rightmost function runs first.',
      ],
      exports: ['composeK'],
      starter: `// composeK :: ((b -> M c), (a -> M b)) -> (a -> M c)
const composeK = (g, f) => {
}
`,
      solution: `// composeK :: ((b -> M c), (a -> M b)) -> (a -> M c)
const composeK = (g, f) => (a) => f(a).chain(g)
`,
      broken: [
        // Left to right, which is the opposite of what compose means.
        `const composeK = (g, f) => (a) => g(a).chain(f)
`,
        // Uses map, so the result ends up doubly wrapped.
        `const composeK = (g, f) => (a) => f(a).map(g)
`,
      ],
      checks: (T, exp) => {
        const composeK = exp.composeK as (g: (b: any) => any, f: (a: any) => any) => (a: any) => any;

        const Just = (value: any): any => ({
          isNothing: false,
          value,
          map: (fn: any) => Just(fn(value)),
          chain: (fn: any) => fn(value),
          inspect: () => `Just(${JSON.stringify(value)})`,
        });
        const Nothing = (): any => ({
          isNothing: true,
          map: () => Nothing(),
          chain: () => Nothing(),
          inspect: () => 'Nothing',
        });

        const half = (n: number) => (n % 2 === 0 ? Just(n / 2) : Nothing());
        const positive = (n: number) => (n > 0 ? Just(n) : Nothing());

        T.check('Two successful steps compose', () => {
          const f = composeK(positive, half);
          const r = f(8);
          return (r?.isNothing === false && r.value === 4) || `Got ${T.fmt(r)}, expected Just(4).`;
        });

        T.check('The rightmost function runs first', () => {
          const order: string[] = [];
          const a = (n: number) => {
            order.push('a');
            return Just(n);
          };
          const b = (n: number) => {
            order.push('b');
            return Just(n);
          };
          composeK(a, b)(1);
          return (
            T.eq(order, ['b', 'a']) ||
            `They ran in the order ${T.fmt(order)}. composeK(g, f) means f first, the same way compose does.`
          );
        });

        T.check('The result is not doubly wrapped', () => {
          const f = composeK(positive, half);
          const r = f(8);
          return (
            typeof r?.value !== 'object' || r.value === null ||
            `Got ${T.fmt(r)}. Using map instead of chain leaves a container inside a container.`
          );
        });

        T.check('A failure in the first step short-circuits', () => {
          const spy = T.spyFn((n: number) => Just(n));
          const f = composeK(spy, half);
          const r = f(7);
          if (spy.calls.length > 0) return 'The second step ran even though the first gave Nothing.';
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A failure in the second step comes through', () => {
          const f = composeK(positive, half);
          const r = f(-4);
          return r?.isNothing === true || `Got ${T.fmt(r)}, expected Nothing: -4 halves to -2, which is not positive.`;
        });

        T.check('Three compose as easily as two', () => {
          const f = composeK(composeK(positive, half), half);
          const r = f(16);
          return (r?.isNothing === false && r.value === 4) || `Got ${T.fmt(r)}, expected Just(4).`;
        });

        T.law('Associativity: grouping the composition makes no difference', 50, (G) => {
          const n = G.int();
          const mk = (k: number) => (x: number) => (x + k > 0 ? Just(x + k) : Nothing());
          const [f, g, h] = [mk(1), mk(2), mk(3)];
          const left = composeK(composeK(h, g), f)(n);
          const right = composeK(h, composeK(g, f))(n);
          const same = left.isNothing === right.isNothing && (left.isNothing || left.value === right.value);
          return same || `On ${n}: grouping left gave ${T.fmt(left)}, grouping right gave ${T.fmt(right)}.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['why-compose-fails'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Why not ordinary composition?',
      prompt: 'Given `half :: Number -> Maybe Number`, why does `compose(half, half)` not work?',
      options: [
        {
          code: '// The second half receives a Maybe Number, but it expects a Number',
          correct: true,
          why: 'The shapes do not meet. composeK uses chain to unwrap between the steps.',
        },
        {
          code: '// half is not curried',
          correct: false,
          why: 'Currying is unrelated. The problem is the shape of what comes out.',
        },
        {
          code: '// Maybe has no map',
          correct: false,
          why: 'It does, and map is what makes the doubly wrapped version. chain is what avoids it.',
        },
        {
          code: '// compose only takes two functions',
          correct: false,
          why: 'Variadic compose is easy to write. The mismatch would still be there.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['why-compose-fails', 'compose-with-chain', 'typed-signature'],
      title: "Write composeK",
      prompt:
        "The types are given. Write `composeK` so two functions that each return a `Maybe` join into one that returns a single `Maybe`.",
      hints: [
        "Run `f` first. What you get back is a `Maybe<B>`, not a `B`.",
        "`g` is typed `(b: B) => Maybe<C>`. Look at `chain`'s signature and see which operation takes a function of that shape.",
        "If your result is a Maybe inside a Maybe, you reached for `map` where `chain` was the only thing that fits.",
      ],
      exports: ['composeK'],
      starter: `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => f(a) as never
`,
      solution: `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => f(a).chain(g)
`,
      broken: [
        `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => f(a).map(g) as never
`,
        `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => (g as unknown as Kleisli<A, C>)(a)
`,
        `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => (g as unknown as Kleisli<A, B>)(a).chain(f as never) as never
`,
      ],
      checks: (T, exp) => {
        T.check('The annotations are still doing work', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          if (/(:\s*any\b)|(\bas\s+any\b)/.test(src)) {
            return 'The answer leans on `any`, which satisfies nothing. The point is to satisfy the signature.';
          }
          return true;
        });
        T.check('The Kleisli declaration is still there to satisfy', () => {
          return /type\s+Kleisli/.test(T.src) || 'The Kleisli declaration has gone. It is the thing being satisfied.';
        });
        const composeK = exp.composeK;

        // Rebuilt here so the checks do not depend on the learner's copies.
        const just = (value: unknown): any => ({
          map: (f: (a: unknown) => unknown) => just(f(value)),
          chain: (f: (a: unknown) => unknown) => f(value),
          getOrElse: () => value,
        });
        const nothing = (): any => ({
          map: () => nothing(),
          chain: () => nothing(),
          getOrElse: (fallback: unknown) => fallback,
        });

        const safeDiv = (n: number) => (n === 0 ? nothing() : just(16 / n));
        const safeSqrt = (n: number) => (n < 0 ? nothing() : just(Math.sqrt(n)));
        const out = (m: any) => (m && typeof m.getOrElse === 'function' ? m.getOrElse('empty') : m);

        T.check('composeK gives back a function', () => {
          const p = composeK(safeSqrt, safeDiv);
          return typeof p === 'function' || `composeK gave ${T.fmt(p)}. Its return type is Kleisli<A, C>, which is a function.`;
        });

        T.check('Both steps run, in the right order', () => {
          const r = out(composeK(safeSqrt, safeDiv)(4));
          return r === 2 || `16 / 4 is 4, and the square root of that is 2. The pipeline gave ${T.fmt(r)}.`;
        });

        T.check('The result is one Maybe deep, not two', () => {
          const r = composeK(safeSqrt, safeDiv)(4);
          const inner = r.getOrElse('empty');
          return (
            typeof inner !== 'object' || inner === null
              ? true
              : `The result held ${T.fmt(inner)}, which is itself a Maybe. That is what \`map\` would have given you; \`chain\` is the operation whose types fit.`
          );
        });

        T.check('A failure in the first step short-circuits', () => {
          let ran = false;
          const watched = (n: number) => { ran = true; return safeSqrt(n); };
          const r = out(composeK(watched, safeDiv)(0));
          if (ran) return 'The second function ran even though the first came back empty.';
          return r === 'empty' || `Dividing by zero then taking a root gave ${T.fmt(r)}.`;
        });

        T.check('A failure in the second step comes through as a failure', () => {
          const r = out(composeK(() => nothing(), safeDiv)(4));
          return r === 'empty' || `A second step that fails gave ${T.fmt(r)}.`;
        });

        T.check('The result composes again', () => {
          const p = composeK(safeSqrt, composeK(safeSqrt, safeDiv));
          const r = out(p(1));
          return r === 2 || `Composing three deep on 1 gave ${T.fmt(r)}, expected 2.`;
        });

        T.law('The arguments are not swapped', 60, (G) => {
          const n = G.nat() + 1;
          const f = (x: number) => just(x + 1);
          const g = (x: number) => just(x * 10);
          const r = out(composeK(g, f)(n));
          return (
            r === (n + 1) * 10 ||
            `With f adding one and g multiplying by ten at ${n}: got ${T.fmt(r)}, expected ${(n + 1) * 10}. \`f\` runs first.`
          );
        });

        T.law('Associativity: where you bracket does not matter', 60, (G) => {
          const n = G.nat() + 1;
          const f = (x: number) => just(x + 1);
          const g = (x: number) => just(x * 2);
          const h = (x: number) => just(x - 3);
          const a = out(composeK(h, composeK(g, f))(n));
          const b = out(composeK(composeK(h, g), f)(n));
          return a === b || `At ${n}: bracketing one way gave ${T.fmt(a)} and the other gave ${T.fmt(b)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'short-circuits'],
      title: "Where ordinary compose would not typecheck",
      prompt:
        "`f` returns `Maybe<B>` and `g` wants a `B`, which is the mismatch plain composition cannot bridge. Type an array of the pipeline at 4 and at 0, each with -1 as the fallback.",
      hints: [
        "16 divided by 4 is 4, and the square root of 4 is 2.",
        "Dividing by zero comes back empty, and `chain` on an empty value never runs `g`.",
        "`composeK` returns a `Kleisli<A, C>`, so the result is still one Maybe deep.",
      ],
      context: `interface Maybe<A> {
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({ chain: (f) => f(value), getOrElse: () => value })
const nothing = <A>(): Maybe<A> => ({ chain: () => nothing(), getOrElse: (f) => f })

type Kleisli<A, B> = (a: A) => Maybe<B>

const composeK = <A, B, C>(g: Kleisli<B, C>, f: Kleisli<A, B>): Kleisli<A, C> =>
  (a) => f(a).chain(g)

const safeDiv: Kleisli<number, number> = (n) => (n === 0 ? nothing<number>() : just(16 / n))
const safeSqrt: Kleisli<number, number> = (n) => (n < 0 ? nothing<number>() : just(Math.sqrt(n)))
`,
      placeholder: "[..., ...]",
      expect: [2,-1],
      solution: "[composeK(safeSqrt, safeDiv)(4).getOrElse(-1), composeK(safeSqrt, safeDiv)(0).getOrElse(-1)]",
      broken: ["[4, -1]", "[2, 0]", "[2, 4]"],
    },
  ],
};
