import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const naturalTransformation: ExerciseSet = {
  termId: 'natural-transformation',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
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
