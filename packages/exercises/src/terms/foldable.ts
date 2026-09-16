import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const foldable: ExerciseSet = {
  termId: 'foldable',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Fold a tree down to one value',
      prompt:
        'Anything Foldable can be collapsed to a single value. Give a binary tree a `reduce` that visits its elements left to right.',
      hints: [
        'A leaf contributes its own value. A node contributes its left subtree, then itself, then its right.',
        'Thread the accumulator through in that order.',
      ],
      exports: ['Leaf', 'Node'],
      starter: `// Leaf :: a -> Tree a
const Leaf = (value) => ({
  reduce: (f, seed) => {
  },
  toArray: () => [value],
  inspect: () => \`Leaf(\${JSON.stringify(value)})\`
})

// Node :: (Tree a, a, Tree a) -> Tree a
const Node = (left, value, right) => ({
  reduce: (f, seed) => {
  },
  toArray: () => [...left.toArray(), value, ...right.toArray()],
  inspect: () => 'Node(...)'
})
`,
      solution: `// Leaf :: a -> Tree a
const Leaf = (value) => ({
  reduce: (f, seed) => f(seed, value),
  toArray: () => [value],
  inspect: () => \`Leaf(\${JSON.stringify(value)})\`
})

// Node :: (Tree a, a, Tree a) -> Tree a
const Node = (left, value, right) => ({
  reduce: (f, seed) => right.reduce(f, f(left.reduce(f, seed), value)),
  toArray: () => [...left.toArray(), value, ...right.toArray()],
  inspect: () => 'Node(...)'
})
`,
      broken: [
        // Visits the node before its left subtree.
        `const Leaf = (value) => ({ reduce: (f, seed) => f(seed, value), toArray: () => [value], inspect: () => \`Leaf(\${JSON.stringify(value)})\` })
const Node = (left, value, right) => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, f(seed, value))),
  toArray: () => [...left.toArray(), value, ...right.toArray()],
  inspect: () => 'Node(...)'
})
`,
        // Forgets the node's own value.
        `const Leaf = (value) => ({ reduce: (f, seed) => f(seed, value), toArray: () => [value], inspect: () => \`Leaf(\${JSON.stringify(value)})\` })
const Node = (left, value, right) => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, seed)),
  toArray: () => [...left.toArray(), value, ...right.toArray()],
  inspect: () => 'Node(...)'
})
`,
        // Restarts the accumulator on the right, so the left half is lost.
        `const Leaf = (value) => ({ reduce: (f, seed) => f(seed, value), toArray: () => [value], inspect: () => \`Leaf(\${JSON.stringify(value)})\` })
const Node = (left, value, right) => ({
  reduce: (f, seed) => right.reduce(f, f(seed, value)),
  toArray: () => [...left.toArray(), value, ...right.toArray()],
  inspect: () => 'Node(...)'
})
`,
      ],
      checks: (T, exp) => {
        const Leaf = exp.Leaf as (v: number) => any;
        const Node = exp.Node as (l: any, v: number, r: any) => any;

        const tree = () => Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5)));

        T.check('A leaf folds to its own value', () => {
          const r = Leaf(7).reduce((a: number, b: number) => a + b, 0);
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('A tree sums correctly', () => {
          const r = tree().reduce((a: number, b: number) => a + b, 0);
          return r === 15 || `Got ${T.fmt(r)}, expected 15 for 1 + 2 + 3 + 4 + 5.`;
        });

        T.check('The elements are visited left to right', () => {
          const seen: number[] = [];
          tree().reduce((acc: null, x: number) => {
            seen.push(x);
            return acc;
          }, null);
          return (
            T.eq(seen, [1, 2, 3, 4, 5]) ||
            `They were visited in the order ${T.fmt(seen)}. For a node: the left subtree, then the node, then the right.`
          );
        });

        T.check('Every element is visited exactly once', () => {
          const seen: number[] = [];
          tree().reduce((acc: null, x: number) => {
            seen.push(x);
            return acc;
          }, null);
          return seen.length === 5 || `${seen.length} visits for 5 elements: ${T.fmt(seen)}.`;
        });

        T.check('The seed is where it starts', () => {
          const r = Leaf(1).reduce((a: number, b: number) => a + b, 100);
          return r === 101 || `Got ${T.fmt(r)}`;
        });

        T.check('reduce agrees with toArray', () => {
          const t = tree();
          const viaReduce = t.reduce((acc: number[], x: number) => [...acc, x], []);
          const viaArray = t.toArray();
          return (
            T.eq(viaReduce, viaArray) ||
            `Folding gave ${T.fmt(viaReduce)} and toArray gave ${T.fmt(viaArray)}. They have to agree, or the fold is visiting the structure in a different order from the one it claims.`
          );
        });

        // A list built as a right-leaning tree, so the law suite can drive it generically.
        const fromArray = (xs: number[]) =>
          xs.length === 0
            ? { reduce: (_f: any, seed: any) => seed, toArray: () => [] }
            : xs.slice(1).reduce((acc: any, x) => Node(acc, x, Leaf(x)), Leaf(xs[0]!));
        void fromArray;

        laws.foldable(T, {
          fromArray: (xs) =>
            xs.length === 0
              ? { reduce: (_f: any, seed: any) => seed, toArray: () => [] }
              : xs.slice(1).reduce((acc: any, x) => Node(acc, x, { reduce: (_f: any, s: any) => s, toArray: () => [] }), Leaf(xs[0]!)),
          toArray: (u: any) => u.toArray(),
          runs: 40,
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does Foldable let you write once?',
      prompt: 'Once a structure has `reduce`, what comes for free?',
      options: [
        {
          code: '// sum, length, toArray, contains, maximum, and anything else\n// expressible as a fold',
          correct: true,
          why: 'One method buys a whole family, and none of them need to know the shape of the structure.',
        },
        {
          code: '// map',
          correct: false,
          why: 'reduce cannot rebuild the structure it walked. Mapping needs Functor.',
        },
        {
          code: '// A way to compare two structures',
          correct: false,
          why: "Only via their elements, and that is what Setoid is for.",
        },
        {
          code: '// Lazy traversal',
          correct: false,
          why: 'A fold visits everything. Stopping early needs something else.',
        },
      ],
    },
  ],
};
