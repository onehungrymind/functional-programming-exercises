import type { ExerciseSet } from '@fpx/engine/types';

export const equationalReasoning: ExerciseSet = {
  termId: 'equational-reasoning',
  rubric: [
    {
      id: 'safe-rewrites',
      statement:
        "Can tell a rewrite that preserves meaning from one that quietly changes it, and can say which law licenses it.",
    },
    {
      id: 'needs-purity',
      statement:
        "Knows the rewrites only hold for pure functions, and can name a case where mutation breaks one.",
    },
    {
      id: 'apply-them',
      statement:
        "Can fuse and reorder a pipeline using the laws, and check the result agrees on every input.",
    },
  ],
  notes: `Equational reasoning is replacing an expression with an equal one, the way you would in algebra.
The laws are the licences.

\`\`\`js
xs.map(f).map(g)                 // the functor composition law
xs.map((x) => g(f(x)))           // one pass instead of two

xs.concat([]).length             // the monoid identity
xs.length
\`\`\`

Moving a filter past a map needs the predicate rewritten, because it now sees the pre-map value:

\`\`\`js
xs.map(f).filter(p)              // filter sees f(x)
xs.filter((x) => p(f(x))).map(f) // same elements survive, and f runs on fewer of them
\`\`\`

Some rewrites that look symmetrical are not:

\`\`\`js
xs.filter(p).map(f)              // p sees the raw element
xs.map(f).filter(p)              // p now sees a different shape. Not the same program.
\`\`\`

All of it rests on purity. The moment a function mutates, the rewrite stops being safe:

\`\`\`js
const xs = [1, 2, 3]
xs.reverse().reverse()   // looks like a no-op
xs                       // [1, 2, 3] by luck: reverse mutated twice and landed back

const ys = [1, 2, 3]
const zs = ys.reverse()  // ys is now [3, 2, 1] as well. Substituting ys for zs is wrong.
\`\`\`

This is the whole practical argument for purity. Not elegance: the ability to read a large
program by replacing pieces with what they mean, without holding the rest of it in your head.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['safe-rewrites', 'needs-purity'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which rewrites are safe?',
      prompt:
        'Equational reasoning means replacing an expression with an equal one. Select every rewrite that is safe for pure `f` and `g`.',
      options: [
        {
          code: 'xs.map(f).map(g)\n  ->  xs.map(x => g(f(x)))',
          correct: true,
          why: 'The functor composition law. One pass instead of two, same answer.',
        },
        {
          code: 'xs.filter(p).map(f)\n  ->  xs.map(f).filter(p)',
          correct: false,
          why: 'The predicate now sees the mapped values, which are a different shape.',
        },
        {
          code: 'xs.map(f).filter(p)\n  ->  xs.filter(x => p(f(x))).map(f)',
          correct: true,
          why: 'Same elements survive and each gets the same f. Filtering first can even be cheaper.',
        },
        {
          code: 'xs.reverse().reverse()\n  ->  xs',
          correct: false,
          why: 'reverse mutates in place, so the rewrite changes what the caller is holding. It would be safe for a copying reverse.',
        },
        {
          code: 'xs.concat([]).length\n  ->  xs.length',
          correct: true,
          why: 'concat with the empty list is the monoid identity, and it copies rather than mutating.',
        },
      ],
    },

    {
      id: 'guided',
      covers: ['apply-them', 'safe-rewrites'],
      kind: 'code',
      role: 'guided',
      title: 'Rewrite a pipeline step by step',
      prompt:
        'Apply the laws to `slow`: fuse the two maps into one, and move the filter before the map so it runs on fewer elements. `fast` must give the same answers.',
      hints: [
        '`map(f).map(g)` becomes `map(x => g(f(x)))`.',
        '`map(f).filter(p)` becomes `filter(x => p(f(x))).map(f)`. The predicate has to be rewritten to see the pre-map value.',
      ],
      exports: ['fast'],
      starter: `const double = (n) => n * 2
const addTen = (n) => n + 10
const isBig = (n) => n > 20

// slow :: [Number] -> [Number]
const slow = (ns) => ns.map(double).map(addTen).filter(isBig)

// fast :: [Number] -> [Number]
// One map and one filter, and the filter runs first.
const fast = (ns) => ns.map(double).map(addTen).filter(isBig)
`,
      solution: `const double = (n) => n * 2
const addTen = (n) => n + 10
const isBig = (n) => n > 20

const step = (n) => addTen(double(n))

// fast :: [Number] -> [Number]
const fast = (ns) => ns.filter((n) => isBig(step(n))).map(step)
`,
      broken: [
        // The starter: two maps and a trailing filter.
        `const double = (n) => n * 2
const addTen = (n) => n + 10
const isBig = (n) => n > 20

const fast = (ns) => ns.map(double).map(addTen).filter(isBig)
`,
        // Moved the filter but forgot to rewrite the predicate for the pre-map value.
        `const double = (n) => n * 2
const addTen = (n) => n + 10
const isBig = (n) => n > 20
const step = (n) => addTen(double(n))

const fast = (ns) => ns.filter(isBig).map(step)
`,
        // Fused the maps in the wrong order.
        `const double = (n) => n * 2
const addTen = (n) => n + 10
const isBig = (n) => n > 20
const step = (n) => double(addTen(n))

const fast = (ns) => ns.filter((n) => isBig(step(n))).map(step)
`,
      ],
      checks: (T, exp) => {
        const fast = exp.fast as (ns: number[]) => number[];
        const reference = (ns: number[]) => ns.map((n) => n * 2).map((n) => n + 10).filter((n) => n > 20);

        T.check('It agrees with the original on a sample', () => {
          const input = [1, 5, 6, 10];
          const got = fast(input);
          const want = reference(input);
          return T.eq(got, want) || `On ${T.fmt(input)}: got ${T.fmt(got)}, the original gives ${T.fmt(want)}.`;
        });

        T.law('It agrees with the original on any list', 80, (G) => {
          const ns = G.ints();
          const got = fast(ns);
          const want = reference(ns);
          return T.eq(got, want) || `On ${T.fmt(ns)}: got ${T.fmt(got)}, the original gives ${T.fmt(want)}.`;
        });

        T.check('It walks the list twice at most, not three times', () => {
          const calls = T.src.match(/\.(map|filter)\(/g) ?? [];
          return (
            calls.length <= 2 ||
            `The pipeline still makes ${calls.length} passes. Fusing the two maps leaves one map and one filter.`
          );
        });

        T.check('The filter runs before the map', () => {
          const order = T.src.match(/\.(map|filter)\(/g) ?? [];
          const first = order[0];
          return (
            first === '.filter(' ||
            `The first pass is a ${first === '.map(' ? 'map' : String(first)}. Filtering first means the map runs on fewer elements.`
          );
        });

        T.check('An empty list stays empty', () => {
          const r = fast([]);
          return T.eq(r, []) || `Got ${T.fmt(r)}`;
        });
      },
    },
  ],
};
