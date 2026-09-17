import type { ExerciseSet } from '@fpx/engine/types';

export const continuation: ExerciseSet = {
  termId: 'continuation',
  rubric: [
    {
      id: 'what-it-is',
      statement:
        "Can identify the continuation in a call: the function that says what happens once the answer exists.",
    },
    {
      id: 'convert',
      statement:
        "Can convert a direct-style function to continuation-passing style, replacing every return with a call.",
    },
    {
      id: 'sequence',
      statement:
        "Can chain two continuation-passing steps so the first feeds the second, calling the outer continuation exactly once.",
    },
  ],
  notes: `In continuation-passing style a function never returns. It takes an extra argument, the
**continuation**, and hands its answer to that instead.

\`\`\`js
const add = (a, b) => a + b                        // direct style
const addCps = (a, b, done) => done(a + b)         // the same thing, inside out

addCps(2, 3, (sum) => console.log(sum))            // 5
//            ^^^^^^^^^^^^^^^^^^^^^^^ the continuation: what happens next
\`\`\`

The conversion is mechanical. Every \`return x\` becomes \`done(x)\`:

\`\`\`js
const half = (n) => {
  if (n % 2) return null
  return n / 2
}

const halfCps = (n, done) => {
  if (n % 2) return done(null)
  return done(n / 2)
}
\`\`\`

Sequencing is where the shape earns its keep. The first step's continuation is the rest of the
program:

\`\`\`js
const addThenSquare = (a, b, done) =>
  addCps(a, b, (sum) => squareCps(sum, done))
//                                    ^^^^ pass it along, do not call it yourself
\`\`\`

Getting that last part wrong is the usual mistake, and it shows up as the continuation running
twice:

\`\`\`js
const addThenSquare = (a, b, done) =>
  addCps(a, b, (sum) => done(squareCps(sum, done)))   // done called twice
\`\`\`

This is the shape callbacks, async/await, and generators all desugar to, and what makes
[algebraic effects](#algebraic-effects) possible: once the rest of the program is a value, you
can choose not to run it, or run it twice.`,
  rungs: [
    {
      id: 'implement',
      covers: ['convert', 'sequence'],
      kind: 'code',
      role: 'implement',
      title: 'Convert to continuation-passing style',
      prompt:
        'In continuation-passing style a function never returns. It takes an extra argument, the continuation, and hands its answer to that instead.',
      hints: [
        'Replace every `return x` with `done(x)`.',
        'When one step feeds another, the first step passes a continuation that does the rest.',
      ],
      exports: ['addCps', 'squareCps', 'addThenSquare'],
      starter: `// Direct style:
//   const add = (a, b) => a + b
//   const square = (n) => n * n

// addCps :: (Number, Number, (Number -> r)) -> r
const addCps = (a, b, done) => {
}

// squareCps :: (Number, (Number -> r)) -> r
const squareCps = (n, done) => {
}

// addThenSquare :: (Number, Number, (Number -> r)) -> r
const addThenSquare = (a, b, done) => {
  // use the two above, without returning anything yourself
}
`,
      solution: `// addCps :: (Number, Number, (Number -> r)) -> r
const addCps = (a, b, done) => done(a + b)

// squareCps :: (Number, (Number -> r)) -> r
const squareCps = (n, done) => done(n * n)

// addThenSquare :: (Number, Number, (Number -> r)) -> r
const addThenSquare = (a, b, done) =>
  addCps(a, b, (sum) => squareCps(sum, done))
`,
      broken: [
        // Returns instead of continuing: direct style wearing a CPS signature.
        `const addCps = (a, b, done) => a + b
const squareCps = (n, done) => n * n
const addThenSquare = (a, b, done) => done(squareCps(addCps(a, b)))
`,
        // Squares before adding.
        `const addCps = (a, b, done) => done(a + b)
const squareCps = (n, done) => done(n * n)
const addThenSquare = (a, b, done) => squareCps(a, (sq) => addCps(sq, b, done))
`,
        // Drops the outer continuation and calls it twice over.
        `const addCps = (a, b, done) => done(a + b)
const squareCps = (n, done) => done(n * n)
const addThenSquare = (a, b, done) => addCps(a, b, (sum) => done(squareCps(sum, done)))
`,
      ],
      checks: (T, exp) => {
        const addCps = exp.addCps as (a: number, b: number, k: (n: number) => any) => any;
        const squareCps = exp.squareCps as (n: number, k: (n: number) => any) => any;
        const addThenSquare = exp.addThenSquare as (a: number, b: number, k: (n: number) => any) => any;

        T.check('addCps hands the sum to the continuation', () => {
          let got: number | undefined;
          addCps(2, 3, (n) => {
            got = n;
          });
          return got === 5 || `The continuation received ${T.fmt(got)}. In CPS the answer arrives through the continuation, not as a return value.`;
        });

        T.check('squareCps hands the square to the continuation', () => {
          let got: number | undefined;
          squareCps(4, (n) => {
            got = n;
          });
          return got === 16 || `The continuation received ${T.fmt(got)}.`;
        });

        T.check('addThenSquare adds first, then squares', () => {
          let got: number | undefined;
          addThenSquare(2, 3, (n) => {
            got = n;
          });
          return got === 25 || `The continuation received ${T.fmt(got)}, expected 25. Add 2 and 3 to get 5, then square it.`;
        });

        T.check('The continuation is called exactly once', () => {
          const spy = T.spyFn((n: number) => n);
          addThenSquare(1, 2, spy);
          return (
            spy.calls.length === 1 ||
            `It was called ${spy.calls.length} times, with ${T.fmt(spy.calls)}. Each step passes the answer on to exactly one continuation.`
          );
        });

        T.check('The continuation decides what happens next', () => {
          let out = '';
          addThenSquare(1, 1, (n) => {
            out = `got ${n}`;
          });
          return out === 'got 4' || `Got ${T.fmt(out)}. Whatever the caller wants to do next lives in the continuation.`;
        });

        T.law('It agrees with the direct-style version everywhere', 60, (G) => {
          const [a, b] = [G.int(), G.int()];
          let got: number | undefined;
          addThenSquare(a, b, (n) => {
            got = n;
          });
          const want = (a + b) * (a + b);
          return got === want || `On (${a}, ${b}) the continuation received ${T.fmt(got)}, expected ${want}.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['what-it-is'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is the continuation?',
      prompt: 'In `addCps(2, 3, (sum) => console.log(sum))`, which part is the continuation?',
      options: [
        {
          code: '(sum) => console.log(sum)',
          correct: true,
          why: 'It is "the rest of the program": what should happen once the answer exists.',
        },
        { code: 'addCps', correct: false, why: 'That is the function taking a continuation, not the continuation itself.' },
        { code: '2 and 3', correct: false, why: 'Ordinary arguments.' },
        {
          code: 'The value 5 that addCps produces',
          correct: false,
          why: 'That is what gets handed to the continuation, not the continuation.',
        },
      ],
    },

    {
      id: 'name-it',
      kind: 'code',
      role: 'apply',
      covers: ['what-it-is', 'convert'],
      title: "Write the continuation down, then intercept one",
      prompt:
        "In `square(add(1, n)) + 10`, the continuation of the `add` call is everything still waiting on its answer. Write that as a function. Then write `intercept`, which wraps a continuation-passing function so you can watch what flows through it.",
      hints: [
        "Ask what happens after `add` produces its answer. Squaring, then adding ten. That is the continuation.",
        "The continuation takes the answer as its argument, so it starts `(x) =>`.",
        "`intercept` gets a continuation-passing function and a spy. It hands the function a continuation of its own making, which calls the spy and then the real one.",
      ],
      exports: ['restOfProgram', 'intercept'],
      starter: `const square = (x) => x * x
// the whole program, for reference
const program = (n) => square(add(1, n)) + 10

// restOfProgram :: Number -> Number
// everything still waiting on the answer to add(1, n)
const restOfProgram = (x) => x

// intercept :: (((a, (b -> c)) -> c), (b -> void)) -> ((a, (b -> c)) -> c)
const intercept = (cpsFn, spy) => (value, k) => cpsFn(value, k)
`,
      solution: `const square = (x) => x * x
// the whole program, for reference
const program = (n) => square(add(1, n)) + 10

// restOfProgram :: Number -> Number
// everything still waiting on the answer to add(1, n)
const restOfProgram = (x) => square(x) + 10

// intercept :: (((a, (b -> c)) -> c), (b -> void)) -> ((a, (b -> c)) -> c)
const intercept = (cpsFn, spy) => (value, k) =>
  cpsFn(value, (answer) => {
    spy(answer)
    return k(answer)
  })
`,
      broken: [
        `const square = (x) => x * x
const restOfProgram = (x) => square(x)
const intercept = (cpsFn, spy) => (value, k) =>
  cpsFn(value, (answer) => {
    spy(answer)
    return k(answer)
  })
`,
        `const square = (x) => x * x
const restOfProgram = (x) => square(x + 10)
const intercept = (cpsFn, spy) => (value, k) =>
  cpsFn(value, (answer) => {
    spy(answer)
    return k(answer)
  })
`,
        `const square = (x) => x * x
const restOfProgram = (x) => square(x) + 10
const intercept = (cpsFn, spy) => (value, k) => {
  spy(value)
  return cpsFn(value, k)
}
`,
        `const square = (x) => x * x
const restOfProgram = (x) => square(x) + 10
const intercept = (cpsFn, spy) => (value, k) =>
  cpsFn(value, (answer) => {
    spy(answer)
  })
`,
      ],
      checks: (T, exp) => {
        const { restOfProgram, intercept } = exp;
        const square = (x: number) => x * x;
        const program = (n: number) => square(1 + n) + 10;

        T.check('The continuation squares, then adds ten', () => {
          const r = restOfProgram(3);
          return r === 19 || `Handed 3, the rest of the program should square it and add ten, giving 19. It gave ${T.fmt(r)}.`;
        });

        T.law('Feeding it the answer to add reproduces the whole program', 60, (G) => {
          const n = G.int();
          const a = restOfProgram(1 + n);
          const b = program(n);
          return (
            a === b ||
            `At n = ${n}: handing the continuation the answer to add(1, n) gave ${T.fmt(a)}, but the program gives ${T.fmt(b)}. The continuation is everything the call was holding up, no more and no less.`
          );
        });

        T.check('It does not do the adding itself', () => {
          const r = restOfProgram(0);
          return r === 10 || `Handed 0 it gave ${T.fmt(r)}, expected 10. The add has already happened by the time the continuation runs.`;
        });

        T.check('intercept still produces the right answer', () => {
          const addCps = (v: number, k: (x: number) => unknown) => k(v + 1);
          const r = intercept(addCps, () => {})(41, (x: number) => x);
          return r === 42 || `Intercepting an increment of 41 gave ${T.fmt(r)}.`;
        });

        T.check('The spy sees the answer, not the argument', () => {
          const addCps = (v: number, k: (x: number) => unknown) => k(v + 1);
          const seen: number[] = [];
          intercept(addCps, (x: number) => seen.push(x))(41, (x: number) => x);
          return (
            T.eq(seen, [42]) ||
            `The spy saw ${T.fmt(seen)}, expected [42]. It goes in the continuation, which is where the answer arrives, not before the call.`
          );
        });

        T.check('The real continuation still runs', () => {
          const addCps = (v: number, k: (x: number) => unknown) => k(v + 1);
          let ran = false;
          intercept(addCps, () => {})(1, () => {
            ran = true;
            return 0;
          });
          return ran || 'The continuation that was passed in never ran. Watching what flows through is not the same as swallowing it.';
        });

        T.check('Whatever the continuation returns comes back out', () => {
          const idCps = (v: number, k: (x: number) => unknown) => k(v);
          const r = intercept(idCps, () => {})(5, (x: number) => 'saw ' + x);
          return r === 'saw 5' || `The result was ${T.fmt(r)}, expected 'saw 5'.`;
        });
      },
    },

    {
      id: 'sequence',
      kind: 'code',
      role: 'apply',
      covers: ['sequence', 'convert'],
      title: "Run a list of continuation-passing steps in order",
      prompt:
        "Chaining two steps is one nesting. Write `seqCps`, which chains as many as you like, feeding each answer into the next and calling the outer continuation once at the end.",
      hints: [
        "Each step is `(value, k) => ...`. Its answer becomes the value handed to the next one.",
        "Work from the end backwards, or recurse on the list. Either way the outer continuation goes last.",
        "With no steps at all the value should reach the continuation untouched.",
      ],
      exports: ['seqCps'],
      starter: `// seqCps :: ([((a, (b -> c)) -> c)], a, (b -> c)) -> c
const seqCps = (steps, value, k) => k(value)
`,
      solution: `// seqCps :: ([((a, (b -> c)) -> c)], a, (b -> c)) -> c
const seqCps = (steps, value, k) => {
  if (steps.length === 0) return k(value)
  const [first, ...rest] = steps
  return first(value, (next) => seqCps(rest, next, k))
}
`,
      broken: [
        `const seqCps = (steps, value, k) => {
  if (steps.length === 0) return k(value)
  const [first, ...rest] = steps
  first(value, (next) => seqCps(rest, next, k))
  return k(value)
}
`,
        `const seqCps = (steps, value, k) => {
  let v = value
  for (const step of steps) step(v, (next) => { v = next })
  return k(v)
}
`,
        `const seqCps = (steps, value, k) => {
  if (steps.length === 0) return k(value)
  const [first, ...rest] = steps
  return first(value, (next) => seqCps(rest, value, k))
}
`,
      ],
      checks: (T, exp) => {
        const seqCps = exp.seqCps;
        const addOne = (n: number, k: (x: number) => unknown) => k(n + 1);
        const double = (n: number, k: (x: number) => unknown) => k(n * 2);
        const stringify = (n: number, k: (x: string) => unknown) => k('n=' + n);

        T.check('No steps hands the value straight on', () => {
          const r = seqCps([], 7, (x: number) => x);
          return r === 7 || `With no steps it gave ${T.fmt(r)}.`;
        });

        T.check('One step runs', () => {
          const r = seqCps([addOne], 1, (x: number) => x);
          return r === 2 || `One step gave ${T.fmt(r)}.`;
        });

        T.check('Each answer feeds the next', () => {
          const r = seqCps([addOne, double], 1, (x: number) => x);
          return r === 4 || `Adding one to 1 then doubling should give 4. It gave ${T.fmt(r)}.`;
        });

        T.check('The order is the list order', () => {
          const r = seqCps([double, addOne], 1, (x: number) => x);
          return r === 3 || `Doubling 1 then adding one should give 3. It gave ${T.fmt(r)}.`;
        });

        T.check('The types can change along the way', () => {
          const r = seqCps([addOne, double, stringify], 1, (x: string) => x + '!');
          return r === 'n=4!' || `It gave ${T.fmt(r)}, expected 'n=4!'.`;
        });

        T.check('The outer continuation runs exactly once', () => {
          let calls = 0;
          seqCps([addOne, double, addOne], 1, (x: number) => {
            calls += 1;
            return x;
          });
          return calls === 1 || `The outer continuation ran ${calls} times, and it should run once, at the end.`;
        });

        T.check('The outer continuation runs last', () => {
          const order: string[] = [];
          const mark = (name: string) => (n: number, k: (x: number) => unknown) => {
            order.push(name);
            return k(n);
          };
          seqCps([mark('a'), mark('b')], 0, (x: number) => {
            order.push('out');
            return x;
          });
          return T.eq(order, ['a', 'b', 'out']) || `They ran in the order ${T.fmt(order)}.`;
        });

        T.check('Whatever the continuation returns comes back out', () => {
          const r = seqCps([addOne], 1, (x: number) => 'got ' + x);
          return r === 'got 2' || `It gave ${T.fmt(r)}.`;
        });

        T.check('A step can act on what its own continuation returns', () => {
          // This is what separates real continuation passing from a loop that stashes each
          // answer in a variable. In a loop the continuation returns nothing, so a step has
          // no way to wrap the rest of the computation on the way back out.
          const tag = (n: number, k: (x: number) => unknown) => 'tag(' + k(n) + ')';
          const r = seqCps([tag], 5, (x: number) => x);
          return (
            r === 'tag(5)' ||
            `It gave ${T.fmt(r)}, expected 'tag(5)'. The continuation returns the rest of the computation's answer, so a step can do something with it after calling k.`
          );
        });

        T.check('That still works with steps on either side', () => {
          const tag = (n: number, k: (x: number) => unknown) => 'tag(' + k(n) + ')';
          const r = seqCps([addOne, tag, double], 1, (x: number) => x);
          return r === 'tag(4)' || `It gave ${T.fmt(r)}, expected 'tag(4)': add one to 1, tag around the rest, double to 4.`;
        });

        T.law('It agrees with applying the steps by hand', 60, (G) => {
          const n = G.int();
          const r = seqCps([addOne, double, addOne], n, (x: number) => x);
          const want = (n + 1) * 2 + 1;
          return r === want || `At ${n}: ${T.fmt(r)} against ${T.fmt(want)}.`;
        });
      },
    },
  ],
};
