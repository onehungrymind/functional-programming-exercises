import type { ExerciseSet } from '@fpx/engine/types';

export const traversal: ExerciseSet = {
  termId: 'traversal',
  rubric: [
    {
      id: 'many-focuses',
      statement:
        "Knows a traversal focuses on any number of elements, where a lens focuses on one and a prism on at most one.",
    },
    {
      id: 'leave-the-rest',
      statement:
        "Can modify the matching elements while leaving the non-matching ones exactly where they were.",
    },
    {
      id: 'consistency',
      statement:
        "Knows reading after modifying should agree with modifying what was read, and that identity must change nothing.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read a traversal's type and see that reading gives many values while writing still gives back one whole structure.",
    },
  ],
  notes: `The optics hierarchy is about **how many** things you can be looking at:

\`\`\`js
// lens       exactly one       user.name
// prism      zero or one       the Right of an Either
// traversal  zero or more      every even number in a list
\`\`\`

A traversal reads them all and modifies them in place, structurally speaking:

\`\`\`js
const isEven = (n) => n % 2 === 0

const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.map((x) => (isEven(x) ? f(x) : x))

getAll([1, 2, 3, 4])            // [2, 4]
modify((n) => n * 10, [1, 2, 3, 4])   // [1, 20, 3, 40]
\`\`\`

The non-matching elements are the point. A traversal **narrows what you act on**, it does not
remove anything:

\`\`\`js
const modify = (f, xs) => xs.filter(isEven).map(f)   // [20, 40]. The odds are gone.
const modify = (f, xs) => xs.map(f)                  // [10, 20, 30, 40]. Everything changed.
\`\`\`

And it must not disturb what it was given:

\`\`\`js
const modify = (f, xs) => {
  xs.forEach((x, i) => { if (isEven(x)) xs[i] = f(x) })
  return xs                    // the caller's array just changed
}
\`\`\`

Two consistency properties are worth checking. Modifying with identity changes nothing, and
reading after a modify agrees with modifying what you read:

\`\`\`js
modify((x) => x, xs)              // the same list
getAll(modify(f, xs))             // agrees with getAll(xs).map(f)
                                  // as long as f keeps elements inside the focus
\`\`\`

That caveat matters: if \`f\` turns an even number odd, the focus set itself moves, and the two
sides stop agreeing for a good reason.`,
  typedNotes: `Same track, second lap. A traversal focuses many places at once, and the type has exactly one
plural in it.

\`\`\`ts
interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}
\`\`\`

\`getAll\` returns \`A[]\`, because there may be none, one, or fifty. \`modify\` returns \`S\`. Not
\`A[]\`, not the focuses you touched, but the whole structure with everything else still on it.
That single \`S\` is the "leave the rest alone" rule, written as a return type.

Next to a [lens](#lens), the only thing that changed is the plural:

\`\`\`ts
interface Lens<S, A>      { getter: (s: S) => A;   setter: (a: A, s: S) => S }
interface Traversal<S, A> { getAll: (s: S) => A[]; modify: (f: (a: A) => A, s: S) => S }
\`\`\`

A lens is the special case where \`getAll\` always returns exactly one thing. Here is one over
every score on a record:

\`\`\`ts
interface Player { name: string, scores: number[] }

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores,
  modify: (f, p) => ({ ...p, scores: p.scores.map(f) })
}

const ada: Player = { name: 'Ada', scores: [3, 5] }
scores.getAll(ada)               // [3, 5]
scores.modify((n) => n * 2, ada) // { name: 'Ada', scores: [6, 10] }
\`\`\`

Read \`(a: A) => A\` in \`modify\`. In and out are the same type, which is why the result can be
written back where it came from. Change it to \`(a: A) => B\` and you no longer have a
traversal, you have a [map](#functor) that produces a different structure.

The count is the part the type does guarantee for you nowhere: \`getAll(modify(f, s))\` should
be \`getAll(s).map(f)\`, same length, same order. Drop a focus or reorder them and it still
compiles.`,
  rungs: [
    {
      id: 'implement',
      covers: ['leave-the-rest', 'consistency'],
      kind: 'code',
      role: 'implement',
      title: 'Focus on many things at once',
      prompt:
        'Where a lens focuses on one thing and a prism on at most one, a traversal focuses on any number. Write one over the even numbers in a list.',
      hints: [
        '`getAll` collects the elements that match, in order.',
        '`modify` applies the function to the matching elements and leaves the others exactly as they were.',
      ],
      exports: ['getAll', 'modify'],
      starter: `const isEven = (n) => n % 2 === 0

// getAll :: [Number] -> [Number]
const getAll = (xs) => {
}

// modify :: ((Number -> Number), [Number]) -> [Number]
const modify = (f, xs) => {
}
`,
      solution: `const isEven = (n) => n % 2 === 0

// getAll :: [Number] -> [Number]
const getAll = (xs) => xs.filter(isEven)

// modify :: ((Number -> Number), [Number]) -> [Number]
const modify = (f, xs) => xs.map((x) => (isEven(x) ? f(x) : x))
`,
      broken: [
        // Drops the elements that did not match instead of leaving them alone.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.filter(isEven).map(f)
`,
        // Applies the function to everything.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => xs.map(f)
`,
        // Mutates the list it was given.
        `const isEven = (n) => n % 2 === 0
const getAll = (xs) => xs.filter(isEven)
const modify = (f, xs) => {
  xs.forEach((x, i) => {
    if (isEven(x)) xs[i] = f(x)
  })
  return xs
}
`,
      ],
      checks: (T, exp) => {
        const getAll = exp.getAll as (xs: number[]) => number[];
        const modify = exp.modify as (f: (n: number) => number, xs: number[]) => number[];

        T.check('getAll collects the even numbers in order', () => {
          const r = getAll([1, 2, 3, 4, 6]);
          return T.eq(r, [2, 4, 6]) || `Got ${T.fmt(r)}`;
        });

        T.check('getAll on a list with no matches gives nothing', () => {
          const r = getAll([1, 3, 5]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });

        T.check('modify changes the matches', () => {
          const r = modify((n) => n * 10, [1, 2, 3, 4]);
          return T.eq(r, [1, 20, 3, 40]) || `Got ${T.fmt(r)}, expected [1, 20, 3, 40].`;
        });

        T.check('modify keeps the non-matches where they were', () => {
          const r = modify((n) => n * 10, [1, 2, 3, 4]);
          return (
            r.length === 4 ||
            `Got ${T.fmt(r)}, which is ${r.length} long. A traversal focuses on some elements; it does not remove the others.`
          );
        });

        T.check('modify leaves the input list alone', () => {
          const xs = T.freeze([1, 2, 3, 4]);
          modify((n) => n * 10, xs as number[]);
          return T.eq(xs, [1, 2, 3, 4]) || 'The list changed.';
        });

        T.law('modify with identity changes nothing', 60, (G) => {
          const xs = G.ints();
          const r = modify((n) => n, xs);
          return T.eq(r, xs) || `On ${T.fmt(xs)}: got ${T.fmt(r)}.`;
        });

        T.law('getAll after modify equals modify applied to getAll', 60, (G) => {
          const xs = G.ints().map((n) => n * 2); // keep them all matching, so f cannot change the set
          const f = G.fn();
          const g = (n: number) => f.f(n) * 2; // stays even, so the focus set is stable
          const left = getAll(modify(g, xs));
          const right = getAll(xs).map(g);
          return (
            T.eq(left, right) ||
            `On ${T.fmt(xs)} with ${f.name}: reading after modifying gave ${T.fmt(left)}, modifying what was read gave ${T.fmt(right)}.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['many-focuses'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'How many does each optic focus on?',
      prompt: 'Match the optic to the number of things it can focus on.',
      options: [
        {
          code: '// lens: exactly one\n// prism: zero or one\n// traversal: zero or more',
          correct: true,
          why: 'That is the whole hierarchy. Each is a loosening of the one before.',
        },
        {
          code: '// lens: one\n// prism: many\n// traversal: one',
          correct: false,
          why: 'Prism and traversal are the wrong way round. A prism is about a case that may not match.',
        },
        {
          code: '// All three focus on exactly one',
          correct: false,
          why: 'Then there would be no reason to have three.',
        },
        {
          code: '// lens: zero or more\n// prism: one\n// traversal: zero or one',
          correct: false,
          why: 'All three are shuffled.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['many-focuses', 'leave-the-rest', 'typed-signature'],
      title: "Satisfy Traversal<Player, number>",
      prompt:
        "The interface is given. Fill in `scores` so it reads every score off a player and can map over all of them at once, leaving the name where it was.",
      hints: [
        "`getAll` is plural. Hand back the array itself, not the first element and not the player.",
        "`modify` returns the whole player. Spread the old one and replace just the scores.",
        "Nothing here is allowed to write into the player you were handed.",
      ],
      exports: ['scores'],
      starter: `interface Player { name: string; scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => [],
  modify: (f, p) => p
}
`,
      solution: `interface Player { name: string; scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores,
  modify: (f, p) => ({ ...p, scores: p.scores.map(f) })
}
`,
      broken: [
        `interface Player { name: string; scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores,
  modify: (f, p) => p.scores.map(f) as unknown as Player
}
`,
        `interface Player { name: string; scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores,
  modify: (f, p) => {
    p.scores = p.scores.map(f)
    return p
  }
}
`,
        `interface Player { name: string; scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores.slice(0, 1),
  modify: (f, p) => ({ ...p, scores: p.scores.map(f) })
}
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
        T.check('The Traversal interface is still there to satisfy', () => {
          return /interface\s+Traversal/.test(T.src) || 'The Traversal interface has gone. It is the thing being satisfied.';
        });
        const t = exp.scores;
        const ada = () => ({ name: 'Ada', scores: [3, 5, 7] });

        T.check('getAll hands back every focus, not just the first', () => {
          const r = t.getAll(ada());
          return T.eq(r, [3, 5, 7]) || `getAll gave ${T.fmt(r)}, expected all three scores.`;
        });

        T.check('modify gives back a whole player, not the scores', () => {
          const r = t.modify((n: number) => n, ada());
          return (
            (r && typeof r === 'object' && !Array.isArray(r) && r.name === 'Ada') ||
            `modify gave ${T.fmt(r)}. The return type is the whole structure, so the name has to still be on it.`
          );
        });

        T.check('Every focus is changed', () => {
          const r = t.modify((n: number) => n * 2, ada());
          return T.eq(r.scores, [6, 10, 14]) || `Doubling gave ${T.fmt(r.scores)}.`;
        });

        T.check('The player handed in is left alone', () => {
          const p = T.freeze({ name: 'Ada', scores: T.freeze([3, 5, 7]) });
          const r = t.modify((n: number) => n + 1, p);
          return (
            T.eq(t.getAll(p), [3, 5, 7]) && T.eq(r.scores, [4, 6, 8]) ||
            `The original came back as ${T.fmt(t.getAll(p))} after modifying.`
          );
        });

        T.law('Reading after modifying is the same as reading then mapping', 60, (G) => {
          const xs = G.ints();
          const f = G.fn();
          const p = { name: 'x', scores: xs };
          const after = t.getAll(t.modify(f.f, p));
          const want = xs.map(f.f);
          return (
            T.eq(after, want) ||
            `With scores ${T.fmt(xs)} and ${f.name}, modifying then reading gave ${T.fmt(after)} but mapping directly gives ${T.fmt(want)}.`
          );
        });

        T.check('An empty structure is still fine', () => {
          const r = t.modify((n: number) => n * 2, { name: 'x', scores: [] });
          return T.eq(r.scores, []) || `With no scores, modify gave ${T.fmt(r)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'consistency'],
      title: "Read the plural and the singular",
      prompt:
        "`getAll` returns `A[]` and `modify` returns `S`. Type an array holding the name still on the modified player and the number of focuses it came back with.",
      hints: [
        "`modify` returns the whole structure, so the name survives.",
        "`getAll` returns every focus, so the count does not change when you map over them.",
        "Doubling three scores gives three scores.",
      ],
      context: `interface Player { name: string, scores: number[] }

interface Traversal<S, A> {
  getAll: (s: S) => A[]
  modify: (f: (a: A) => A, s: S) => S
}

const scores: Traversal<Player, number> = {
  getAll: (p) => p.scores,
  modify: (f, p) => ({ ...p, scores: p.scores.map(f) })
}

const ada: Player = { name: 'Ada', scores: [3, 5, 7] }
`,
      placeholder: "[..., ...]",
      expect: ["Ada",3],
      solution: "[scores.modify((n) => n * 2, ada).name, scores.getAll(scores.modify((n) => n * 2, ada)).length]",
      broken: ["['Ada', 1]", "[undefined, 3]", "['Ada', 6]"],
    },
  ],
};
