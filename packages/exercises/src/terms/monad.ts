import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const monad: ExerciseSet = {
  termId: 'monad',
  rungs: [
    {
      id: 'implement',
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
  ],
};
