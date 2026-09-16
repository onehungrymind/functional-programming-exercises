import type { ExerciseSet } from '@fpx/engine/types';

export const productType: ExerciseSet = {
  termId: 'product-type',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'recognize',
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
  ],
};
