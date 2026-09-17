import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const foldable: ExerciseSet = {
  termId: 'foldable',
  rubric: [
    {
      id: 'collapse',
      statement:
        "Can give a structure a reduce that visits every element exactly once in a defined order.",
    },
    {
      id: 'order-matters',
      statement:
        "Knows the traversal order is part of the contract, and that reduce must agree with the structure's own idea of its elements.",
    },
    {
      id: 'what-it-buys',
      statement:
        "Can say what one reduce provides: sum, length, contains, maximum, and anything else expressible as a fold.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `reduce`'s type and say that the seed is what fixes `B`, which is why one fold can produce a number, a list, or a string.",
    },
  ],
  notes: `Foldable means the structure can be collapsed to a single value. One method, and a family of
operations comes with it.

\`\`\`js
const Leaf = (value) => ({
  reduce: (f, seed) => f(seed, value),
  toArray: () => [value]
})

const Node = (left, value, right) => ({
  reduce: (f, seed) => right.reduce(f, f(left.reduce(f, seed), value)),
  //                   ^ right      ^ node     ^ left     in that order
  toArray: () => [...left.toArray(), value, ...right.toArray()]
})
\`\`\`

Order is part of the contract, not an implementation detail. Visiting the node before its left
subtree gives different answers for anything non-commutative:

\`\`\`js
const tree = Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5)))

tree.reduce((acc, x) => [...acc, x], [])   // [1, 2, 3, 4, 5]
tree.reduce((a, b) => a + b, 0)            // 15, same either way
tree.reduce((a, b) => a - b, 0)            // order-dependent, and now it matters
\`\`\`

Which is why the useful self-check is that \`reduce\` agrees with the structure's own idea of
its elements:

\`\`\`js
tree.reduce((acc, x) => [...acc, x], [])   // has to equal tree.toArray()
\`\`\`

And once \`reduce\` exists, a whole family follows without knowing anything about the shape:

\`\`\`js
const sum      = (t) => t.reduce((a, b) => a + b, 0)
const length   = (t) => t.reduce((a) => a + 1, 0)
const toArray  = (t) => t.reduce((a, b) => [...a, b], [])
const contains = (t, x) => t.reduce((a, b) => a || b === x, false)
const maximum  = (t) => t.reduce((a, b) => (b > a ? b : a), -Infinity)
\`\`\`

What Foldable does **not** give you is \`map\`: a fold cannot rebuild the structure it walked.
That needs [Functor](#functor), and doing both at once needs
[Traversable](#traversable).`,
  typedNotes: `Same track, second lap. The signature explains why a fold can produce anything at all.

\`\`\`ts
interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}
\`\`\`

Two variables doing different jobs. \`A\` is what the structure holds and is fixed when you
build the tree. \`B\` is introduced by \`reduce\` itself, so it is chosen fresh at every call
site, by whoever is folding.

Follow where \`B\` comes from: the seed. Hand \`reduce\` a \`0\` and \`B\` is \`number\`. Hand it \`[]\`
and \`B\` is an array. The accumulator, the return type of \`f\`, and the return type of \`reduce\`
all become that, and there is nothing to say about it in the interface.

\`\`\`ts
const sum   = tree.reduce((acc, n) => acc + n, 0)        // number
const list  = tree.reduce<number[]>((acc, n) => [...acc, n], [])  // number[]
const label = tree.reduce((acc, n) => acc + n + ' ', '') // string
\`\`\`

Same structure, same method, three different \`B\`s. That is what "collapse to a summary value"
means precisely: not a number, any type you like.

\`\`\`ts
const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => f(seed, value)
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, seed))
})
\`\`\`

\`node\` is the whole implementation and it is worth reading closely. \`left.reduce(f, seed)\`
produces a \`B\`, which is then the seed for the right side. Left finishes before right starts,
and the types make it hard to write any other way: the only \`B\` available to feed the right
subtree is the one the left just produced.

That threading is also why order is not negotiable. Swap the two and it still typechecks, so
\`toArray\` would come back in the wrong order and the compiler would have nothing to say.
\`toArray\` is just the fold where you picked \`B = A[]\`, and if the order is wrong there, it is
wrong everywhere.`,
  rungs: [
    {
      id: 'implement',
      covers: ['collapse', 'order-matters'],
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
      covers: ['what-it-buys'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['collapse', 'what-it-buys', 'typed-signature'],
      title: "Satisfy Tree<A>",
      prompt:
        "The interface is given. Write `leaf` and `node` so the fold visits left before right and threads the accumulator through both.",
      hints: [
        "A leaf has one value. Apply `f` to the seed and that value, and that is the answer.",
        "`node` folds the left side first. What comes back is a `B`, which is exactly what the right side needs as its seed.",
        "You never build an array on the way. The seed is the only accumulator there is.",
      ],
      exports: ['leaf', 'node'],
      starter: `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => seed
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => seed
})
`,
      solution: `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => f(seed, value)
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, seed))
})
`,
      broken: [
        `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => f(seed, value)
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => left.reduce(f, right.reduce(f, seed))
})
`,
        `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => f(seed, value)
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => right.reduce(f, seed)
})
`,
        `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({
  reduce: (f, seed) => f(value as never, seed as never) as never
})

const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, seed))
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
        T.check('The Tree declaration is still there to satisfy', () => {
          return /interface\s+Tree/.test(T.src) || 'The Tree declaration has gone. It is the thing being satisfied.';
        });
        const { leaf, node } = exp;
        // ((1 2) (3 4))
        const t = node(node(leaf(1), leaf(2)), node(leaf(3), leaf(4)));

        T.check('A lone leaf folds to its value', () => {
          const r = leaf(5).reduce((acc: number, n: number) => acc + n, 0);
          return r === 5 || `Folding a single leaf of 5 with addition gave ${T.fmt(r)}.`;
        });

        T.check('Every value is visited exactly once', () => {
          const r = t.reduce((acc: number, n: number) => acc + n, 0);
          return r === 10 || `Summing 1, 2, 3 and 4 gave ${T.fmt(r)}. Either something was skipped or something was counted twice.`;
        });

        T.check('The seed is where B comes from, so a list is a fold too', () => {
          const r = t.reduce((acc: number[], n: number) => [...acc, n], [] as number[]);
          return (
            T.eq(r, [1, 2, 3, 4]) ||
            `Folding into an array gave ${T.fmt(r)}, expected [1, 2, 3, 4]. Left has to finish before right starts.`
          );
        });

        T.check('B can be a string just as easily', () => {
          const r = t.reduce((acc: string, n: number) => acc + n, '');
          return r === '1234' || `Folding into a string gave ${T.fmt(r)}.`;
        });

        T.check('The accumulator goes first, the value second', () => {
          const r = t.reduce((acc: string, n: number) => acc + '-' + n, 'seed');
          return (
            r === 'seed-1-2-3-4' ||
            `Threading a seed through gave ${T.fmt(r)}, expected 'seed-1-2-3-4'. \`f\` is typed (acc, a), in that order.`
          );
        });

        T.check('The seed is used, not ignored', () => {
          const r = t.reduce((acc: number, n: number) => acc + n, 100);
          return r === 110 || `With a seed of 100 the sum came to ${T.fmt(r)}, expected 110.`;
        });

        T.check('A lopsided tree folds in the same order', () => {
          const s = node(leaf(1), node(leaf(2), node(leaf(3), leaf(4))));
          const r = s.reduce((acc: number[], n: number) => [...acc, n], [] as number[]);
          return T.eq(r, [1, 2, 3, 4]) || `A right-leaning tree folded to ${T.fmt(r)}.`;
        });

        T.law('Folding into an array agrees with folding into a sum', 60, (G) => {
          const a = G.int(), b = G.int(), c = G.int();
          const s = node(leaf(a), node(leaf(b), leaf(c)));
          const xs = s.reduce((acc: number[], n: number) => [...acc, n], [] as number[]);
          const total = s.reduce((acc: number, n: number) => acc + n, 0);
          return (
            xs.reduce((x: number, y: number) => x + y, 0) === total ||
            `On ${T.fmt([a, b, c])} the list fold gave ${T.fmt(xs)} and the sum fold gave ${T.fmt(total)}.`
          );
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'order-matters'],
      title: "The seed is what fixes B",
      prompt:
        "`B` is introduced by `reduce` itself, so the seed decides what the fold produces. Type an array of the same tree folded into a number, a string, and a list's length.",
      hints: [
        "Hand it 0 and `B` is a number. Hand it '' and `B` is a string.",
        "Left finishes before right starts, so the order is 1, 2, 3, 4.",
        "The list fold is the one where getting the order wrong is visible.",
      ],
      context: `interface Tree<A> {
  reduce: <B>(f: (acc: B, a: A) => B, seed: B) => B
}

const leaf = <A>(value: A): Tree<A> => ({ reduce: (f, seed) => f(seed, value) })
const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
  reduce: (f, seed) => right.reduce(f, left.reduce(f, seed))
})

const t = node(node(leaf(1), leaf(2)), node(leaf(3), leaf(4)))
`,
      placeholder: "[..., ..., ...]",
      expect: [10,"1234",4],
      solution: "[t.reduce((acc: number, n) => acc + n, 0), t.reduce((acc: string, n) => acc + n, ''), t.reduce((acc: number[], n) => [...acc, n], [] as number[]).length]",
      broken: ["[10, '1234', 1]", "[10, 10, 4]", "[10, '4321', 4]"],
    },
  ],
};
