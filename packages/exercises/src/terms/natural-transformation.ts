import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const naturalTransformation: ExerciseSet = {
  termId: 'natural-transformation',
  rubric: [
    {
      id: 'changes-the-container',
      statement:
        "Can convert one functor into another without touching the values inside.",
    },
    {
      id: 'naturality',
      statement:
        "Can state the naturality law and say what it forbids: looking at the values on the way through.",
    },
    {
      id: 'may-drop-elements',
      statement:
        "Knows it may change how many elements there are, as head does, and still be natural.",
    },
  ],
  notes: `A natural transformation changes the **container** and leaves the **contents** alone.

\`\`\`js
// head :: Array a -> Maybe a
const head = (xs) => (xs.length > 0 ? Just(xs[0]) : Nothing())

head([1, 2, 3])   // Just(1)
head([])          // Nothing
\`\`\`

The law says it cannot matter whether you map before or after:

\`\`\`js
nat(fa.map(f))        // has to equal
nat(fa).map(f)

head([1, 2].map((n) => n * 10))   // Just(10)
head([1, 2]).map((n) => n * 10)   // Just(10)
\`\`\`

What that forbids is the transformation **looking at the values**. The moment it does, the two
sides come apart:

\`\`\`js
const head = (xs) => (xs.length ? Just(xs[0] + 1) : Nothing())

head([1, 2].map((n) => n * 10))   // Just(11)
head([1, 2]).map((n) => n * 10)   // Just(20)
\`\`\`

So a natural transformation can only work on **shape**. Wrapping undefined instead of reporting
emptiness breaks a different promise:

\`\`\`js
const head = (xs) => Just(xs[0])
head([])   // Just(undefined), which claims there is a value
\`\`\`

It **may** change how many elements there are. \`head\` drops all but one and is perfectly
natural; so are \`reverse\`, \`Array -> Set\`, and \`Maybe -> Array\`. Naturality constrains what
it can know, not what it can keep.

The practical read: a conversion between two containers should be writable without ever
inspecting an element. If you find yourself needing to, you are writing something else.`,
  rungs: [
    {
      id: 'implement',
      covers: ['changes-the-container', 'naturality', 'may-drop-elements'],
      kind: 'code',
      role: 'implement',
      title: 'Change the container, not the contents',
      prompt:
        'A natural transformation moves a value from one functor to another without touching what is inside. Write `head :: Array a -> Maybe a`.',
      hints: [
        'An empty array has no head, so that case is Nothing.',
        'Whatever you do, do not apply a function to the element on the way through. Naturality is exactly the promise that you did not.',
      ],
      exports: ['head', 'Just', 'Nothing'],
      starter: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// head :: Array a -> Maybe a
const head = (xs) => {
}
`,
      solution: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// head :: Array a -> Maybe a
const head = (xs) => (xs.length > 0 ? Just(xs[0]) : Nothing())
`,
      broken: [
        // Wraps undefined instead of reporting emptiness.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => Just(xs[0])
`,
        // Touches the value on the way through, which breaks naturality.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => (xs.length > 0 ? Just(xs[0] + 1) : Nothing())
`,
        // Takes the last element rather than the first, which is still natural but wrong.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => (xs.length > 0 ? Just(xs[xs.length - 1]) : Nothing())
`,
      ],
      checks: (T, exp) => {
        const head = exp.head as (xs: any[]) => any;

        T.check('It takes the first element', () => {
          const r = head([1, 2, 3]);
          return (r?.isNothing === false && r.value === 1) || `Got ${T.fmt(r)}, expected Just(1).`;
        });

        T.check('An empty array gives Nothing', () => {
          const r = head([]);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. Wrapping undefined would claim there is a value when there is not, which is the thing Maybe exists to avoid.`
          );
        });

        T.check('A single-element array works', () => {
          const r = head([7]);
          return r?.value === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('The element comes through untouched', () => {
          const o = { id: 1 };
          const r = head([o]);
          return r?.value === o || 'The element was changed on the way through. A natural transformation moves the container, not the contents.';
        });

        laws.naturalTransformation(
          T,
          (xs: any[]) => head(xs),
          (n: number) => [n, n + 1, n + 2],
          60,
        );

        T.check('Naturality holds for the empty case too', () => {
          const left = head([].map((x: number) => x + 1));
          const right = head([]).map((x: number) => x + 1);
          return (
            left?.isNothing === true && right?.isNothing === true ||
            `Mapping before gave ${T.fmt(left)} and mapping after gave ${T.fmt(right)}. Both should be Nothing.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['naturality'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does naturality forbid?',
      prompt: 'The law says `nat(fa.map(f))` equals `nat(fa).map(f)`. What does that rule out?',
      options: [
        {
          code: '// The transformation looking at the values it carries',
          correct: true,
          why: 'If it inspected or changed them, mapping before and after would give different answers. It can only work on the shape.',
        },
        {
          code: '// The transformation changing the number of elements',
          correct: false,
          why: 'It can. head drops all but one, and that is perfectly natural.',
        },
        {
          code: '// The transformation being partial',
          correct: false,
          why: 'head is partial in spirit, which is why it returns a Maybe. Naturality is untroubled.',
        },
        {
          code: '// Using map inside the transformation',
          correct: false,
          why: 'Not forbidden in itself. Mapping with identity would be fine, if pointless.',
        },
      ],
    },
  ],
};
