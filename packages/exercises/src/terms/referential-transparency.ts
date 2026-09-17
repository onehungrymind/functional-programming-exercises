import type { ExerciseSet } from '@fpx/engine/types';

export const referentialTransparency: ExerciseSet = {
  termId: 'referential-transparency',
  rubric: [
    {
      id: 'substitution-test',
      statement:
        "Can apply the test: could this call be replaced by its result without changing the program?",
    },
    {
      id: 'what-breaks-it',
      statement:
        "Can name the two things that break it, reading something that varies and changing something observable.",
    },
    {
      id: 'repair',
      statement:
        "Can make a call substitutable by taking what it read as an argument and leaving its arguments alone.",
    },
  ],
  notes: `An expression is referentially transparent when you could **paste its result in its place** and
nothing about the program would change.

\`\`\`js
Math.max(2, 7)              // -> 7. Substitute it; nothing notices.
JSON.stringify({ a: 1 })    // -> '{"a":1}'. Same.

arr.pop()                   // -> 3, but arr is now shorter
                            // pasting 3 in would skip that
prompt('Name?')             // -> 'ada', but it also asked a person
\`\`\`

Two things break it, and they are the same two that make a function impure: **reading something
that varies**, and **changing something observable**.

\`\`\`js
let TAX_RATE = 0.2
const addTax = (price) => price * (1 + TAX_RATE)
addTax(100)          // 120 today
TAX_RATE = 0.25
addTax(100)          // 125. The call and its result are no longer the same thing.

const addTax = (price, rate) => price * (1 + rate)
\`\`\`

\`\`\`js
const firstItem = (xs) => xs.shift()   // removes it
const xs = [1, 2, 3]
firstItem(xs)   // 1
firstItem(xs)   // 2. Same call, different answer.

const firstItem = (xs) => xs[0]
\`\`\`

The reason to care is that it is what lets you reason about code by **substitution**, which is
how you read anything larger than a page: replace a call with what it means, and keep going.
It is also what makes [memoization](#memoization) safe, and what makes a compiler free to cache
or reorder.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['substitution-test', 'what-breaks-it'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which calls can be replaced by their result?',
      prompt:
        'An expression is referentially transparent when swapping it for its value changes nothing about the program. Select every call that qualifies.',
      options: [
        {
          code: 'Math.max(2, 7)   // -> 7',
          correct: true,
          why: 'Always 7, and nothing happens on the way. Substituting it is invisible.',
        },
        {
          code: 'arr.pop()   // -> 3',
          correct: false,
          why: 'Replacing it with 3 would skip the shortening of arr, which the rest of the program can see.',
        },
        {
          code: 'JSON.stringify({ a: 1 })   // -> \'{"a":1}\'',
          correct: true,
          why: 'Same input, same string, no trace left behind.',
        },
        {
          code: 'prompt("Name?")   // -> "ada"',
          correct: false,
          why: 'It asks a person. Replacing it with "ada" removes the asking.',
        },
        {
          code: '[1, 2].concat([3])   // -> [1, 2, 3]',
          correct: true,
          why: 'concat builds a new array and leaves both inputs alone.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['repair', 'what-breaks-it'],
      kind: 'code',
      role: 'implement',
      title: 'Make the calls substitutable',
      prompt:
        'Neither of these can be replaced by its result. Rewrite them so they can: `addTax` should not read a global, and `firstItem` should not disturb the list.',
      hints: [
        'Anything `addTax` needs from outside should arrive as an argument.',
        '`shift` removes the element. Reading index 0 does not.',
      ],
      exports: ['addTax', 'firstItem'],
      starter: `let TAX_RATE = 0.2

// addTax :: (Number, Number) -> Number
const addTax = (price) => price * (1 + TAX_RATE)

// firstItem :: [a] -> a
const firstItem = (xs) => xs.shift()
`,
      solution: `// addTax :: (Number, Number) -> Number
const addTax = (price, rate) => price * (1 + rate)

// firstItem :: [a] -> a
const firstItem = (xs) => xs[0]
`,
      broken: [
        // The starter: one reads a mutable global, the other mutates its argument.
        `let TAX_RATE = 0.2
const addTax = (price) => price * (1 + TAX_RATE)
const firstItem = (xs) => xs.shift()
`,
        // Takes the rate but still falls back to the global when it is not given.
        `let TAX_RATE = 0.2
const addTax = (price, rate = TAX_RATE) => price * (1 + rate)
const firstItem = (xs) => xs[0]
`,
        // Copies the list, but still removes from the copy and returns the wrong thing.
        `const addTax = (price, rate) => price * (1 + rate)
const firstItem = (xs) => [...xs].pop()
`,
      ],
      checks: (T, exp) => {
        const addTax = exp.addTax as (price: number, rate: number) => number;
        const firstItem = exp.firstItem as <A>(xs: A[]) => A;

        T.check('addTax uses the rate it is given', () => {
          const r = addTax(100, 0.1);
          return Math.abs(r - 110) < 1e-9 || `addTax(100, 0.1) gave ${T.fmt(r)}, expected 110.`;
        });

        T.check('addTax takes the rate as an argument, not from outside', () => {
          return (
            addTax.length >= 2 ||
            `addTax declares ${addTax.length} argument(s). Whatever it needs has to arrive as one, or the call cannot be read on its own.`
          );
        });

        T.law('The same arguments always give the same answer', 60, (G) => {
          const p = G.nat();
          const a = addTax(p, 0.2);
          const b = addTax(p, 0.2);
          return a === b || `addTax(${p}, 0.2) gave ${T.fmt(a)} then ${T.fmt(b)}.`;
        });

        T.check('firstItem reads the first element', () => {
          const r = firstItem([10, 20, 30]);
          return r === 10 || `Got ${T.fmt(r)}, expected 10.`;
        });

        T.check('firstItem leaves the list as it found it', () => {
          const xs = T.freeze([10, 20, 30]);
          firstItem(xs as number[]);
          return T.eq(xs, [10, 20, 30]) || 'The list changed. A call you cannot repeat is not substitutable.';
        });

        T.check('Calling firstItem twice gives the same answer', () => {
          const xs = [10, 20, 30];
          const a = firstItem(xs);
          const b = firstItem(xs);
          return a === b || `Two calls on the same list gave ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('Neither function reads the clock or random numbers', () => {
          T.effects.length = 0;
          addTax(10, 0.1);
          firstItem([1]);
          return T.effects.length === 0 || `Called ${[...new Set(T.effects)].join(', ')}.`;
        });
      },
    },

    {
      id: 'the-test',
      kind: 'code',
      role: 'apply',
      covers: ['substitution-test', 'what-breaks-it'],
      title: "Write the substitution test",
      prompt:
        "The test is one question: could this call be replaced by its result without changing the program? Write `substitutable`, which answers it for a given function and arguments, and catches both of the things that break it.",
      hints: [
        "Call it more than once with the same arguments. If the answers differ, the call cannot stand in for its result.",
        "`T.effects` is not available to you here. Use the `watch` helper in the starter: it records reads of the clock and the dice while your callback runs.",
        "The other breach is writing to what it was given. Compare the arguments before and after.",
      ],
      exports: ['substitutable'],
      starter: `// watch :: (() -> a) -> { value, touchedOutside }
// Records whether the clock or the dice were read while fn ran.
const watch = (fn) => {
  const realNow = Date.now
  const realRandom = Math.random
  let touchedOutside = false
  Date.now = () => { touchedOutside = true; return realNow() }
  Math.random = () => { touchedOutside = true; return realRandom() }
  try {
    return { value: fn(), touchedOutside }
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}

const snapshot = (v) => JSON.stringify(v)

// substitutable :: ((...a) -> b, [a]) -> Boolean
const substitutable = (fn, args) => true
`,
      solution: `// watch :: (() -> a) -> { value, touchedOutside }
// Records whether the clock or the dice were read while fn ran.
const watch = (fn) => {
  const realNow = Date.now
  const realRandom = Math.random
  let touchedOutside = false
  Date.now = () => { touchedOutside = true; return realNow() }
  Math.random = () => { touchedOutside = true; return realRandom() }
  try {
    return { value: fn(), touchedOutside }
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}

const snapshot = (v) => JSON.stringify(v)

// substitutable :: ((...a) -> b, [a]) -> Boolean
const substitutable = (fn, args) => {
  const before = snapshot(args)
  const first = watch(() => fn(...args))
  const second = watch(() => fn(...args))
  if (first.touchedOutside || second.touchedOutside) return false
  if (snapshot(args) !== before) return false
  return snapshot(first.value) === snapshot(second.value)
}
`,
      broken: [
        `const watch = (fn) => {
  const realNow = Date.now
  const realRandom = Math.random
  let touchedOutside = false
  Date.now = () => { touchedOutside = true; return realNow() }
  Math.random = () => { touchedOutside = true; return realRandom() }
  try {
    return { value: fn(), touchedOutside }
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}
const snapshot = (v) => JSON.stringify(v)
const substitutable = (fn, args) => {
  const first = watch(() => fn(...args))
  const second = watch(() => fn(...args))
  return snapshot(first.value) === snapshot(second.value)
}
`,
        `const watch = (fn) => {
  const realNow = Date.now
  const realRandom = Math.random
  let touchedOutside = false
  Date.now = () => { touchedOutside = true; return realNow() }
  Math.random = () => { touchedOutside = true; return realRandom() }
  try {
    return { value: fn(), touchedOutside }
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}
const snapshot = (v) => JSON.stringify(v)
const substitutable = (fn, args) => {
  const before = snapshot(args)
  const first = watch(() => fn(...args))
  if (first.touchedOutside) return false
  return snapshot(args) === before
}
`,
        `const watch = (fn) => {
  const realNow = Date.now
  const realRandom = Math.random
  let touchedOutside = false
  Date.now = () => { touchedOutside = true; return realNow() }
  Math.random = () => { touchedOutside = true; return realRandom() }
  try {
    return { value: fn(), touchedOutside }
  } finally {
    Date.now = realNow
    Math.random = realRandom
  }
}
const snapshot = (v) => JSON.stringify(v)
const substitutable = (fn, args) => true
`,
      ],
      checks: (T, exp) => {
        const substitutable = exp.substitutable;

        T.check('A pure call passes the test', () => {
          const r = substitutable((a: number, b: number) => a + b, [1, 2]);
          return r === true || `Adding 1 and 2 was reported as ${T.fmt(r)}. That call can stand in for 3 anywhere.`;
        });

        T.check('A call that reads the clock fails', () => {
          const r = substitutable(() => Date.now(), []);
          return r === false || `A call reading the clock was reported as ${T.fmt(r)}. It gives a different answer each time, so it cannot be replaced by any one of them.`;
        });

        T.check('A call that rolls the dice fails', () => {
          const r = substitutable(() => Math.random(), []);
          return r === false || `A call reading the dice was reported as ${T.fmt(r)}.`;
        });

        T.check('A call that writes to its argument fails', () => {
          const push = (xs: number[]) => {
            xs.push(1);
            return xs.length;
          };
          const r = substitutable(push, [[]]);
          return (
            r === false ||
            `A call that changes what it was given was reported as ${T.fmt(r)}. Replacing it with its result would lose the change, so the program would not be the same.`
          );
        });

        T.check('Reading an argument is fine', () => {
          const r = substitutable((xs: number[]) => xs.length, [[1, 2, 3]]);
          return r === true || `Reading the length was reported as ${T.fmt(r)}.`;
        });

        T.check('Returning a fresh object is fine', () => {
          const r = substitutable((a: number) => ({ a }), [1]);
          return r === true || `Returning a new object was reported as ${T.fmt(r)}. Two equal objects are the same answer.`;
        });

        T.check('A counter that changes on every call fails', () => {
          let n = 0;
          const r = substitutable(() => ++n, []);
          return r === false || `A function with a running count was reported as ${T.fmt(r)}.`;
        });

        T.check('It calls the function more than once', () => {
          let calls = 0;
          substitutable(() => {
            calls += 1;
            return 1;
          }, []);
          return (
            calls >= 2 ||
            `The function was called ${calls} time${calls === 1 ? '' : 's'}. One call cannot tell you whether the answer is stable.`
          );
        });
      },
    },

    {
      id: 'repair-more',
      kind: 'code',
      role: 'apply',
      covers: ['repair', 'what-breaks-it'],
      title: "Repair two calls that are not substitutable",
      prompt:
        "The repair is always the same shape: take what it read as an argument, and leave what it was given alone. Fix both, and keep them doing what they obviously do.",
      hints: [
        "`priceWith` reads a rate from outside itself. Hand it in.",
        "`sortedBy` sorts the array it was given, in place, which is the other breach.",
        "`.sort()` writes into the array. Copy first.",
      ],
      exports: ['priceWith', 'sortedBy'],
      starter: `let vatRate = 0.2

// priceWith :: Number -> Number
const priceWith = (net) => Math.round(net * (1 + vatRate))

// sortedBy :: ([a], (a -> Number)) -> [a]
const sortedBy = (xs, key) => xs.sort((a, b) => key(a) - key(b))
`,
      solution: `// priceWith :: (Number, Number) -> Number
const priceWith = (net, vatRate) => Math.round(net * (1 + vatRate))

// sortedBy :: ([a], (a -> Number)) -> [a]
const sortedBy = (xs, key) => [...xs].sort((a, b) => key(a) - key(b))
`,
      broken: [
        `let vatRate = 0.2
const priceWith = (net) => Math.round(net * (1 + vatRate))
const sortedBy = (xs, key) => [...xs].sort((a, b) => key(a) - key(b))
`,
        `const priceWith = (net, vatRate) => Math.round(net * (1 + vatRate))
const sortedBy = (xs, key) => xs.sort((a, b) => key(a) - key(b))
`,
        `const priceWith = (net, vatRate) => Math.round(net * (1 + vatRate))
const sortedBy = (xs, key) => [...xs]
`,
      ],
      checks: (T, exp) => {
        const { priceWith, sortedBy } = exp;

        T.check('priceWith takes the rate rather than reading it', () => {
          return (
            priceWith.length >= 2 ||
            `priceWith takes ${priceWith.length} argument${priceWith.length === 1 ? '' : 's'}. Whatever it read has to arrive as one, or the same input can give two answers.`
          );
        });

        T.check('It uses the rate it was handed', () => {
          const got = [priceWith(100, 0.2), priceWith(100, 0)];
          return T.eq(got, [120, 100]) || `Rates of 0.2 and 0 gave ${T.fmt(got)}.`;
        });

        T.check('It reaches for nothing', () => {
          T.effects.length = 0;
          priceWith(100, 0.2);
          return T.effects.length === 0 || `It called ${T.effects.join(' and ')}.`;
        });

        T.law('The same arguments always give the same answer', 60, (G) => {
          const n = Math.abs(G.int());
          const a = priceWith(n, 0.2);
          const b = priceWith(n, 0.2);
          return a === b || `Two calls at ${n} gave ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('sortedBy sorts', () => {
          const r = sortedBy([{ n: 3 }, { n: 1 }, { n: 2 }], (o: { n: number }) => o.n);
          return T.eq(r.map((o: { n: number }) => o.n), [1, 2, 3]) || `It gave ${T.fmt(r)}.`;
        });

        T.check('sortedBy leaves its argument in the order it arrived', () => {
          const xs = [{ n: 3 }, { n: 1 }, { n: 2 }];
          sortedBy(xs, (o: { n: number }) => o.n);
          return (
            T.eq(xs.map((o) => o.n), [3, 1, 2]) ||
            `The original is now ${T.fmt(xs.map((o) => o.n))}. sort writes into the array, so it has to be copied first.`
          );
        });

        T.check('It gives back a different array', () => {
          const xs = [{ n: 1 }];
          return sortedBy(xs, (o: { n: number }) => o.n) !== xs || 'It handed the same array back, so the caller and the result are the same object.';
        });

        T.check('Both calls could be replaced by their results', () => {
          const xs = [{ n: 2 }, { n: 1 }];
          const first = JSON.stringify(sortedBy(xs, (o: { n: number }) => o.n));
          const second = JSON.stringify(sortedBy(xs, (o: { n: number }) => o.n));
          return first === second || `Calling it twice on the same list gave ${first} then ${second}.`;
        });
      },
    },
  ],
};
