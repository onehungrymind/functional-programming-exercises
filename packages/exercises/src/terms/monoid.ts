import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const monoid: ExerciseSet = {
  termId: 'monoid',
  rubric: [
    {
      id: 'identity',
      statement:
        "Can supply an empty that is neutral on both sides, and knows the wrong one annihilates instead.",
    },
    {
      id: 'empty-fold',
      statement:
        "Knows the identity is what gives a fold of the empty list an answer.",
    },
    {
      id: 'not-every-semigroup',
      statement:
        "Can show that an operation may have a one-sided identity and no two-sided one.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `Monoid<A> extends Semigroup<A>` and say that the added `empty` is a value of type `A`, not a function, and that is the whole difference.",
    },
  ],
  notes: `A Monoid is a [semigroup](#semigroup) with an \`empty\` that changes nothing on **either** side.

\`\`\`js
Sum.empty()     // Sum(0)     adding nothing changes nothing
Product.empty() // Product(1) multiplying by nothing changes nothing
All.empty()     // All(true)  "and true" changes nothing
Any.empty()     // Any(false) "or false" changes nothing
\`\`\`

The wrong identity annihilates rather than steps aside, which is the mistake to watch for:

\`\`\`js
Product.empty = () => Product(0)
Product.empty().concat(Product(5))   // Product(0). Everything it touches becomes 0.
\`\`\`

The reason to care is folds. \`empty\` is exactly what gives an empty list an answer instead of
an error:

\`\`\`js
const fold = (M, xs) => xs.reduce((a, b) => a.concat(b), M.empty())

fold(Sum, [Sum(1), Sum(2)])   // Sum(3)
fold(Sum, [])                 // Sum(0), not a crash

[].reduce((a, b) => a + b)    // TypeError: Reduce of empty array with no initial value
\`\`\`

Not every semigroup has one. Subtraction has a **one-sided** identity, which is not enough:

\`\`\`js
5 - 0    // 5   right identity holds
0 - 5    // -5  left identity does not
\`\`\`

And no other value works either, so subtraction is a monoid under nothing. It is not even a
semigroup, since it is not associative:

\`\`\`js
(1 - 2) - 3   // -4
1 - (2 - 3)   // 2
\`\`\``,
  typedNotes: `Same track, second lap. The relationship between the two concepts is one word and one field.

\`\`\`ts
interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}
\`\`\`

\`extends\` says it out loud: every monoid is a semigroup, and not the other way round. And look
at what got added. \`empty: A\` is a **value**, not \`empty: () => A\`. There is nothing to
compute, no argument to inspect. It is a constant that the type says belongs to the set.

That single field is what makes folding total:

\`\`\`ts
const fold = <A>(M: Monoid<A>, xs: A[]): A =>
  xs.reduce(M.concat, M.empty)
\`\`\`

\`reduce\` with a seed. Hand it \`[]\` and you get \`M.empty\` back, typed \`A\`, and nothing threw.
With only a semigroup there is no value of type \`A\` to hand \`reduce\`, because \`A\` is a
variable and the interface carries no inhabitant of it. The empty case is not an edge case you
forgot, it is a thing the type could not supply.

\`\`\`ts
const sumMonoid: Monoid<number>  = { empty: 0,     concat: (a, b) => a + b }
const prodMonoid: Monoid<number> = { empty: 1,     concat: (a, b) => a * b }
const allMonoid: Monoid<boolean> = { empty: true,  concat: (a, b) => a && b }
const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a || b }

fold(sumMonoid, [])    // 0
fold(allMonoid, [])    // true
\`\`\`

Every \`empty\` is different and none of them is guessable from the type. \`Monoid<number>\` does
not say which number, and it could not: sum wants 0 and product wants 1, and the compiler has
no opinion about which. What it does insist on is that you supply one.

The law is the part still left to you. \`concat(empty, a)\` and \`concat(a, empty)\` must both be
\`a\`, for every \`a\`, and this typechecks perfectly well:

\`\`\`ts
const wrong: Monoid<number> = { empty: 1, concat: (a, b) => a + b }
\`\`\`

Right shape, wrong constant. The type system got you the field; whether the field is the
identity is a property of values, and that is what the law rung is for.`,
  rungs: [
    {
      id: 'implement',
      covers: ['identity', 'empty-fold'],
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
      covers: ['not-every-semigroup', 'identity'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['identity', 'empty-fold', 'typed-signature'],
      title: "Satisfy Monoid<A> four times",
      prompt:
        "The interface is given. Write `sumMonoid`, `prodMonoid`, `allMonoid` and `anyMonoid`, each with the `empty` that leaves its `concat` alone.",
      hints: [
        "`empty` is a value, not a function. Write the constant.",
        "The right `empty` is the one where `concat(empty, a)` gives `a` back for every `a`. Try it on a couple of numbers before you commit.",
        "0 and 1 are both numbers and only one of them works for each of the two number monoids.",
      ],
      exports: ['sumMonoid', 'prodMonoid', 'allMonoid', 'anyMonoid'],
      starter: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sumMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a + b }

const prodMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a * b }

const allMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a && b }

const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a && b }
`,
      solution: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sumMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a + b }

const prodMonoid: Monoid<number> = { empty: 1, concat: (a, b) => a * b }

const allMonoid: Monoid<boolean> = { empty: true, concat: (a, b) => a && b }

const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a || b }
`,
      broken: [
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sumMonoid: Monoid<number> = { empty: 1, concat: (a, b) => a + b }

const prodMonoid: Monoid<number> = { empty: 1, concat: (a, b) => a * b }

const allMonoid: Monoid<boolean> = { empty: true, concat: (a, b) => a && b }

const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a || b }
`,
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sumMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a + b }

const prodMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a * b }

const allMonoid: Monoid<boolean> = { empty: true, concat: (a, b) => a && b }

const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a || b }
`,
        `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sumMonoid: Monoid<number> = { empty: 0, concat: (a, b) => a + b }

const prodMonoid: Monoid<number> = { empty: 1, concat: (a, b) => a * b }

const allMonoid: Monoid<boolean> = { empty: true, concat: (a, b) => a || b }

const anyMonoid: Monoid<boolean> = { empty: false, concat: (a, b) => a || b }
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
        T.check('The Monoid declaration is still there to satisfy', () => {
          return /interface\s+Monoid/.test(T.src) || 'The Monoid declaration has gone. It is the thing being satisfied.';
        });
        const { sumMonoid, prodMonoid, allMonoid, anyMonoid } = exp;
        const all = [
          ['sum', sumMonoid, [1, 2, 3], 6],
          ['prod', prodMonoid, [2, 3, 4], 24],
          ['all', allMonoid, [true, true], true],
          ['any', anyMonoid, [false, true], true],
        ] as [string, { empty: unknown, concat: (a: unknown, b: unknown) => unknown }, unknown[], unknown][];

        T.check('empty is a value, not a function', () => {
          for (const [name, M] of all) {
            if (typeof M.empty === 'function') return `${name}'s empty is a function. The field is typed \`A\`, so it is the constant itself.`;
          }
          return true;
        });

        T.check('Each concat does what its name says', () => {
          for (const [name, M, xs, want] of all) {
            const got = xs.reduce(M.concat);
            if (!T.eq(got, want)) return `${name} combined ${T.fmt(xs)} into ${T.fmt(got)}, expected ${T.fmt(want)}.`;
          }
          return true;
        });

        T.check('all and any are genuinely different', () => {
          const a = allMonoid.concat(true, false);
          const b = anyMonoid.concat(true, false);
          return a !== b || `Both gave ${T.fmt(a)} on true and false. One is and, the other is or.`;
        });

        T.check('Folding the empty list gives empty back, and does not throw', () => {
          for (const [name, M] of all) {
            const r = [].reduce(M.concat as never, M.empty as never);
            if (!T.eq(r, M.empty)) return `${name} folded [] into ${T.fmt(r)} rather than its empty.`;
          }
          return true;
        });

        T.law('Left identity: concat(empty, a) is a', 80, (G) => {
          for (const [name, M] of all) {
            const a = typeof M.empty === 'boolean' ? G.bool() : G.int();
            const r = M.concat(M.empty, a);
            if (!T.eq(r, a)) return `${name}: concat(${T.fmt(M.empty)}, ${T.fmt(a)}) gave ${T.fmt(r)}. That empty is not the identity for that concat.`;
          }
          return true;
        });

        T.law('Right identity: concat(a, empty) is a', 80, (G) => {
          for (const [name, M] of all) {
            const a = typeof M.empty === 'boolean' ? G.bool() : G.int();
            const r = M.concat(a, M.empty);
            if (!T.eq(r, a)) return `${name}: concat(${T.fmt(a)}, ${T.fmt(M.empty)}) gave ${T.fmt(r)}.`;
          }
          return true;
        });

        T.law('Associativity survives, since a monoid is still a semigroup', 60, (G) => {
          for (const [name, M] of all) {
            const mk = () => (typeof M.empty === 'boolean' ? G.bool() : G.int());
            const a = mk(), b = mk(), c = mk();
            if (!T.eq(M.concat(M.concat(a, b), c), M.concat(a, M.concat(b, c)))) {
              return `${name} is not associative on ${T.fmt([a, b, c])}.`;
            }
          }
          return true;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'not-every-semigroup'],
      title: "The type demands an empty and cannot say which",
      prompt:
        "`Monoid<number>` does not say which number `empty` is, and `wrong` typechecks. Type an array of folding the empty list with each of the three.",
      hints: [
        "Folding nothing gives the seed back, and the seed is `empty`.",
        "Sum wants 0 and product wants 1, and the compiler has no opinion about which.",
        "`wrong` has the right shape and the wrong constant, which is the half still left to you.",
      ],
      context: `interface Semigroup<A> {
  concat: (a: A, b: A) => A
}

interface Monoid<A> extends Semigroup<A> {
  empty: A
}

const sum: Monoid<number> = { empty: 0, concat: (a, b) => a + b }
const product: Monoid<number> = { empty: 1, concat: (a, b) => a * b }
const wrong: Monoid<number> = { empty: 1, concat: (a, b) => a + b }

const fold = <A>(M: Monoid<A>, xs: A[]): A => xs.reduce(M.concat, M.empty)
`,
      placeholder: "[..., ..., ...]",
      expect: [0,1,1],
      solution: "[fold(sum, []), fold(product, []), fold(wrong, [])]",
      broken: ["[0, 1, 0]", "[0, 0, 0]", "[1, 1, 1]"],
    },
  ],
};
