import type { ExerciseSet } from '@fpx/engine/types';

export const closure: ExerciseSet = {
  termId: 'closure',
  rubric: [
    {
      id: 'captures-bindings',
      statement:
        'Knows a closure captures the binding, not a copy of the value, so it sees later changes to that variable.',
    },
    {
      id: 'private-state',
      statement: 'Can use a closure to give something state that nothing outside can reach or corrupt.',
    },
    {
      id: 'independent-instances',
      statement: 'Knows each call to the enclosing function makes fresh bindings, so two instances do not share state.',
    },
    {
      id: 'loop-bug',
      statement:
        'Can diagnose and fix the classic loop-capture bug, and can say why `let` fixes it and `var` does not.',
    },
  ],
  notes: `A closure is a function plus the bindings it was created alongside. One word in that sentence
decides whether your code works: **bindings**, not values.

A closure does not photograph the variable, it keeps a reference to it:

\`\`\`js
let n = 1
const report = () => n
n = 2
report()   // 2, not 1
\`\`\`

That is the entire explanation of the loop bug. \`var\` makes **one** binding for the whole
function; \`let\` makes a **fresh** one each iteration:

\`\`\`js
const withVar = []
for (var i = 0; i < 3; i++) withVar.push(() => i)
withVar.map((f) => f())    // [3, 3, 3]  one binding, and it ended at 3

const withLet = []
for (let i = 0; i < 3; i++) withLet.push(() => i)
withLet.map((f) => f())    // [0, 1, 2]  three bindings
\`\`\`

The same mechanism gives you private state. There is genuinely no reference to \`count\` from
outside; it is not a naming convention:

\`\`\`js
const makeCounter = () => {
  let count = 0
  return () => {
    count += 1
    return count
  }
}

const c = makeCounter()
c()          // 1
c()          // 2
c.count      // undefined. There is no way in.
\`\`\`

And because the body runs again on every call, each call makes a **separate** set of bindings:

\`\`\`js
const a = makeCounter()
const b = makeCounter()
a(); a()
b()          // 1, not 3
\`\`\`

Move that one \`let\` outside the factory and you have turned private state into global state,
which still passes a quick test with a single instance:

\`\`\`js
let count = 0                      // now shared by every counter
const makeCounter = () => () => ++count
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['private-state', 'independent-instances'],
      kind: 'code',
      role: 'implement',
      title: 'A counter with private state',
      prompt:
        'A closure keeps the variables its function was created with alive. Use one to give each counter its own count that nothing outside can reach.',
      hints: [
        'Declare the count inside `makeCounter`, not outside it.',
        'Each call to `makeCounter` runs the body again, which creates a fresh variable for that counter to close over.',
      ],
      exports: ['makeCounter'],
      starter: `// makeCounter :: () -> (() -> Number)
const makeCounter = () => {
  // return a function that hands back 1, then 2, then 3...
}
`,
      solution: `// makeCounter :: () -> (() -> Number)
const makeCounter = () => {
  let count = 0
  return () => {
    count += 1
    return count
  }
}
`,
      broken: [
        // The classic: state hoisted out, so every counter shares one number.
        `let count = 0
const makeCounter = () => () => {
  count += 1
  return count
}
`,
        // Reads the variable but never advances it.
        `const makeCounter = () => {
  let count = 0
  return () => count + 1
}
`,
      ],
      checks: (T, exp) => {
        const makeCounter = exp.makeCounter as () => () => number;

        T.check('makeCounter() gives back a function', () => {
          const c = makeCounter();
          return typeof c === 'function' || `Got ${T.fmt(c)}. makeCounter builds a counter and hands it back.`;
        });

        T.check('Counting goes 1, 2, 3', () => {
          const c = makeCounter();
          const got = [c(), c(), c()];
          return T.eq(got, [1, 2, 3]) || `Three calls gave ${T.fmt(got)}. Each call has to advance the count it closed over.`;
        });

        T.check('Two counters do not share a count', () => {
          const a = makeCounter();
          const b = makeCounter();
          a();
          a();
          const got = b();
          return (
            got === 1 ||
            `After advancing the first counter twice, a brand new counter started at ${T.fmt(got)} instead of 1. The count is being shared, which means it lives outside the closure.`
          );
        });

        T.check('The count is not reachable from outside', () => {
          const c = makeCounter() as unknown as Record<string, unknown>;
          const exposed = Object.keys(c).filter((k) => typeof c[k] === 'number');
          return (
            exposed.length === 0 ||
            `The counter exposes ${exposed.join(', ')}. A closure's whole point is that the state is private.`
          );
        });
      },
    },

    {
      id: 'break',
      covers: ['loop-bug', 'captures-bindings'],
      kind: 'code',
      role: 'break',
      title: 'Fix the loop that captured the wrong thing',
      prompt:
        'Every function in this array reports the same number. Change one word so each one closes over its own `i`.',
      hints: ['`var` has one binding for the whole function. `let` gets a fresh binding per iteration.'],
      exports: ['reporters'],
      starter: `// Each reporter should hand back its own index.
const makeReporters = () => {
  const out = []
  for (var i = 0; i < 3; i++) {
    out.push(() => i)
  }
  return out
}

const reporters = makeReporters()
`,
      solution: `const makeReporters = () => {
  const out = []
  for (let i = 0; i < 3; i++) {
    out.push(() => i)
  }
  return out
}

const reporters = makeReporters()
`,
      broken: [
        // The bug itself: one `i` shared by all three closures.
        `const makeReporters = () => {
  const out = []
  for (var i = 0; i < 3; i++) {
    out.push(() => i)
  }
  return out
}

const reporters = makeReporters()
`,
        // Sidesteps closures entirely by baking the values in.
        `const reporters = [0, 1, 2]
`,
      ],
      checks: (T, exp) => {
        const reporters = exp.reporters as (() => number)[];

        T.check('There are three reporters', () => {
          return (Array.isArray(reporters) && reporters.length === 3) || `Got ${T.fmt(reporters)}`;
        });

        T.check('Each one is still a function', () => {
          const bad = reporters.findIndex((r) => typeof r !== 'function');
          return (
            bad === -1 ||
            `Entry ${bad} is ${T.fmt(reporters[bad])}, not a function. The point is what each closure captured, so they have to stay functions.`
          );
        });

        T.check('They report 0, 1, and 2', () => {
          const got = reporters.map((r) => r());
          return (
            T.eq(got, [0, 1, 2]) ||
            `They reported ${T.fmt(got)}. All three sharing one number means all three closed over the same binding.`
          );
        });
      },
    },
  ],
};
