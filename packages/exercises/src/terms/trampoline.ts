import type { ExerciseSet } from '@fpx/engine/types';

export const trampoline: ExerciseSet = {
  termId: 'trampoline',
  rubric: [
    {
      id: 'why-the-stack-runs-out',
      statement:
        'Can say why deep self-recursion exhausts the stack in JavaScript, and why writing it in tail position does not help.',
    },
    {
      id: 'return-instead-of-call',
      statement: 'Can rewrite a recursive function to return a thunk for the next step instead of calling it.',
    },
    {
      id: 'the-driver',
      statement: 'Can write the loop that keeps invoking thunks until a real value falls out, and knows one unwrapping is not enough.',
    },
  ],
  notes: `Every call gets a stack frame, and the frame stays until the call returns. Deep self-recursion
means thousands of frames waiting on each other:

\`\`\`js
const sumBelow = (n, acc = 0) => (n <= 0 ? acc : sumBelow(n - 1, acc + n))
sumBelow(10)       // 55
sumBelow(1000000)  // RangeError: Maximum call stack size exceeded
\`\`\`

The usual next thought is tail calls: the recursive call is the last thing the function does, so
its frame could be reused. The specification agrees. Engines largely do not implement it, so
**writing your recursion in tail position buys you nothing in practice**. A trampoline exists
because of that gap.

Turn the recursion inside out. The function **returns a description of the next step** and a
plain loop does the calling:

\`\`\`js
const sumBelow = (n, acc = 0) =>
  n <= 0 ? acc : () => sumBelow(n - 1, acc + n)
//              ^^ the arrow is the entire difference

const trampoline = (result) => {
  while (typeof result === 'function') result = result()
  return result
}

trampoline(sumBelow(1000000))   // 500000500000
\`\`\`

Only one frame is ever live, so depth becomes iterations.

Two things to get right. The function must return the thunk, not call through:

\`\`\`js
return sumBelow(n - 1, acc + n)          // still recursion, still a stack
return () => sumBelow(n - 1, acc + n)    // a thunk
\`\`\`

And the driver must **loop**, not unwrap once:

\`\`\`js
const trampoline = (r) => (typeof r === 'function' ? r() : r)
trampoline(sumBelow(3))   // a function, not 6
\`\`\`

The cost is a closure per step, so it is slower than a loop and much faster than a crash. Reach
for it when depth is data-dependent and you cannot bound it.`,
  rungs: [
    {
      id: 'implement',
      covers: ['return-instead-of-call', 'the-driver'],
      kind: 'code',
      role: 'implement',
      title: 'Bounce instead of recursing',
      prompt:
        'A trampoline turns deep recursion into a loop. `sumBelow` should return a thunk instead of calling itself, and `trampoline` should keep calling thunks until a real value falls out.',
      hints: [
        '`trampoline` is a `while` loop: while the result is a function, call it.',
        '`sumBelow` never calls itself directly. It returns `() => sumBelow(...)` and lets the trampoline do the calling.',
      ],
      timeoutMs: 4000,
      exports: ['trampoline', 'sumBelow'],
      starter: `// trampoline :: (a | (() -> a)) -> a
const trampoline = (result) => {
  // keep calling while you are handed a function
}

// sumBelow :: (Number, Number) -> Number | (() -> ...)
const sumBelow = (n, acc = 0) => {
  if (n <= 0) return acc
  return sumBelow(n - 1, acc + n)
}
`,
      solution: `// trampoline :: (a | (() -> a)) -> a
const trampoline = (result) => {
  while (typeof result === 'function') {
    result = result()
  }
  return result
}

// sumBelow :: (Number, Number) -> Number | (() -> ...)
const sumBelow = (n, acc = 0) => {
  if (n <= 0) return acc
  return () => sumBelow(n - 1, acc + n)
}
`,
      broken: [
        // The starter: still ordinary recursion, so a big n blows the stack.
        `const trampoline = (result) => {
  while (typeof result === 'function') result = result()
  return result
}
const sumBelow = (n, acc = 0) => {
  if (n <= 0) return acc
  return sumBelow(n - 1, acc + n)
}
`,
        // Returns thunks, but the trampoline only unwraps one level.
        `const trampoline = (result) => (typeof result === 'function' ? result() : result)
const sumBelow = (n, acc = 0) => {
  if (n <= 0) return acc
  return () => sumBelow(n - 1, acc + n)
}
`,
        // Off by one in the accumulator.
        `const trampoline = (result) => {
  while (typeof result === 'function') result = result()
  return result
}
const sumBelow = (n, acc = 0) => {
  if (n <= 0) return acc
  return () => sumBelow(n - 1, acc + n - 1)
}
`,
      ],
      checks: (T, exp) => {
        const trampoline = exp.trampoline as (r: any) => any;
        const sumBelow = exp.sumBelow as (n: number, acc?: number) => any;

        T.check('trampoline hands a plain value straight back', () => {
          const r = trampoline(42);
          return r === 42 || `Got ${T.fmt(r)}`;
        });

        T.check('trampoline keeps going through nested thunks', () => {
          const r = trampoline(() => () => () => 'landed');
          return (
            r === 'landed' ||
            `Got ${T.fmt(r)}. Unwrapping one level is not enough; keep calling while the result is still a function.`
          );
        });

        T.check('sumBelow adds up the small cases', () => {
          const cases: [number, number][] = [
            [0, 0],
            [1, 1],
            [4, 10],
            [10, 55],
          ];
          for (const [n, want] of cases) {
            const got = trampoline(sumBelow(n));
            if (got !== want) return `sumBelow(${n}) came to ${T.fmt(got)}, expected ${want}.`;
          }
          return true;
        });

        T.check('sumBelow hands back a thunk rather than recursing itself', () => {
          const step = sumBelow(5);
          return (
            typeof step === 'function' ||
            `sumBelow(5) gave ${T.fmt(step)} straight away, so it recursed on its own. Return a thunk and let the trampoline drive.`
          );
        });

        T.check('A million steps run without exhausting the stack', () => {
          try {
            const r = trampoline(sumBelow(1000000));
            return r === 500000500000 || `Got ${T.fmt(r)}, expected 500000500000.`;
          } catch (e) {
            if (e instanceof RangeError) {
              return 'The stack ran out at n = 1000000. Each step is still calling the next one directly instead of returning a thunk.';
            }
            throw e;
          }
        });
      },
    },

    {
      id: 'recognize',
      covers: ['why-the-stack-runs-out'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Why does a trampoline help?',
      prompt: 'Pick the reason it survives a million steps when plain recursion does not.',
      options: [
        {
          code: '// Each step returns to the loop before the next one starts,\n// so only one frame is ever on the stack',
          correct: true,
          why: 'The recursion is turned inside out: the loop drives it, and no frame waits on another.',
        },
        {
          code: '// It makes each step faster',
          correct: false,
          why: 'It is usually a little slower. What it buys is a constant stack, not speed.',
        },
        {
          code: '// JavaScript engines optimize tail calls when you return a function',
          correct: false,
          why: 'Most engines do not implement tail call elimination at all. The trampoline exists precisely because they do not.',
        },
        {
          code: '// It runs the steps in parallel',
          correct: false,
          why: 'Strictly one at a time, in a loop, on one thread.',
        },
      ],
    },
  ],
};
