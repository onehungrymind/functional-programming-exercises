import type { ExerciseSet } from '@fpx/engine/types';

export const predicate: ExerciseSet = {
  termId: 'predicate',
  rubric: [
    {
      id: 'what-it-is',
      statement: 'Knows a predicate answers true or false about one value, and that answering anything else breaks the contract.',
    },
    {
      id: 'combinators',
      statement:
        'Can write combinators that build a bigger predicate from smaller ones, and knows they return predicates so they keep composing.',
    },
    {
      id: 'compose-to-spec',
      statement: 'Can turn a rule stated in English into a composition of named predicates, with the grouping right.',
    },
  ],
  notes: `A predicate is a function from one value to a boolean: \`a -> Boolean\`. It gets a name because
it is the shape \`filter\`, \`find\`, \`every\`, and \`some\` all expect.

A combinator returns a **predicate**, not an answer. That is what lets the pieces nest:

\`\`\`js
const both   = (f, g) => (x) => f(x) && g(x)
const either = (f, g) => (x) => f(x) || g(x)
const not    = (f) => (x) => !f(x)

const isPositive = (n) => n > 0
const isEven = (n) => n % 2 === 0

both(isPositive, isEven)(4)    // true
both(isPositive, isEven)(3)    // false
not(isPositive)(-1)            // true
\`\`\`

Answer true or false, not truthy or falsy. \`&\` and \`|\` are bitwise and hand back numbers:

\`\`\`js
const both = (f, g) => (x) => f(x) & g(x)
both(isPositive, isEven)(4)              // 1
both(isPositive, isEven)(4) === true     // false, which will bite someone
\`\`\`

Grouping is where English is ambiguous and code is not. "In stock, and either cheap or on
sale":

\`\`\`js
const wanted = both(inStock, either(isCheap, isOnSale))
wanted({ stock: 0, price: 1, sale: true })   // false, correct

// Reads the same in prose, lets through an out-of-stock item on sale
const wanted = either(both(inStock, isCheap), isOnSale)
wanted({ stock: 0, price: 1, sale: true })   // true, wrong
\`\`\`

They obey De Morgan, which is a useful check on your own implementation:

\`\`\`js
not(both(f, g))            // the same predicate as
either(not(f), not(g))     // this one
\`\`\`

If those two ever disagree, one of your and/or is the wrong way round.`,
  rungs: [
    {
      id: 'implement',
      covers: ['what-it-is', 'combinators'],
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
      covers: ['compose-to-spec', 'combinators'],
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

    {
      id: 'combine',
      kind: 'code',
      role: 'apply',
      covers: ['what-it-is', 'compose-to-spec'],
      title: "Combine predicates into a spec",
      prompt:
        "A predicate is a function to a boolean, which is what makes them combinable. Write `and`, `or` and `not`, then build `wanted` out of them without writing a single new condition.",
      hints: [
        "Each one takes predicates and returns a predicate, so the result can be combined again.",
        "`and` is true when both are. Use the pieces rather than reaching into the objects.",
        "`wanted` is in stock and either cheap or on sale. Build it from the three combinators.",
      ],
      exports: ['and', 'or', 'not', 'wanted'],
      starter: `const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 10
const isOnSale = (item) => item.sale === true

// and :: ((a -> Boolean), (a -> Boolean)) -> (a -> Boolean)
const and = (p, q) => p

// or :: ((a -> Boolean), (a -> Boolean)) -> (a -> Boolean)
const or = (p, q) => p

// not :: (a -> Boolean) -> (a -> Boolean)
const not = (p) => p

// wanted :: Item -> Boolean   in stock, and cheap or on sale
const wanted = (item) => false
`,
      solution: `const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 10
const isOnSale = (item) => item.sale === true

// and :: ((a -> Boolean), (a -> Boolean)) -> (a -> Boolean)
const and = (p, q) => (x) => p(x) && q(x)

// or :: ((a -> Boolean), (a -> Boolean)) -> (a -> Boolean)
const or = (p, q) => (x) => p(x) || q(x)

// not :: (a -> Boolean) -> (a -> Boolean)
const not = (p) => (x) => !p(x)

// wanted :: Item -> Boolean   in stock, and cheap or on sale
const wanted = and(inStock, or(isCheap, isOnSale))
`,
      broken: [
        `const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 10
const isOnSale = (item) => item.sale === true
const and = (p, q) => (x) => p(x) && q(x)
const or = (p, q) => (x) => p(x) || q(x)
const not = (p) => (x) => !p(x)
const wanted = or(inStock, and(isCheap, isOnSale))
`,
        `const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 10
const isOnSale = (item) => item.sale === true
const and = (p, q) => (x) => p(x) || q(x)
const or = (p, q) => (x) => p(x) || q(x)
const not = (p) => (x) => !p(x)
const wanted = and(inStock, or(isCheap, isOnSale))
`,
        `const inStock = (item) => item.stock > 0
const isCheap = (item) => item.price < 10
const isOnSale = (item) => item.sale === true
const and = (p, q) => (x) => p(x) && q(x)
const or = (p, q) => (x) => p(x) || q(x)
const not = (p) => (x) => p(x)
const wanted = and(inStock, or(isCheap, isOnSale))
`,
      ],
      checks: (T, exp) => {
        const { and, or, not, wanted } = exp;
        const gt = (n: number) => (x: number) => x > n;
        const lt = (n: number) => (x: number) => x < n;

        T.check('and is true only when both are', () => {
          const p = and(gt(0), lt(10));
          const got = [p(5), p(-1), p(20)];
          return T.eq(got, [true, false, false]) || `It gave ${T.fmt(got)} for 5, -1 and 20.`;
        });

        T.check('or is true when either is', () => {
          const p = or(lt(0), gt(10));
          const got = [p(-1), p(20), p(5)];
          return T.eq(got, [true, true, false]) || `It gave ${T.fmt(got)}.`;
        });

        T.check('not flips the answer', () => {
          const p = not(gt(0));
          return (p(-1) === true && p(1) === false) || `not(gt(0)) gave ${T.fmt(p(-1))} and ${T.fmt(p(1))}.`;
        });

        T.check('The result is a predicate, so it combines again', () => {
          const p = and(and(gt(0), lt(10)), not(gt(5)));
          return (p(3) === true && p(7) === false) || `Nesting them gave ${T.fmt(p(3))} and ${T.fmt(p(7))}.`;
        });

        T.check('wanted needs the item in stock', () => {
          const r = wanted({ stock: 0, price: 1, sale: true });
          return r === false || `An item out of stock but cheap and on sale was reported as ${T.fmt(r)}. Stock is required, not one option among three.`;
        });

        T.check('wanted accepts cheap, and accepts on sale', () => {
          const cheap = wanted({ stock: 5, price: 1, sale: false });
          const onSale = wanted({ stock: 5, price: 100, sale: true });
          return (cheap === true && onSale === true) || `Cheap gave ${T.fmt(cheap)} and on sale gave ${T.fmt(onSale)}.`;
        });

        T.check('wanted rejects expensive and not on sale', () => {
          const r = wanted({ stock: 5, price: 100, sale: false });
          return r === false || `In stock but neither cheap nor on sale was reported as ${T.fmt(r)}.`;
        });

        T.check('wanted was built from the combinators', () => {
          return T.shape.isPointFree('wanted');
        });
      },
    },
  ],
};
