import type { ExerciseSet } from '@fpx/engine/types';

export const algebraicDataType: ExerciseSet = {
  termId: 'algebraic-data-type',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Sum or product?',
      prompt:
        'A product holds several things at once. A sum is one of several possibilities. Select every type below that is a sum.',
      options: [
        {
          code: '// { width :: Number, height :: Number }',
          correct: false,
          why: 'A width AND a height. That is a product.',
        },
        {
          code: '// Circle Number | Square Number',
          correct: true,
          why: 'A shape is one or the other, never both.',
        },
        {
          code: '// [Number, String]',
          correct: false,
          why: 'A tuple holds both positions at once.',
        },
        {
          code: '// Loading | Ok a | Failed e',
          correct: true,
          why: 'Three possibilities, one at a time.',
        },
        {
          code: '// Boolean',
          correct: true,
          why: 'true or false. The smallest sum worth naming.',
        },
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Count the inhabitants',
      prompt:
        'The names are arithmetic. A product multiplies the possibilities of its parts; a sum adds them. Write the two counters.',
      hints: [
        'A pair of a Boolean and a three-valued type has 2 times 3 possible values.',
        'A choice between a Boolean and a three-valued type has 2 plus 3.',
        'An empty product has one inhabitant: the empty tuple. An empty sum has none.',
      ],
      exports: ['productSize', 'sumSize'],
      starter: `// productSize :: [Number] -> Number
// How many values a product of parts with these sizes can take
const productSize = (sizes) => {
}

// sumSize :: [Number] -> Number
// How many values a choice between parts with these sizes can take
const sumSize = (sizes) => {
}
`,
      solution: `// productSize :: [Number] -> Number
const productSize = (sizes) => sizes.reduce((a, b) => a * b, 1)

// sumSize :: [Number] -> Number
const sumSize = (sizes) => sizes.reduce((a, b) => a + b, 0)
`,
      broken: [
        // The two operations swapped.
        `const productSize = (sizes) => sizes.reduce((a, b) => a + b, 0)
const sumSize = (sizes) => sizes.reduce((a, b) => a * b, 1)
`,
        // Wrong identities: an empty product should be 1 and an empty sum 0.
        `const productSize = (sizes) => sizes.reduce((a, b) => a * b, 0)
const sumSize = (sizes) => sizes.reduce((a, b) => a + b, 1)
`,
        // Throws on the empty case rather than answering.
        `const productSize = (sizes) => sizes.reduce((a, b) => a * b)
const sumSize = (sizes) => sizes.reduce((a, b) => a + b)
`,
      ],
      checks: (T, exp) => {
        const productSize = exp.productSize as (xs: number[]) => number;
        const sumSize = exp.sumSize as (xs: number[]) => number;

        T.check('A Boolean and a three-valued type multiply to 6', () => {
          const r = productSize([2, 3]);
          return r === 6 || `Got ${T.fmt(r)}. Holding both at once means every combination, so the sizes multiply.`;
        });

        T.check('A choice between them adds to 5', () => {
          const r = sumSize([2, 3]);
          return r === 5 || `Got ${T.fmt(r)}. Being one or the other means the possibilities add.`;
        });

        T.check('Two Booleans make four', () => {
          const r = productSize([2, 2]);
          return r === 4 || `Got ${T.fmt(r)}`;
        });

        T.check('The empty product has exactly one inhabitant', () => {
          const r = productSize([]);
          return (
            r === 1 ||
            `Got ${T.fmt(r)}. A product of nothing is the empty tuple, and there is exactly one of those. It is the identity for multiplication.`
          );
        });

        T.check('The empty sum has none', () => {
          const r = sumSize([]);
          return (
            r === 0 ||
            `Got ${T.fmt(r)}. A choice among no options cannot be made, so there are no values of that type at all.`
          );
        });

        T.check('Neither throws on a single part', () => {
          return (
            productSize([7]) === 7 && sumSize([7]) === 7 ||
            `One part gave ${T.fmt(productSize([7]))} and ${T.fmt(sumSize([7]))}, expected 7 for both.`
          );
        });

        T.law('A product with a zero-sized part has no inhabitants either', 40, (G) => {
          const sizes = [G.nat() + 1, 0, G.nat() + 1];
          const r = productSize(sizes);
          return r === 0 || `productSize(${T.fmt(sizes)}) gave ${T.fmt(r)}. If one field is impossible, the whole record is.`;
        });
      },
    },
  ],
};
