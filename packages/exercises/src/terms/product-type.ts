import type { ExerciseSet } from '@fpx/engine/types';

export const productType: ExerciseSet = {
  termId: 'product-type',
  rubric: [
    {
      id: 'all-at-once',
      statement:
        "Knows a product holds every field at once, and can count its inhabitants by multiplying.",
    },
    {
      id: 'enumerate',
      statement:
        "Can produce every combination of a product's fields, and knows the count is the product of the field sizes.",
    },
    {
      id: 'zero-field',
      statement:
        "Knows a field with no possible values makes the whole product impossible, and the empty product has exactly one value.",
    },
  ],
  notes: `A product type holds all of its fields at once, and its size is the **product** of their sizes.

\`\`\`js
// { admin: Boolean, role: 'read' | 'write' | 'own' }
2 * 3    // 6 possible values
\`\`\`

Enumerating them is the same arithmetic, done constructively. Extend one field at a time:

\`\`\`js
const inhabitants = (fields) =>
  fields.reduce(
    (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
    [[]]                        // one empty combination to build on
  )

inhabitants([[true, false], ['read', 'write']])
// [[true, 'read'], [true, 'write'], [false, 'read'], [false, 'write']]
\`\`\`

The seed is the interesting part. Starting from \`[]\` rather than \`[[]]\` gives you nothing at
all, because there is no combination to extend:

\`\`\`js
fields.reduce(step, [])     // always []
fields.reduce(step, [[]])   // the empty product, which has exactly one value
\`\`\`

And a field with no values wipes out the whole type, exactly as multiplying by zero does:

\`\`\`js
inhabitants([[1, 2], [], [3]])   // []
\`\`\`

Build a fresh combination each time rather than extending one in place, or every row ends up
being the same array:

\`\`\`js
values.map((v) => { combo.push(v); return combo })   // every row is the same object
values.map((v) => [...combo, v])                     // each row is its own
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['all-at-once'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'How many values does this type have?',
      prompt: 'Given `type Flags = { admin :: Boolean, active :: Boolean, role :: "read" | "write" | "own" }`, how many distinct values can it take?',
      options: [
        { code: '12', correct: true, why: '2 times 2 times 3. A product multiplies the possibilities of its fields.' },
        { code: '7', correct: false, why: 'That would be adding them. Addition is what a sum type does.' },
        { code: '3', correct: false, why: 'That is just the role. The two Booleans vary independently of it.' },
        { code: '2', correct: false, why: 'Only one field accounted for.' },
      ],
    },

    {
      id: 'implement',
      covers: ['enumerate', 'zero-field'],
      kind: 'code',
      role: 'implement',
      title: 'Build every inhabitant',
      prompt:
        'Write `inhabitants`, which takes the possible values of each field and produces every combination. Its length should be the product of the field sizes.',
      hints: [
        'Start with one empty combination and extend it one field at a time.',
        'For each combination so far, and each value of the next field, make a longer combination.',
      ],
      exports: ['inhabitants'],
      starter: `// inhabitants :: [[a]] -> [[a]]
const inhabitants = (fields) => {
  // every way of picking one value from each field
}
`,
      solution: `// inhabitants :: [[a]] -> [[a]]
const inhabitants = (fields) =>
  fields.reduce(
    (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
    [[]]
  )
`,
      broken: [
        // Starts from nothing, so the result is always empty.
        `const inhabitants = (fields) =>
  fields.reduce((acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])), [])
`,
        // Concatenates the fields instead of combining them: this counts a sum, not a product.
        `const inhabitants = (fields) => fields.flatMap((values) => values.map((v) => [v]))
`,
        // Mutates the accumulated combination, so every row ends up the same.
        `const inhabitants = (fields) =>
  fields.reduce(
    (acc, values) =>
      acc.flatMap((combo) =>
        values.map((v) => {
          combo.push(v)
          return combo
        })
      ),
    [[]]
  )
`,
      ],
      checks: (T, exp) => {
        const inhabitants = exp.inhabitants as (fields: unknown[][]) => unknown[][];

        T.check('Two Booleans give four combinations', () => {
          const r = inhabitants([
            [true, false],
            [true, false],
          ]);
          return (
            r.length === 4 ||
            `Got ${r.length} combinations: ${T.fmt(r)}. Two fields of two values each multiply to four.`
          );
        });

        T.check('The combinations are the ones you would write out', () => {
          const r = inhabitants([
            [1, 2],
            ['a', 'b'],
          ]);
          return (
            T.eq(r, [
              [1, 'a'],
              [1, 'b'],
              [2, 'a'],
              [2, 'b'],
            ]) || `Got ${T.fmt(r)}`
          );
        });

        T.check('No field means one combination, the empty one', () => {
          const r = inhabitants([]);
          return (
            T.eq(r, [[]]) ||
            `Got ${T.fmt(r)}. A record with no fields has exactly one value, and it is the empty one.`
          );
        });

        T.check('A field with no values makes the whole type impossible', () => {
          const r = inhabitants([[1, 2], [], [3]]);
          return T.eq(r, []) || `Got ${T.fmt(r)}. If one field cannot be filled, no complete record exists.`;
        });

        T.check('Each combination is its own array', () => {
          const r = inhabitants([
            [1, 2],
            [3, 4],
          ]);
          return (
            new Set(r).size === r.length ||
            'Some rows are the same array object. Build a new combination each time rather than extending one in place.'
          );
        });

        T.law('The count is the product of the field sizes', 40, (G) => {
          const fields = [
            Array.from({ length: G.nat() % 4 }, (_, i) => i),
            Array.from({ length: (G.nat() % 3) + 1 }, (_, i) => i),
          ];
          const want = fields.reduce((a, f) => a * f.length, 1);
          const got = inhabitants(fields).length;
          return got === want || `Fields of sizes ${T.fmt(fields.map((f) => f.length))} gave ${got} combinations, expected ${want}.`;
        });
      },
    },

    {
      id: 'enumerate',
      kind: 'code',
      role: 'apply',
      covers: ['all-at-once', 'enumerate', 'zero-field'],
      title: "List every value a product can take",
      prompt:
        "A product holds all of its fields at once, so its values are every combination. Write `enumerate`, which takes a field name and its possible values for each field and produces every record. Then check the count against multiplying the sizes.",
      hints: [
        "Build it up one field at a time: start with a single empty record and, for each field, replace what you have with one copy per possible value.",
        "`reduce` over the fields, with `[{}]` as the seed.",
        "No fields means one record, the empty one. That is what the multiplication starting at 1 is telling you.",
      ],
      exports: ['enumerate', 'sizeFromFields'],
      starter: `// enumerate :: [[String, [a]]] -> [Object]
