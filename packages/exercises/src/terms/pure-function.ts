import type { ExerciseSet } from '@fpx/engine/types';

export const pureFunction: ExerciseSet = {
  termId: 'pure-function',
  rubric: [
    {
      id: 'two-requirements',
      statement:
        'Can state the two requirements separately: the output depends on the inputs alone, and nothing observable changes.',
    },
    {
      id: 'spot-the-breach',
      statement: 'Given an impure function, can say which of the two it breaks, and name the specific line that breaks it.',
    },
    {
      id: 'purify',
      statement:
        'Can purify a function by taking what it read as an argument and returning a new value instead of editing the one it was given.',
    },
    {
      id: 'shallow-copy-trap',
      statement:
        'Knows that copying the top level of a structure is not enough, and can spot a copy that still shares a nested reference.',
    },
  ],
  notes: `Two requirements, and it pays to keep them apart because code usually breaks one and not the
other.

**The output depends on the inputs alone.** The move is to take what it read as an argument:

\`\`\`js
const isExpired = (token) => token.expiresAt < Date.now()
isExpired(t)   // true today, false yesterday. Same token.

const isExpired = (token, now) => token.expiresAt < now
\`\`\`

The impurity does not vanish, it moves to the caller, and keeps moving up until it reaches
somewhere you are content for it to live. That is the whole game: not eliminating effects, but
pushing them to the edge.

**Nothing observable changes.** The move is to build and return rather than edit in place:

\`\`\`js
const addItem = (cart, item) => {
  cart.items.push(item)        // the caller's cart just changed
  return cart
}

const addItem = (cart, item) => ({
  ...cart,
  items: [...cart.items, item]
})
\`\`\`

The trap here is depth. Spreading copies the top level only:

\`\`\`js
const addItem = (cart, item) => {
  const next = { ...cart }
  next.items.push(item)        // next.items IS cart.items
  return next
}

const before = { items: [] }
const after = addItem(before, 'x')
before.items                   // ['x']   the original changed anyway
after !== before               // true, which is why this passes a careless test
\`\`\`

Tests that only look at the return value wave that through. Tests that freeze the input do not,
which is why the checks here freeze:

\`\`\`js
const frozen = Object.freeze({ items: Object.freeze([]) })
addItem(frozen, 'x')           // TypeError in strict mode
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['two-requirements', 'spot-the-breach'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which one is pure?',
      prompt:
        'A pure function depends only on its inputs and changes nothing outside itself. Pick the pure one.',
      options: [
        {
          code: 'let greeting\nconst greet = (name) => {\n  greeting = `Hi, ${name}`\n}',
          correct: false,
          why: 'Writes to greeting, which lives outside the function.',
        },
        {
          code: 'const greet = () => `Hi, ${window.name}`',
          correct: false,
          why: 'Reads window.name, so the same call can return different results.',
        },
        {
          code: 'const greet = (name) => `Hi, ${name}`',
          correct: true,
          why: 'The output is determined by name alone and nothing else is touched.',
        },
        {
          code: 'const greet = (name) => {\n  console.log(name)\n  return `Hi, ${name}`\n}',
          correct: false,
          why: 'Logging is a side effect, even though the return value is predictable.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['purify', 'shallow-copy-trap', 'two-requirements'],
      kind: 'code',
      role: 'implement',
      title: 'Purify addItem',
      prompt:
        'This addItem mutates the cart and reads the clock. Make it pure: return a new cart, leave the input alone, and take the timestamp as a third argument.',
      hints: [
        'Spread the old cart into a new object rather than writing into it.',
        '`[...cart.items, item]` builds a new list. `cart.items.push(item)` changes the old one.',
        'The `now` parameter is there so the function never has to ask the clock itself.',
      ],
      exports: ['addItem'],
      starter: `// addItem :: (Cart, Item, Number) -> Cart
const addItem = (cart, item, now) => {
  cart.items.push(item)
  cart.updatedAt = Date.now()
  return cart
}
`,
      solution: `// addItem :: (Cart, Item, Number) -> Cart
const addItem = (cart, item, now) => ({
  ...cart,
  items: [...cart.items, item],
  updatedAt: now
})
`,
      broken: [
        // The starter itself: mutates and reads the clock.
        `const addItem = (cart, item, now) => {
  cart.items.push(item)
  cart.updatedAt = Date.now()
  return cart
}
`,
        // Copies the cart but shares the items array, so the original still changes.
        `const addItem = (cart, item, now) => {
  const next = { ...cart, updatedAt: now }
  next.items.push(item)
  return next
}
`,
        // Pure in shape, but still reaching for the clock.
        `const addItem = (cart, item, now) => ({
  ...cart,
  items: [...cart.items, item],
  updatedAt: Date.now()
})
`,
      ],
      checks: (T, exp) => {
        type Item = { sku: string; qty: number };
        type Cart = { id: string; items: Item[]; updatedAt: number };
        const addItem = exp.addItem as (cart: Cart, item: Item, now: number) => Cart;
        const base = (): Cart => ({ id: 'c1', items: [{ sku: 'a', qty: 1 }], updatedAt: 0 });

        T.check('Adds the item', () => {
          const r = addItem(base(), { sku: 'b', qty: 2 }, 100);
          return (
            (r && T.eq(r.items, [{ sku: 'a', qty: 1 }, { sku: 'b', qty: 2 }])) ||
            `items were ${T.fmt(r && r.items)}`
          );
        });

        T.check('Leaves the input cart untouched', () => {
          const c = T.freeze(base());
          addItem(c, { sku: 'b', qty: 2 }, 100);
          return T.eq(c, base()) || 'The cart you were handed changed. A pure function builds a new one.';
        });

        T.check('Returns a new cart object', () => {
          const c = base();
          const r = addItem(c, { sku: 'b', qty: 2 }, 100);
          return r !== c || 'You returned the same object you were given.';
        });

        T.check('Uses the timestamp you pass in', () => {
          const r = addItem(base(), { sku: 'b', qty: 2 }, 12345);
          return (r && r.updatedAt === 12345) || `updatedAt was ${T.fmt(r && r.updatedAt)}, not the 12345 that was passed in.`;
        });

        T.check('Calling twice with the same cart gives the same output', () => {
          const c = base();
          const r1 = T.clone(addItem(c, { sku: 'b', qty: 2 }, 7));
          const r2 = T.clone(addItem(c, { sku: 'b', qty: 2 }, 7));
          return T.eq(r1, r2) || `First call: ${T.fmt(r1)}\nSecond call: ${T.fmt(r2)}`;
        });

        T.check('Never reads the clock or random numbers', () => {
          T.effects.length = 0;
          addItem(base(), { sku: 'b', qty: 2 }, 1);
          return T.effects.length === 0 || `Called ${[...new Set(T.effects)].join(', ')}. Everything a pure function needs arrives as an argument.`;
        });
      },
    },

    {
      id: 'purify',
      kind: 'code',
      role: 'apply',
      covers: ['spot-the-breach', 'purify', 'shallow-copy-trap'],
      title: "Purify three functions",
      prompt:
        "Each of these breaks one of the two requirements. Rewrite each so it returns the same output for the same input and touches nothing outside itself. `addTag` has the trap: its object is nested.",
      hints: [
        "`total` is reading something that is not an argument. Hand it in instead.",
        "`addItem` writes into the array it was given. Build a new one.",
        "A spread copies one level. `post.meta` is still the same object after `{ ...post }`, so writing to it writes to the original.",
      ],
      exports: ['total', 'addItem', 'addTag'],
      starter: `let taxRate = 0.2

// total :: [Number] -> Number
const total = (prices) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)

