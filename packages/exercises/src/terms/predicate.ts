import type { ExerciseSet } from '@fpx/engine/types';

export const predicate: ExerciseSet = {
  termId: 'predicate',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Combine predicates',
      prompt:
        'A predicate is a function that answers true or false. Write the three combinators that build bigger predicates out of smaller ones.',
      hints: [
        'Each one returns a new predicate, so the shape is `(...preds) => (x) => ...`.',
        '`both` is an and, `either` is an or, `not` flips the answer.',
      ],
      exports: ['both', 'either', 'not'],
      starter: `// both :: (a -> Boolean) -> (a -> Boolean) -> (a -> Boolean)
const both = (f, g) => {
}

// either :: (a -> Boolean) -> (a -> Boolean) -> (a -> Boolean)
const either = (f, g) => {
}

// not :: (a -> Boolean) -> (a -> Boolean)
const not = (f) => {
}
`,
      solution: `// both :: (a -> Boolean) -> (a -> Boolean) -> (a -> Boolean)
const both = (f, g) => (x) => f(x) && g(x)

// either :: (a -> Boolean) -> (a -> Boolean) -> (a -> Boolean)
const either = (f, g) => (x) => f(x) || g(x)

// not :: (a -> Boolean) -> (a -> Boolean)
const not = (f) => (x) => !f(x)
`,
      broken: [
        // and/or swapped.
        `const both = (f, g) => (x) => f(x) || g(x)
const either = (f, g) => (x) => f(x) && g(x)
const not = (f) => (x) => !f(x)
`,
        // Returns the operand rather than a boolean, so falsy values leak through.
        `const both = (f, g) => (x) => f(x) & g(x)
const either = (f, g) => (x) => f(x) | g(x)
const not = (f) => (x) => !f(x)
`,
      ],
      checks: (T, exp) => {
        type P = (x: number) => boolean;
        const both = exp.both as (f: P, g: P) => P;
        const either = exp.either as (f: P, g: P) => P;
        const not = exp.not as (f: P) => P;

        const positive: P = (n) => n > 0;
        const even: P = (n) => n % 2 === 0;

        T.check('Each combinator gives back a function', () => {
          const shapes = { both: both(positive, even), either: either(positive, even), not: not(positive) };
          const bad = Object.entries(shapes).find(([, v]) => typeof v !== 'function');
          return !bad || `${bad[0]} gave ${T.fmt(bad[1])} instead of a predicate.`;
        });

        T.check('both is true only when both are', () => {
          const p = both(positive, even);
          const table: [number, boolean][] = [
            [4, true],
            [3, false],
            [-4, false],
            [-3, false],
          ];
          for (const [n, want] of table) {
            if (p(n) !== want) return `both(positive, even)(${n}) gave ${T.fmt(p(n))}, expected ${want}.`;
          }
          return true;
        });

        T.check('either is true when at least one is', () => {
          const p = either(positive, even);
          const table: [number, boolean][] = [
            [4, true],
            [3, true],
            [-4, true],
            [-3, false],
          ];
          for (const [n, want] of table) {
            if (p(n) !== want) return `either(positive, even)(${n}) gave ${T.fmt(p(n))}, expected ${want}.`;
          }
          return true;
        });

        T.check('not flips the answer', () => {
          const p = not(positive);
          return (p(5) === false && p(-5) === true) || `not(positive) gave ${T.fmt(p(5))} for 5 and ${T.fmt(p(-5))} for -5.`;
        });

        T.check('All three answer with true or false, not with a number', () => {
          const outs = [both(positive, even)(4), either(positive, even)(3), not(positive)(1)];
          const bad = outs.find((o) => typeof o !== 'boolean');
          return (
            bad === undefined ||
            `One of them answered ${T.fmt(bad)}. A predicate answers true or false; bitwise operators hand back numbers.`
          );
        });

        T.law('De Morgan holds: not(both(f, g)) equals either(not(f), not(g))', 60, (G) => {
          const f = G.pred();
          const g = G.pred();
          const n = G.int();
          const left = not(both(f.f, g.f))(n);
          const right = either(not(f.f), not(g.f))(n);
          return (
            left === right ||
            `With f = ${f.name}, g = ${g.name} on ${n}: got ${T.fmt(left)} and ${T.fmt(right)}. If these disagree, one of and/or is the wrong way round.`
          );
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Build a filter from the pieces',
      prompt:
        'Using only the combinators and the predicates given, define `wanted`: in stock, and either cheap or on sale.',
      hints: ['`either(isCheap, isOnSale)` is the inner half. Then require `inStock` alongside it.'],
      exports: ['wanted'],
      starter: `const both = (f, g) => (x) => f(x) && g(x)
const either = (f, g) => (x) => f(x) || g(x)

const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 20
const isOnSale = (item) => item.sale === true

// wanted :: Item -> Boolean
const wanted = null
`,
      solution: `const both = (f, g) => (x) => f(x) && g(x)
const either = (f, g) => (x) => f(x) || g(x)

const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 20
const isOnSale = (item) => item.sale === true

// wanted :: Item -> Boolean
const wanted = both(inStock, either(isCheap, isOnSale))
`,
      broken: [
        // Grouped the wrong way: cheap items out of stock slip through.
        `const both = (f, g) => (x) => f(x) && g(x)
const either = (f, g) => (x) => f(x) || g(x)
const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 20
const isOnSale = (item) => item.sale === true

const wanted = either(both(inStock, isCheap), isOnSale)
`,
        // Requires all three rather than either of the last two.
        `const both = (f, g) => (x) => f(x) && g(x)
const either = (f, g) => (x) => f(x) || g(x)
const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 20
const isOnSale = (item) => item.sale === true

const wanted = both(inStock, both(isCheap, isOnSale))
`,
      ],
      checks: (T, exp) => {
        type Item = { stock: number; price: number; sale: boolean };
        const wanted = exp.wanted as (i: Item) => boolean;
        const item = (stock: number, price: number, sale: boolean): Item => ({ stock, price, sale });

        T.check('wanted is a predicate', () => {
          return typeof wanted === 'function' || `Got ${T.fmt(wanted)}. Compose one out of the combinators above.`;
        });

        T.check('Cheap and in stock is wanted', () => {
          const r = wanted(item(5, 10, false));
          return r === true || `A cheap in-stock item gave ${T.fmt(r)}.`;
        });

        T.check('On sale and in stock is wanted even when it is not cheap', () => {
          const r = wanted(item(5, 500, true));
          return r === true || `An expensive in-stock item on sale gave ${T.fmt(r)}.`;
        });

        T.check('Out of stock is never wanted, however cheap', () => {
          const r = wanted(item(0, 1, true));
          return (
            r === false ||
            `A cheap item on sale with no stock gave ${T.fmt(r)}. Being in stock is required on its own, not as one option among several.`
          );
        });

        T.check('In stock but neither cheap nor on sale is not wanted', () => {
          const r = wanted(item(5, 500, false));
          return r === false || `Got ${T.fmt(r)}. One of cheap or on sale is still required.`;
        });

        T.check('Built from the combinators, not written out by hand', () => T.shape.isPointFree('wanted'));
      },
    },
  ],
};