// [['size', ['s', 'm']], ['hot', [true, false]]]  ->  4 records
const enumerate = (fields) => []

// sizeFromFields :: [[String, [a]]] -> Number
const sizeFromFields = (fields) => 0
`,
      solution: `// enumerate :: [[String, [a]]] -> [Object]
// [['size', ['s', 'm']], ['hot', [true, false]]]  ->  4 records
const enumerate = (fields) =>
  fields.reduce(
    (acc, [name, values]) => acc.flatMap((row) => values.map((v) => ({ ...row, [name]: v }))),
    [{}]
  )

// sizeFromFields :: [[String, [a]]] -> Number
const sizeFromFields = (fields) => fields.reduce((n, [, values]) => n * values.length, 1)
`,
      broken: [
        `const enumerate = (fields) =>
  fields.reduce(
    (acc, [name, values]) => acc.flatMap((row) => values.map((v) => ({ ...row, [name]: v }))),
    []
  )
const sizeFromFields = (fields) => fields.reduce((n, [, values]) => n * values.length, 1)
`,
        `const enumerate = (fields) =>
  fields.flatMap(([name, values]) => values.map((v) => ({ [name]: v })))
const sizeFromFields = (fields) => fields.reduce((n, [, values]) => n * values.length, 1)
`,
        `const enumerate = (fields) =>
  fields.reduce(
    (acc, [name, values]) => acc.flatMap((row) => values.map((v) => ({ ...row, [name]: v }))),
    [{}]
  )
const sizeFromFields = (fields) => fields.reduce((n, [, values]) => n + values.length, 0)
`,
      ],
      checks: (T, exp) => {
        const { enumerate, sizeFromFields } = exp;
        const fields = () => [['size', ['s', 'm']], ['hot', [true, false]]] as [string, unknown[]][];

        T.check('Two fields of two values give four records', () => {
          const r = enumerate(fields());
          return (Array.isArray(r) && r.length === 4) || `enumerate gave ${T.fmt(r)}, expected four records.`;
        });

        T.check('Every record carries all of the fields', () => {
          const r = enumerate(fields());
          const bad = r.find((row: Record<string, unknown>) => !('size' in row) || !('hot' in row));
          return (
            !bad ||
            `One record came out as ${T.fmt(bad)}. A product holds every field at once, so a record missing one is not a value of the type.`
          );
        });

        T.check('Every combination appears exactly once', () => {
          const r = enumerate(fields()).map((x: unknown) => JSON.stringify(x)).sort();
          const want = [
            { size: 's', hot: true }, { size: 's', hot: false },
            { size: 'm', hot: true }, { size: 'm', hot: false },
          ].map((x) => JSON.stringify(x)).sort();
          return T.eq(r, want) || `The combinations came out as ${T.fmt(r)}.`;
        });

        T.check('No fields gives one record, not none', () => {
          const r = enumerate([]);
          return (
            T.eq(r, [{}]) ||
            `enumerate([]) gave ${T.fmt(r)}, expected [{}]. There is exactly one way to hold nothing, which is why the empty record is a type with a value in it.`
          );
        });

        T.check('Three fields multiply out', () => {
          const r = enumerate([['a', [1, 2, 3]], ['b', [1, 2]], ['c', [1]]]);
          return r.length === 6 || `Sizes 3, 2 and 1 gave ${r.length} records, expected 6.`;
        });

        T.check('A field with no values leaves nothing', () => {
          const r = enumerate([['a', [1, 2]], ['b', []]]);
          return T.eq(r, []) || `A field with no possible values gave ${T.fmt(r)}. If one field cannot be filled, no record can be built.`;
        });

        T.law('The count always matches multiplying the sizes', 60, (G) => {
          const spec = [
            ['a', Array.from({ length: G.nat() % 4 }, (_, i) => i)],
            ['b', Array.from({ length: (G.nat() % 3) + 1 }, (_, i) => i)],
          ] as [string, unknown[]][];
          const listed = enumerate(spec).length;
          const counted = sizeFromFields(spec);
          return listed === counted || `Listing gave ${listed} and counting gave ${counted} for sizes ${T.fmt(spec.map((f) => f[1].length))}.`;
        });
      },
    },
  ],
};
