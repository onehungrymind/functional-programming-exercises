import type { ExerciseSet } from '@fpx/engine/types';

export const algebraicDataType: ExerciseSet = {
  termId: 'algebraic-data-type',
  rubric: [
    {
      id: 'sum-vs-product',
      statement:
        "Can classify a type as a sum or a product, and say which word in its description gave it away.",
    },
    {
      id: 'counting',
      statement:
        "Can count the inhabitants of a composite type, multiplying for products and adding for sums.",
    },
    {
      id: 'identities',
      statement:
        "Knows the empty product has one inhabitant and the empty sum has none, and can say why.",
    },
  ],
  notes: `The names are arithmetic, and they mean it literally. A **product** holds several things at
once; a **sum** is one of several possibilities.

\`\`\`js
// product: a width AND a height
{ width: Number, height: Number }

// sum: a Circle OR a Square
Circle(Number) | Square(Number)
\`\`\`

The arithmetic is how many values the type can take:

\`\`\`js
// { admin: Boolean, active: Boolean, role: 'read' | 'write' | 'own' }
2 * 2 * 3      // 12 possible values. Products multiply.

// Boolean | 'read' | 'write' | 'own'
2 + 3          // 5 possible values. Sums add.
\`\`\`

The identities follow from that, and they are the part that feels strange until you count:

\`\`\`js
// a record with no fields
{}             // exactly 1 value: the empty record itself. Product identity.

// a choice among no options
never          // 0 values: you cannot make one. Sum identity.
\`\`\`

Which is why a field of an impossible type makes the whole record impossible:

\`\`\`js
5 * 0 * 3      // 0. If one field cannot be filled, no complete record exists.
\`\`\`

The practical value is that counting tells you how many cases a \`match\` has to handle, and
turning a product into a sum is usually how you make illegal states unrepresentable. A record
with \`loading\`, \`data\` and \`error\` fields has 8 combinations and only 3 are meaningful;
a sum type has exactly 3.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['sum-vs-product'],
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
      covers: ['counting', 'identities'],
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

    {
      id: 'arithmetic',
      kind: 'code',
      role: 'apply',
      covers: ['sum-vs-product', 'counting', 'identities'],
      title: "Count the values, and watch the names make sense",
      prompt:
        "The names are arithmetic. Write `countProduct` and `countSum` over the sizes of the parts, then `sizeOf`, which handles a small description of either kind. The answers are why one is called a product and the other a sum.",
      hints: [
        "A product holds all of its fields at once, so the combinations multiply.",
        "A sum holds exactly one of its cases, so the possibilities add.",
        "A product of no fields has one value, not none: there is exactly one way to hold nothing. That makes 1 the right starting point for a multiplication, and 0 for a sum.",
      ],
      exports: ['countProduct', 'countSum', 'sizeOf'],
      starter: `// countProduct :: [Number] -> Number
const countProduct = (sizes) => 0

// countSum :: [Number] -> Number
const countSum = (sizes) => 0

// sizeOf :: { kind, parts } -> Number
// { kind: 'product', parts: [2, 3] }  ->  6
// { kind: 'sum', parts: [2, 3] }      ->  5
const sizeOf = (type) => 0
`,
      solution: `// countProduct :: [Number] -> Number
const countProduct = (sizes) => sizes.reduce((a, b) => a * b, 1)

// countSum :: [Number] -> Number
const countSum = (sizes) => sizes.reduce((a, b) => a + b, 0)

// sizeOf :: { kind, parts } -> Number
// { kind: 'product', parts: [2, 3] }  ->  6
// { kind: 'sum', parts: [2, 3] }      ->  5
const sizeOf = (type) =>
  type.kind === 'product' ? countProduct(type.parts) : countSum(type.parts)
`,
      broken: [
        `const countProduct = (sizes) => sizes.reduce((a, b) => a * b, 0)
const countSum = (sizes) => sizes.reduce((a, b) => a + b, 0)
const sizeOf = (type) =>
  type.kind === 'product' ? countProduct(type.parts) : countSum(type.parts)
`,
        `const countProduct = (sizes) => sizes.reduce((a, b) => a * b, 1)
const countSum = (sizes) => sizes.reduce((a, b) => a + b, 1)
const sizeOf = (type) =>
  type.kind === 'product' ? countProduct(type.parts) : countSum(type.parts)
`,
        `const countProduct = (sizes) => sizes.reduce((a, b) => a + b, 0)
const countSum = (sizes) => sizes.reduce((a, b) => a * b, 1)
const sizeOf = (type) =>
  type.kind === 'product' ? countProduct(type.parts) : countSum(type.parts)
`,
        `const countProduct = (sizes) => sizes.reduce((a, b) => a * b, 1)
const countSum = (sizes) => sizes.reduce((a, b) => a + b, 0)
const sizeOf = (type) => countProduct(type.parts)
`,
      ],
      checks: (T, exp) => {
        const { countProduct, countSum, sizeOf } = exp;

        T.check('A product of a boolean and a three multiplies', () => {
          const r = countProduct([2, 3]);
          return r === 6 || `countProduct([2, 3]) gave ${T.fmt(r)}. Holding both at once means every pairing is a distinct value.`;
        });

        T.check('A sum of a boolean and a three adds', () => {
          const r = countSum([2, 3]);
          return r === 5 || `countSum([2, 3]) gave ${T.fmt(r)}. Holding exactly one of them means the possibilities pile up rather than combine.`;
        });

        T.check('A product of no fields has one value', () => {
          const r = countProduct([]);
          return (
            r === 1 ||
            `countProduct([]) gave ${T.fmt(r)}, and it should be 1. There is exactly one way to hold nothing, which is why the empty record is a real type with a real value in it.`
          );
        });

        T.check('A sum of no cases has none', () => {
          const r = countSum([]);
          return (
            r === 0 ||
            `countSum([]) gave ${T.fmt(r)}, and it should be 0. A choice between nothing is a type you cannot produce a value of at all.`
          );
        });

        T.check('A single part gives itself back, either way', () => {
          const a = countProduct([7]);
          const b = countSum([7]);
          return (a === 7 && b === 7) || `One part of size 7 gave ${T.fmt(a)} as a product and ${T.fmt(b)} as a sum.`;
        });

        T.check('A zero-sized field wipes out a product', () => {
          const r = countProduct([3, 0, 5]);
          return r === 0 || `countProduct([3, 0, 5]) gave ${T.fmt(r)}. If one field has no values, the whole record has none.`;
        });

        T.check('sizeOf reads the kind', () => {
          const p = sizeOf({ kind: 'product', parts: [2, 3] });
          const s = sizeOf({ kind: 'sum', parts: [2, 3] });
          return (p === 6 && s === 5) || `The same parts gave ${T.fmt(p)} as a product and ${T.fmt(s)} as a sum.`;
        });

        T.law('A product is never smaller than a sum once every part has values', 60, (G) => {
          const parts = [G.nat() + 1, G.nat() + 1, G.nat() + 1];
          const p = sizeOf({ kind: 'product', parts });
          const s = sizeOf({ kind: 'sum', parts });
          return p >= s || `With parts ${T.fmt(parts)} the product came to ${T.fmt(p)} and the sum to ${T.fmt(s)}.`;
        });
      },
    },
  ],
};
