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
      teaches: ['edge', 'separate'],
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

    {
      id: 'reads',
      kind: 'code',
      role: 'apply',
      covers: ['reads-count-too', 'separate', 'push-to-edge'],
      title: "Reading is an effect too",
      prompt:
        "`greeting` reaches for the clock and the dice. Split it: `greetingPure` takes everything it needs and computes, `greetingIO` does the reaching and calls it. Nothing may change about what gets produced.",
      hints: [
        "Reading the clock is an effect. So is `Math.random()`. Neither writes anything, and both make the same input give different answers.",
        "Whatever the pure half needs, hand it in as an argument. Hour and roll.",
        "The effectful half should be almost nothing: gather, then delegate.",
      ],
      exports: ['greetingPure', 'greetingIO'],
      starter: `// greeting :: String -> String   as it stands today
const greeting = (name) => {
  const hour = new Date(Date.now()).getUTCHours()
  const part = hour < 12 ? 'morning' : 'evening'
  const lucky = Math.random() < 0.5 ? '!' : '.'
  return 'good ' + part + ', ' + name + lucky
}

// greetingPure :: (Number, Number, String) -> String
const greetingPure = (hour, roll, name) => ''

// greetingIO :: String -> String
const greetingIO = (name) => ''
`,
      solution: `// greetingPure :: (Number, Number, String) -> String
const greetingPure = (hour, roll, name) => {
  const part = hour < 12 ? 'morning' : 'evening'
  const lucky = roll < 0.5 ? '!' : '.'
  return 'good ' + part + ', ' + name + lucky
}

// greetingIO :: String -> String
const greetingIO = (name) =>
  greetingPure(new Date(Date.now()).getUTCHours(), Math.random(), name)
`,
      broken: [
        `const greetingPure = (hour, roll, name) => {
  const part = hour < 12 ? 'morning' : 'evening'
  const lucky = Math.random() < 0.5 ? '!' : '.'
  return 'good ' + part + ', ' + name + lucky
}
const greetingIO = (name) => greetingPure(new Date(Date.now()).getUTCHours(), 0, name)
`,
        `const greetingPure = (hour, roll, name) => {
  const part = new Date(Date.now()).getUTCHours() < 12 ? 'morning' : 'evening'
  const lucky = roll < 0.5 ? '!' : '.'
  return 'good ' + part + ', ' + name + lucky
}
const greetingIO = (name) => greetingPure(0, Math.random(), name)
`,
        `const greetingPure = (hour, roll, name) => {
  const part = hour < 12 ? 'morning' : 'evening'
  const lucky = roll < 0.5 ? '!' : '.'
  return 'good ' + part + ', ' + name + lucky
}
const greetingIO = (name) => greetingPure(0, 0, name)
`,
      ],
      checks: (T, exp) => {
        const { greetingPure, greetingIO } = exp;

        T.check('The pure half reaches for nothing', () => {
          T.effects.length = 0;
          greetingPure(9, 0.1, 'ada');
          return (
            T.effects.length === 0 ||
            `It called ${T.effects.join(' and ')}. Reading is an effect: the clock and the dice both make one input give many answers.`
          );
        });

        T.check('The pure half still produces the right string', () => {
          const r = greetingPure(9, 0.1, 'ada');
          return r === 'good morning, ada!' || `greetingPure(9, 0.1, 'ada') gave ${T.fmt(r)}.`;
        });

        T.check('The hour it is handed is the hour it uses', () => {
          const a = greetingPure(9, 0.1, 'x');
          const b = greetingPure(20, 0.1, 'x');
          return (
            a !== b && /morning/.test(a) && /evening/.test(b) ||
            `Hour 9 gave ${T.fmt(a)} and hour 20 gave ${T.fmt(b)}. If they match, the hour is coming from somewhere else.`
          );
        });

        T.check('The roll it is handed is the roll it uses', () => {
          const a = greetingPure(9, 0.1, 'x');
          const b = greetingPure(9, 0.9, 'x');
          return a !== b || `Rolls of 0.1 and 0.9 both gave ${T.fmt(a)}. The roll is coming from somewhere else.`;
        });

        T.law('Same arguments, same answer, every time', 60, (G) => {
          const h = G.nat() % 24;
          const roll = G.nat() / 10;
          const a = greetingPure(h, roll, 'ada');
          const b = greetingPure(h, roll, 'ada');
          return a === b || `Two calls with (${h}, ${roll}) gave ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('The effectful half does the reaching', () => {
          T.effects.length = 0;
          greetingIO('ada');
          const names = T.effects.join(' ');
          return (
            /Date\.now|Math\.random/.test(names) ||
            'greetingIO reached for nothing. The effects are not eliminated, only relocated, and this is where they were relocated to.'
          );
        });

        T.check('The effectful half produces the same shape of answer', () => {
          const r = greetingIO('ada');
          return (
            /^good (morning|evening), ada[!.]$/.test(r) ||
            `greetingIO('ada') gave ${T.fmt(r)}, which does not look like what the original produced.`
          );
        });

        T.check('The effectful half delegates rather than repeating the logic', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const greetingIO'));
          return (
            /greetingPure\s*\(/.test(body) ||
            'greetingIO does not call greetingPure. Splitting means one half computes and the other half acts, not that both do both.'
          );
        });
      },
    },
  ],
};