// addItem :: ([a], a) -> [a]
const addItem = (items, item) => {
  items.push(item)
  return items
}

// addTag :: (Post, String) -> Post
const addTag = (post, tag) => {
  const next = { ...post }
  next.meta.tags.push(tag)
  return next
}
`,
      solution: `// total :: ([Number], Number) -> Number
const total = (prices, taxRate) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)

// addItem :: ([a], a) -> [a]
const addItem = (items, item) => [...items, item]

// addTag :: (Post, String) -> Post
const addTag = (post, tag) => ({
  ...post,
  meta: { ...post.meta, tags: [...post.meta.tags, tag] }
})
`,
      broken: [
        `let taxRate = 0.2
const total = (prices) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)
const addItem = (items, item) => [...items, item]
const addTag = (post, tag) => ({
  ...post,
  meta: { ...post.meta, tags: [...post.meta.tags, tag] }
})
`,
        `const total = (prices, taxRate) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)
const addItem = (items, item) => {
  items.push(item)
  return items
}
const addTag = (post, tag) => ({
  ...post,
  meta: { ...post.meta, tags: [...post.meta.tags, tag] }
})
`,
        `const total = (prices, taxRate) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)
const addItem = (items, item) => [...items, item]
const addTag = (post, tag) => {
  const next = { ...post }
  next.meta.tags = [...next.meta.tags, tag]
  return next
}
`,
        `const total = (prices, taxRate) => prices.reduce((a, b) => a + b, 0) * (1 + taxRate)
