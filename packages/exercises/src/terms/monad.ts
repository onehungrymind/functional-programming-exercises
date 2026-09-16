import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const monad: ExerciseSet = {
  termId: 'monad',
  rubric: [
    {
      id: 'chain-does-not-rewrap',
      statement:
        "Knows chain is for a function that already returns a container, so the result is not wrapped twice.",
    },
    {
      id: 'short-circuits',
      statement:
        "Can build a chain where a failure partway through skips the rest.",
    },
    {
      id: 'flatten-one-level',
      statement:
        "Knows chain removes exactly one layer, and can show it on a container of containers.",
    },
    {
      id: 'three-laws',
      statement:
        "Can state the two identity laws and associativity, and check an instance against them.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `map` and `chain` side by side and say which one would have given a doubly wrapped value, from the signatures alone.",
    },
  ],
  notes: `A monad is a pointed functor with \`chain\`. The difference from \`map\` is one thing: the
function you give it **already returns a container**, so chain must not wrap again.

\`\`\`js
const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),      // f returns a plain value
  chain: (f) => f(value)            // f returns a Maybe. Hand it straight back.
})

Just(2).map((n) => Just(n * 10))    // Just(Just(20))   nested
Just(2).chain((n) => Just(n * 10))  // Just(20)
\`\`\`

It flattens **exactly one** level, which matters when the values are themselves containers:

\`\`\`js
const chain = (f, xs) => xs.reduce((acc, x) => acc.concat(f(x)), [])

chain((n) => [n, n * 10], [1, 2])   // [1, 10, 2, 20]
chain((n) => [[n]], [1, 2])         // [[1], [2]]   one layer off, not all of them
[[1], [2]].flat(Infinity)           // [1, 2]       which is a different operation
\`\`\`

The reason to want it is short-circuiting. A step that fails ends the chain, and nothing after
it runs:

\`\`\`js
Just(1)
  .chain(() => Nothing())
  .chain((n) => Just(n * 100))   // never called
// Nothing
\`\`\`

Three laws. The identities say \`of\` is neutral on both sides, and associativity says nesting
the chains does not matter:

\`\`\`js
M.of(a).chain(f)                        // equals f(a)
m.chain(M.of)                           // equals m
m.chain(f).chain(g)                     // equals m.chain((x) => f(x).chain(g))
\`\`\`

That last one is what lets you extract a middle section of a pipeline into its own named
function without changing the result.`,
  typedNotes: `Same track, second lap. Everything this concept is about fits in the gap between two lines.

\`\`\`ts
interface Maybe<A> {
  map:   <B>(f: (a: A) => B)        => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
}
\`\`\`

Read only the \`f\`s. \`map\` takes a function that returns a bare \`B\`. \`chain\` takes one that
returns a \`Maybe<B>\`, already wrapped. Now read only the return types: **both are \`Maybe<B>\`**.

That is the flattening, and you can see it without running anything. If \`chain\` behaved like
\`map\`, its return type would have to be \`Maybe<Maybe<B>>\`, because \`f\` already produced a
\`Maybe\` and wrapping it again adds a layer. Chain returns one layer, so chain must be
unwrapping exactly one. There is nowhere else for the layer to go.

\`\`\`ts
const just = <A>(value: A): Maybe<A> => ({
  map:   (f) => just(f(value)),
  chain: (f) => f(value),        // no wrapping, f already did it
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map:   () => nothing(),
  chain: () => nothing(),        // f never runs
  getOrElse: (fallback) => fallback
})
\`\`\`

\`chain\`'s body is \`f(value)\`. Not \`just(f(value))\`. The absence of a constructor call there is
the entire concept.

Where it pays off is functions that can fail. Each step returns a \`Maybe\`, so with \`map\` you
would be stacking layers and with \`chain\` you are not:

\`\`\`ts
const head = <A>(xs: A[]): Maybe<A> => xs.length ? just(xs[0]) : nothing()

head([[1, 2], [3]]).map(head)     // Maybe<Maybe<number>>  two layers
head([[1, 2], [3]]).chain(head)   // Maybe<number>         one
\`\`\`

The short-circuit falls out of the same place. \`nothing\`'s \`chain\` ignores \`f\` entirely, and
the type permits that: it owes you a \`Maybe<B>\`, and \`nothing<B>()\` is one.`,
  rungs: [
    {
      id: 'implement',
      covers: ['chain-does-not-rewrap', 'short-circuits', 'three-laws'],
      kind: 'code',
      role: 'implement',
      title: 'chain for Maybe',
      prompt:
        'A Monad is a pointed functor with `chain`: a map whose function already returns a container, so the result is not wrapped twice.',
      hints: [
        '`map` wraps the result. `chain` does not, because the function already did.',
        'On Nothing, chain skips the function entirely, exactly as map does.',
      ],
      exports: ['Just', 'Nothing'],
      starter: `const Just = (value) => ({
  isNothing: false,
  value,
  map: (f) => Just(f(value)),
  chain: (f) => {
  },
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})

const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  chain: (f) => {
  },
  inspect: () => 'Nothing'
})

Just.of = Just
`,
      solution: `const Just = (value) => ({
  isNothing: false,
  value,
  map: (f) => Just(f(value)),
  chain: (f) => f(value),
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})

const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  chain: () => Nothing(),
  inspect: () => 'Nothing'
})

Just.of = Just
`,
      broken: [
        // chain wraps again, which is just map under another name.
        `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  chain: (f) => Just(f(value)),
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})
const Nothing = () => ({ isNothing: true, map: () => Nothing(), chain: () => Nothing(), inspect: () => 'Nothing' })
Just.of = Just
`,
        // chain on Nothing runs the function anyway.
        `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  chain: (f) => f(value),
  inspect: () => \`Just(\${JSON.stringify(value)})\`
})
const Nothing = () => ({ isNothing: true, map: () => Nothing(), chain: (f) => f(undefined), inspect: () => 'Nothing' })
Just.of = Just
`,
      ],
      checks: (T, exp) => {
        const Just = exp.Just as any;
        const Nothing = exp.Nothing as any;

        T.check('chain does not add a second layer', () => {
          const r = Just(2).chain((n: number) => Just(n * 10));
          return (
            r?.isNothing === false && r.value === 20 ||
            `Got ${T.fmt(r)}, expected Just(20). If the value is itself a Just, chain wrapped what was already wrapped.`
          );
        });

        T.check('chain can turn a Just into a Nothing', () => {
          const r = Just(2).chain(() => Nothing());
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('chain on Nothing skips the function', () => {
          const spy = T.spyFn(() => Just(1));
          const r = Nothing().chain(spy);
          if (spy.calls.length > 0) return 'The function ran on Nothing. There is no value to give it.';
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A chain of lookups stops at the first miss', () => {
          const spy = T.spyFn((n: number) => Just(n));
          Just(1).chain(() => Nothing()).chain(spy);
          return spy.calls.length === 0 || 'The step after a Nothing still ran.';
        });

        const equals = (a: any, b: any) =>
          a.isNothing === b.isNothing && (a.isNothing || a.value === b.value);

        laws.monad(T, { of: Just, lift: Just, equals, runs: 60 });
      },
    },

    {
      id: 'apply',
      covers: ['flatten-one-level', 'chain-does-not-rewrap'],
      kind: 'code',
      role: 'apply',
      title: 'chain for Array',
      prompt:
        'Array is a monad too: `chain` maps and then flattens one level. Write it, and use it to pair every element with every other.',
      hints: ['`flatMap` is exactly chain for arrays, but write it yourself with map and concat.'],
      exports: ['chain', 'pairs'],
      starter: `// chain :: ((a -> [b]), [a]) -> [b]
const chain = (f, xs) => {
}

// pairs :: ([a], [b]) -> [[a, b]]
const pairs = (as, bs) => {
  // every a with every b
}
`,
      solution: `// chain :: ((a -> [b]), [a]) -> [b]
const chain = (f, xs) => xs.reduce((acc, x) => acc.concat(f(x)), [])

// pairs :: ([a], [b]) -> [[a, b]]
const pairs = (as, bs) => chain((a) => bs.map((b) => [a, b]), as)
`,
      broken: [
        // Maps without flattening, so the result is nested.
        `const chain = (f, xs) => xs.map(f)
const pairs = (as, bs) => chain((a) => bs.map((b) => [a, b]), as)
`,
        // Flattens all the way down, which loses the pairs.
        `const chain = (f, xs) => xs.map(f).flat(Infinity)
const pairs = (as, bs) => chain((a) => bs.map((b) => [a, b]), as)
`,
        // Pairs each element with the one at the same index instead of with all.
        `const chain = (f, xs) => xs.reduce((acc, x) => acc.concat(f(x)), [])
const pairs = (as, bs) => as.map((a, i) => [a, bs[i]])
`,
      ],
      checks: (T, exp) => {
        const chain = exp.chain as (f: (x: any) => any[], xs: any[]) => any[];
        const pairs = exp.pairs as (as: any[], bs: any[]) => any[][];

        T.check('chain flattens exactly one level', () => {
          const r = chain((n: number) => [n, n * 10], [1, 2]);
          return T.eq(r, [1, 10, 2, 20]) || `Got ${T.fmt(r)}, expected [1, 10, 2, 20].`;
        });

        T.check('chain does not flatten further than one level', () => {
          const r = chain((n: number) => [[n]], [1, 2]);
          return (
            T.eq(r, [[1], [2]]) ||
            `Got ${T.fmt(r)}, expected [[1], [2]]. chain removes one layer, not all of them.`
          );
        });

        T.check('A function returning nothing drops the element', () => {
          const r = chain((n: number) => (n > 1 ? [n] : []), [1, 2, 3]);
          return T.eq(r, [2, 3]) || `Got ${T.fmt(r)}`;
        });

        T.check('pairs makes every combination', () => {
          const r = pairs([1, 2], ['a', 'b']);
          return (
            T.eq(r, [
              [1, 'a'],
              [1, 'b'],
              [2, 'a'],
              [2, 'b'],
            ]) || `Got ${T.fmt(r)}`
          );
        });

        T.check('pairs handles lists of different lengths', () => {
          const r = pairs([1], ['a', 'b', 'c']);
          return (
            r.length === 3 ||
            `Got ${T.fmt(r)}, which is ${r.length} long. Every a goes with every b, so the count is the product of the lengths.`
          );
        });

        T.check('An empty list on either side gives nothing', () => {
          return (T.eq(pairs([], [1]), []) && T.eq(pairs([1], []), [])) || 'An empty side should give an empty result.';
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['chain-does-not-rewrap', 'flatten-one-level', 'typed-signature'],
      title: "Satisfy Maybe<A>",
      prompt:
        "The interface is given. Write `just` and `nothing` so that `chain` returns one layer where `map` would have returned two.",
      hints: [
        "`map`'s `f` gives back a bare value, so you have to wrap it. `chain`'s `f` gives back a Maybe already.",
        "If your `chain` body has a call to `just` in it, look at the return type again.",
        "`nothing` owes a `Maybe<B>` from both, and never runs `f` for either.",
      ],
      exports: ['just', 'nothing'],
      starter: `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => just(f(value)) as never,
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})
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
`,
      broken: [
        `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => just(f(value)),
  chain: (f) => just(f(value)) as never,
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})
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
  chain: (f) => (f as (a: never) => Maybe<never>)(undefined as never),
  getOrElse: (fallback) => fallback
})
`,
        `interface Maybe<A> {
  map: <B>(f: (a: A) => B) => Maybe<B>
  chain: <B>(f: (a: A) => Maybe<B>) => Maybe<B>
  getOrElse: (fallback: A) => A
}

const just = <A>(value: A): Maybe<A> => ({
  map: (f) => f(value) as never,
  chain: (f) => f(value),
  getOrElse: () => value
})

const nothing = <A>(): Maybe<A> => ({
  map: () => nothing(),
  chain: () => nothing(),
  getOrElse: (fallback) => fallback
})
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
        T.check('The Maybe interface is still there to satisfy', () => {
          return /interface\s+Maybe/.test(T.src) || 'The Maybe interface has gone. It is the thing being satisfied.';
        });
        const { just, nothing } = exp;
        const head = (xs: unknown[]) => (xs.length ? just(xs[0]) : nothing());

        T.check('map wraps what the function gives back', () => {
          const r = just(21).map((n: number) => n * 2);
          return (r && typeof r.getOrElse === 'function' && r.getOrElse(0) === 42) || `Mapping gave ${T.fmt(r)}, which should be a Maybe holding 42.`;
        });

        T.check('chain does not add a layer', () => {
          const r = just(21).chain((n: number) => just(n * 2));
          const inner = r && r.getOrElse ? r.getOrElse(0) : r;
          return (
            inner === 42 ||
            `chain gave a Maybe holding ${T.fmt(inner)}. \`f\` already returned a Maybe, so wrapping it again leaves the value one layer too deep.`
          );
        });

        T.check('That is what map would have done instead', () => {
          const chained = just([[1, 2], [3]][0]).chain(head);
          const v = chained && chained.getOrElse ? chained.getOrElse(null) : chained;
          return v === 1 || `Chaining head over [1, 2] gave a Maybe holding ${T.fmt(v)}, expected 1.`;
        });

        T.check('An empty Maybe never runs the function', () => {
          let ran = false;
          nothing().chain((x: unknown) => { ran = true; return just(x); });
          return !ran || 'chain ran its function on an empty Maybe. There is no value in there to hand it.';
        });

        T.check('An empty Maybe stays empty through a chain', () => {
          const r = nothing().chain(() => just(1));
          return r.getOrElse('fallback') === 'fallback' || `Chaining out of an empty Maybe gave ${T.fmt(r.getOrElse('fallback'))}.`;
        });

        T.check('A chain that fails halfway short-circuits', () => {
          const r = just([]).chain(head).chain((n: number) => just(n * 2));
          return r.getOrElse('empty') === 'empty' || `A failing step gave ${T.fmt(r.getOrElse('empty'))} instead of staying empty.`;
        });

        T.law('Left identity: chaining onto a fresh just is just calling the function', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const a = just(n).chain((x: number) => just(f.f(x))).getOrElse(null);
          const b = just(f.f(n)).getOrElse(null);
          return a === b || `With ${f.name} at ${n}: ${T.fmt(a)} against ${T.fmt(b)}.`;
        });

        T.law('Right identity: chaining with the constructor changes nothing', 60, (G) => {
          const n = G.int();
          const r = just(n).chain((x: number) => just(x)).getOrElse(null);
          return r === n || `${n} came back as ${T.fmt(r)}.`;
        });

        T.law('Associativity: where you put the brackets does not matter', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const g = G.fn();
          const left = just(n).chain((x: number) => just(f.f(x))).chain((x: number) => just(g.f(x))).getOrElse(null);
          const right = just(n).chain((x: number) => just(f.f(x)).chain((y: number) => just(g.f(y)))).getOrElse(null);
          return left === right || `With ${f.name} and ${g.name} at ${n}: ${T.fmt(left)} against ${T.fmt(right)}.`;
        });
      },
    },
  ],
};
