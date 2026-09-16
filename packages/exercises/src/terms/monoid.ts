import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const monoid: ExerciseSet = {
  termId: 'monoid',
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'A semigroup with a neutral element',
      prompt:
        'A Monoid is a Semigroup plus an `empty` that changes nothing on either side. Write Sum, Product, All, and Any.',
      hints: [
        'The empty element is whatever leaves the other side alone: 0 for addition, 1 for multiplication.',
        'For All the neutral value is true, because "and true" changes nothing. For Any it is false.',
      ],
      exports: ['Sum', 'Product', 'All', 'Any'],
      starter: `const Sum = (value) => ({ value, concat: (o) => Sum(value + o.value), inspect: () => \`Sum(\${value})\` })
Sum.empty = () => {
}

const Product = (value) => ({ value, concat: (o) => Product(value * o.value), inspect: () => \`Product(\${value})\` })
Product.empty = () => {
}

const All = (value) => ({ value, concat: (o) => All(value && o.value), inspect: () => \`All(\${value})\` })
All.empty = () => {
}

const Any = (value) => ({ value, concat: (o) => Any(value || o.value), inspect: () => \`Any(\${value})\` })
Any.empty = () => {
}
`,
      solution: `const Sum = (value) => ({ value, concat: (o) => Sum(value + o.value), inspect: () => \`Sum(\${value})\` })
Sum.empty = () => Sum(0)

const Product = (value) => ({ value, concat: (o) => Product(value * o.value), inspect: () => \`Product(\${value})\` })
Product.empty = () => Product(1)

const All = (value) => ({ value, concat: (o) => All(value && o.value), inspect: () => \`All(\${value})\` })
All.empty = () => All(true)

const Any = (value) => ({ value, concat: (o) => Any(value || o.value), inspect: () => \`Any(\${value})\` })
Any.empty = () => Any(false)
`,
      broken: [
        // Product's empty is 0, which annihilates instead of leaving things alone.
        `const Sum = (value) => ({ value, concat: (o) => Sum(value + o.value), inspect: () => \`Sum(\${value})\` })
Sum.empty = () => Sum(0)
const Product = (value) => ({ value, concat: (o) => Product(value * o.value), inspect: () => \`Product(\${value})\` })
Product.empty = () => Product(0)
const All = (value) => ({ value, concat: (o) => All(value && o.value), inspect: () => \`All(\${value})\` })
All.empty = () => All(true)
const Any = (value) => ({ value, concat: (o) => Any(value || o.value), inspect: () => \`Any(\${value})\` })
Any.empty = () => Any(false)
`,
        // All and Any have each other's identity.
        `const Sum = (value) => ({ value, concat: (o) => Sum(value + o.value), inspect: () => \`Sum(\${value})\` })
Sum.empty = () => Sum(0)
const Product = (value) => ({ value, concat: (o) => Product(value * o.value), inspect: () => \`Product(\${value})\` })
Product.empty = () => Product(1)
const All = (value) => ({ value, concat: (o) => All(value && o.value), inspect: () => \`All(\${value})\` })
All.empty = () => All(false)
const Any = (value) => ({ value, concat: (o) => Any(value || o.value), inspect: () => \`Any(\${value})\` })
Any.empty = () => Any(true)
`,
      ],
      checks: (T, exp) => {
        const Sum = exp.Sum as any;
        const Product = exp.Product as any;
        const All = exp.All as any;
        const Any = exp.Any as any;

        T.check('Sum.empty() is 0, which adds nothing', () => {
          const r = Sum.empty().concat(Sum(5));
          return r?.value === 5 || `empty().concat(Sum(5)) gave ${T.fmt(r)}, expected Sum(5).`;
        });

        T.check('Product.empty() is 1, not 0', () => {
          const r = Product.empty().concat(Product(5));
          return (
            r?.value === 5 ||
            `empty().concat(Product(5)) gave ${T.fmt(r)}. An empty of 0 would annihilate everything it touched instead of leaving it alone.`
          );
        });

        T.check('All.empty() is true', () => {
          const r = All.empty().concat(All(true));
          return r?.value === true || `Got ${T.fmt(r)}. "and false" would make every combination false.`;
        });

        T.check('Any.empty() is false', () => {
          const r = Any.empty().concat(Any(false));
          return r?.value === false || `Got ${T.fmt(r)}. "or true" would make every combination true.`;
        });

        T.check('Folding an empty list gives the identity', () => {
          const fold = (M: any, xs: any[]) => xs.reduce((a, b) => a.concat(b), M.empty());
          const sum = fold(Sum, []);
          const product = fold(Product, []);
          return (
            sum?.value === 0 && product?.value === 1 ||
            `An empty fold gave ${T.fmt(sum)} and ${T.fmt(product)}. This is what empty is for: a fold with nothing in it still has an answer.`
          );
        });

        laws.monoid(T, { of: Sum, lift: Sum, empty: () => Sum.empty(), runs: 50 });
        laws.monoid(T, { of: Product, lift: Product, empty: () => Product.empty(), runs: 50 });
        laws.monoid(T, { of: All, lift: (n: number) => All(n > 0), empty: () => All.empty(), runs: 40 });
        laws.monoid(T, { of: Any, lift: (n: number) => Any(n > 0), empty: () => Any.empty(), runs: 40 });
      },
    },

    {
      id: 'break',
      kind: 'code',
      role: 'break',
      inverted: true,
      title: 'Subtraction is not even a semigroup',
      prompt:
        'Find concrete numbers that show subtraction fails. Fill in a triple where the grouping changes the answer, and a value that 0 fails to leave alone on the left.',
      hints: [
        'Associativity: try any three numbers where the third is not zero.',
        'Identity: 0 is a right identity, since a - 0 is a. Look at what 0 - a gives you.',
      ],
      exports: ['triple', 'notFixedByZero'],
      starter: `const Diff = (value) => ({
  value,
  concat: (o) => Diff(value - o.value),
  inspect: () => \`Diff(\${value})\`
})

// Three numbers where (a - b) - c differs from a - (b - c):
const triple = [0, 0, 0]

// A number that 0 does NOT leave alone when it is on the left:
const notFixedByZero = 0
`,
      solution: `const Diff = (value) => ({
  value,
  concat: (o) => Diff(value - o.value),
  inspect: () => \`Diff(\${value})\`
})

// (1 - 2) - 3 is -4, but 1 - (2 - 3) is 2.
const triple = [1, 2, 3]

// 5 - 0 is 5, but 0 - 5 is -5. A one-sided identity is not an identity.
const notFixedByZero = 5
`,
      broken: [
        // The starter: zeros show nothing, because every grouping of zeros agrees.
        `const Diff = (value) => ({ value, concat: (o) => Diff(value - o.value), inspect: () => \`Diff(\${value})\` })
const triple = [0, 0, 0]
const notFixedByZero = 0
`,
        // A triple whose third element is zero, where both groupings agree.
        `const Diff = (value) => ({ value, concat: (o) => Diff(value - o.value), inspect: () => \`Diff(\${value})\` })
const triple = [5, 3, 0]
const notFixedByZero = 5
`,
      ],
      checks: (T, exp) => {
        const triple = exp.triple as number[];
        const notFixedByZero = exp.notFixedByZero as number;

        const Diff = (value: number): any => ({
          value,
          concat: (o: any) => Diff(value - o.value),
          inspect: () => `Diff(${value})`,
        });

        T.check('The triple is three numbers', () => {
          return (
            Array.isArray(triple) && triple.length === 3 && triple.every((n) => typeof n === 'number') ||
            `Got ${T.fmt(triple)}, expected three numbers.`
          );
        });

        T.check('The two groupings really do differ', () => {
          const [a, b, c] = triple as [number, number, number];
          const left = Diff(a).concat(Diff(b)).concat(Diff(c)).value;
          const right = Diff(a).concat(Diff(b).concat(Diff(c))).value;
          return (
            left !== right ||
            `With ${a}, ${b} and ${c} both groupings gave ${T.fmt(left)}. Any triple whose last number is zero will agree, so pick one where it is not.`
          );
        });

        T.check('0 is a right identity, so the failure is genuinely one-sided', () => {
          const a = notFixedByZero;
          const right = Diff(a).concat(Diff(0)).value;
          return (
            right === a ||
            `${a} - 0 gave ${T.fmt(right)}, which is not ${a}. Subtraction should still behave; the point is the other side.`
          );
        });

        T.check('0 on the left does not leave the value alone', () => {
          const a = notFixedByZero;
          const left = Diff(0).concat(Diff(a)).value;
          return (
            left !== a ||
            `0 - ${a} gave ${T.fmt(left)}, which is still ${a}. Zero is the one value that survives this, so choose another.`
          );
        });

        T.check('No other candidate is a two-sided identity either', () => {
          const a = notFixedByZero === 0 ? 1 : notFixedByZero;
          for (const e of [0, 1, -1, a, -a]) {
            const rightOk = Diff(a).concat(Diff(e)).value === a;
            const leftOk = Diff(e).concat(Diff(a)).value === a;
            if (rightOk && leftOk) return `${e} worked on both sides, which would make Diff a monoid after all.`;
          }
          return true;
        });
      },
    },
  ],
};