const addItem = (items, item) => [...items, item]
const addTag = (post, tag) => {
  const next = { ...post, meta: { ...post.meta } }
  next.meta.tags.push(tag)
  return next
}
`,
      ],
      checks: (T, exp) => {
        const { total, addItem, addTag } = exp;

        T.check('total takes the rate rather than reaching for it', () => {
          return (
            total.length >= 2 ||
            `total takes ${total.length} argument${total.length === 1 ? '' : 's'}. Anything it depends on has to arrive as one, or the same list can give two answers.`
          );
        });

        T.check('total computes with the rate it was given', () => {
          const r = total([100, 50], 0.1);
          return Math.abs(r - 165) < 1e-9 || `total([100, 50], 0.1) gave ${T.fmt(r)}, expected 165.`;
        });

        T.check('Changing the rate changes the answer', () => {
          const a = total([100], 0);
          const b = total([100], 0.5);
          return (a === 100 && b === 150) || `A rate of 0 gave ${T.fmt(a)} and a rate of 0.5 gave ${T.fmt(b)}.`;
        });

        T.check('addItem leaves the list it was handed alone', () => {
          const items = T.freeze([1, 2]);
          const r = addItem(items, 3);
          if (!T.eq(r, [1, 2, 3])) return `addItem([1, 2], 3) gave ${T.fmt(r)}.`;
          return items.length === 2 || `The original list is now ${T.fmt(items)}.`;
        });

        T.check('addTag returns a post with the tag on it', () => {
          const post = { title: 'x', meta: { tags: ['a'], views: 1 } };
          const r = addTag(post, 'b');
          return T.eq(r.meta.tags, ['a', 'b']) || `Adding 'b' gave tags ${T.fmt(r.meta.tags)}.`;
        });

        T.check('The nested object survives untouched', () => {
          const post = { title: 'x', meta: { tags: ['a'], views: 1 } };
          const before = post.meta.tags;
          addTag(post, 'b');
          return (
            (post.meta.tags === before && T.eq(post.meta.tags, ['a'])) ||
            `The original post now reads ${T.fmt(post.meta.tags)}. A spread copies one level, so post.meta is still shared until you copy that too.`
          );
        });

        T.check('The nested object is a new one, not the same one', () => {
          const post = { title: 'x', meta: { tags: ['a'], views: 1 } };
          const r = addTag(post, 'b');
          return r.meta !== post.meta || 'The result shares its `meta` with the original, so writing to one writes to both.';
        });

        T.check('The rest of the post comes through', () => {
          const post = { title: 'x', meta: { tags: [], views: 7 } };
          const r = addTag(post, 'b');
          return (r.title === 'x' && r.meta.views === 7) || `The result lost something: ${T.fmt(r)}.`;
        });
      },
    },
  ],
};
