import type { ExerciseSet } from '@fpx/engine/types';

export const sideEffects: ExerciseSet = {
  termId: 'side-effects',
  rubric: [
    {
      id: 'reads-count-too',
      statement:
        "Can spot an effect whether it writes or reads, and knows reading the clock is as much an effect as writing to disk.",
    },
    {
      id: 'separate',
      statement:
        "Can split a function that computes and acts into one that computes and one that acts.",
    },
    {
      id: 'push-to-edge',
      statement:
        "Knows effects are not eliminated but relocated, and can say where they should end up.",
    },
  ],
  notes: `A side effect is any interaction with the world outside the function, in **either direction**.
Writing is the obvious half; reading is the half people miss.

\`\`\`js
localStorage.setItem('k', v)   // writes
const now = Date.now()         // reads, and gives a different answer every time
cart.items.push(item)          // writes to something the caller still holds
console.log(total)             // writes, even though it feels harmless
\`\`\`

The move is to separate the calculation from the action, so the interesting part can be tested
without a fixture:

\`\`\`js
const report = (items) => {
  const total = items.reduce((a, i) => a + i.price, 0)
  console.log(\`Total: \${total}\`)      // computing and acting, tangled
  return total
}

const summarize = (items) => \`Total: \${items.reduce((a, i) => a + i.price, 0)}\`
const report = (items) => {
  const line = summarize(items)
  console.log(line)                   // the only line that touches the world
  return line
}
\`\`\`

You are not removing the effect. You are moving it, and it keeps moving up until it reaches
somewhere you are content for it to live, usually one thin layer at the edge:

\`\`\`js
// deep in the code, reading the clock
const isExpired = (token) => token.expiresAt < Date.now()

// at the edge, once
const now = Date.now()
const expired = tokens.filter((t) => isExpired(t, now))
\`\`\`

The test for whether you have succeeded: can the calculation run in a test with no setup and no
mocking?`,
  rungs: [
    {
      id: 'recognize',
      covers: ['reads-count-too'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Spot every effect',
      prompt:
        'A side effect is any interaction with the world outside the function, read or write. Select every line below that has one.',
      options: [
        {
          code: 'const now = Date.now()',
          correct: true,
          why: 'Reading the clock. The same call gives a different answer each time.',
        },
        {
          code: 'const doubled = xs.map(x => x * 2)',
          correct: false,
          why: 'map builds a new array and touches nothing outside.',
        },
        {
          code: 'localStorage.setItem("k", v)',
          correct: true,
          why: 'Writing to storage, which outlives the call.',
        },
        {
          code: 'cart.items.push(item)',
          correct: true,
          why: 'Mutating an object the caller still holds. They will see the change.',
        },
        {
          code: 'const total = items.reduce((a, i) => a + i.price, 0)',
          correct: false,
          why: 'Reads its argument and returns a number. Nothing escapes.',
        },
        {
          code: 'console.log(total)',
          correct: true,
          why: 'Writing to the console is observable from outside, even though it feels harmless.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['separate', 'push-to-edge'],
      kind: 'code',
      role: 'implement',
      title: 'Push the effects to the edge',
      prompt:
        '`report` both computes and prints. Split it: `summarize` works out the answer with no effects, and `report` does the printing.',
      hints: [
        '`summarize` should take the data and return the string. Nothing else.',
        '`report` calls `summarize` and logs the result. All the effect lives there.',
      ],
      exports: ['summarize', 'report'],
      starter: `// Currently mixed together:
//   const report = (items) => {
//     const total = items.reduce((a, i) => a + i.price, 0)
//     console.log(\`Total: \${total}\`)
//     return total
//   }

// summarize :: [Item] -> String
const summarize = (items) => {
}

// report :: [Item] -> String
const report = (items) => {
}
`,
      solution: `// summarize :: [Item] -> String
const summarize = (items) => {
  const total = items.reduce((a, i) => a + i.price, 0)
  return \`Total: \${total}\`
}

// report :: [Item] -> String
const report = (items) => {
  const line = summarize(items)
  console.log(line)
  return line
}
`,
      broken: [
        // The effect is still inside the calculation.
        `const summarize = (items) => {
  const total = items.reduce((a, i) => a + i.price, 0)
  console.log(\`Total: \${total}\`)
  return \`Total: \${total}\`
}
const report = (items) => summarize(items)
`,
        // report stopped reporting.
        `const summarize = (items) => {
  const total = items.reduce((a, i) => a + i.price, 0)
  return \`Total: \${total}\`
}
const report = (items) => summarize(items)
`,
      ],
      checks: (T, exp) => {
        type Item = { price: number };
        const summarize = exp.summarize as (items: Item[]) => string;
        const report = exp.report as (items: Item[]) => string;
        const items: Item[] = [{ price: 3 }, { price: 4 }];

        T.check('summarize works out the total', () => {
          const r = summarize(items);
          return r === 'Total: 7' || `Got ${T.fmt(r)}, expected "Total: 7".`;
        });

        T.check('An empty basket totals zero', () => {
          const r = summarize([]);
          return r === 'Total: 0' || `Got ${T.fmt(r)}`;
        });

        T.check('summarize prints nothing', () => {
          T.logs.length = 0;
          summarize(items);
          return (
            T.logs.length === 0 ||
            `summarize printed ${T.fmt(T.logs)}. The calculation should be able to run without anything happening.`
          );
        });

        T.check('summarize leaves the items alone', () => {
          const frozen = T.freeze([{ price: 3 }, { price: 4 }]);
          summarize(frozen as Item[]);
          return T.eq(frozen, [{ price: 3 }, { price: 4 }]) || 'The items changed.';
        });

        T.check('report does print', () => {
          T.logs.length = 0;
          report(items);
          return (
            T.eq(T.logs, ['"Total: 7"']) ||
            `report printed ${T.fmt(T.logs)}. The effect has to live somewhere, and report is where.`
          );
        });

        T.check('report gives back the same line it printed', () => {
          const r = report(items);
          return r === 'Total: 7' || `Got ${T.fmt(r)}`;
        });
      },
    },
  ],
};
