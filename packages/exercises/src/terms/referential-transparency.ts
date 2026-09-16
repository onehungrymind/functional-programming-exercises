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
  ],
};
