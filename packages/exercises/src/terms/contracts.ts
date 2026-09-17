import type { ExerciseSet } from '@fpx/engine/types';

export const contracts: ExerciseSet = {
  termId: 'contracts',
  rubric: [
    {
      id: 'both-sides',
      statement:
        "Can guard both what goes in and what comes out, and knows checking only the inputs leaves half the promise unkept.",
    },
    {
      id: 'fail-at-the-boundary',
      statement:
        "Knows the value is in where it fails, so the inputs must be checked before the function runs.",
    },
    {
      id: 'useful-message',
      statement:
        "Can throw a message that names which side and which position broke, so the caller does not have to guess.",
    },
  ],
  notes: `A contract states what a function accepts and what it promises, and checks both at runtime.

\`\`\`js
const withContract = (inputChecks, outputCheck, fn) => (...args) => {
  args.forEach((arg, i) => {
    const check = inputChecks[i]
    if (check && !check(arg)) {
      throw new TypeError(\`Argument \${i} did not meet the contract: \${String(arg)}\`)
    }
  })
  const result = fn(...args)
  if (!outputCheck(result)) {
    throw new TypeError(\`Result did not meet the contract: \${String(result)}\`)
  }
  return result
}
\`\`\`

Both sides matter. Guarding only the inputs leaves the promise unkept:

\`\`\`js
const isPositive = (n) => typeof n === 'number' && n > 0
const discount = withContract([isPositive], isPositive, (p) => p - 100)

discount(50)   // TypeError: Result did not meet the contract: -50
               // without the output check this returns -50 and ruins someone's invoice
\`\`\`

Order matters too. Check the inputs **before** calling, or the bad argument has already done
its work by the time you complain:

\`\`\`js
const guarded = (...args) => {
  const result = fn(...args)     // already wrote to the database
  checkInputs(args)              // too late to be useful
  return result
}
\`\`\`

The value of a contract is **where** it fails, not that it fails. So name the side and the
position:

\`\`\`js
throw new TypeError('invalid')             // the caller now goes hunting
throw new TypeError(\`Argument 1 did not meet the contract: \${String(arg)}\`)
\`\`\`

It overlaps with a type system but does not replace one: a checker runs before the program, a
contract runs on the real values, including the ones that arrived over the network.`,
  rungs: [
    {
      id: 'implement',
      covers: ['both-sides', 'fail-at-the-boundary', 'useful-message'],
      kind: 'code',
      role: 'implement',
      title: 'Wrap a function in a contract',
      prompt:
        'A contract states what a function accepts and what it promises. Write `withContract`, which checks the inputs before the call and the output after.',
      hints: [
        'Run every input predicate first, then call, then check the result.',
        'Throw a TypeError naming which side of the contract broke, so the message is worth reading.',
      ],
      exports: ['withContract'],
      starter: `// withContract :: ([a -> Boolean], b -> Boolean, f) -> f
const withContract = (inputChecks, outputCheck, fn) => {
  // check the arguments, call fn, check the result
}
`,
      solution: `// withContract :: ([a -> Boolean], b -> Boolean, f) -> f
const withContract = (inputChecks, outputCheck, fn) => (...args) => {
  args.forEach((arg, i) => {
    const check = inputChecks[i]
    if (check && !check(arg)) {
      throw new TypeError(\`Argument \${i} did not meet the contract: \${String(arg)}\`)
    }
  })
  const result = fn(...args)
  if (!outputCheck(result)) {
    throw new TypeError(\`Result did not meet the contract: \${String(result)}\`)
  }
  return result
}
`,
      broken: [
        // Checks the inputs but takes the output on trust.
        `const withContract = (inputChecks, outputCheck, fn) => (...args) => {
  args.forEach((arg, i) => {
    const check = inputChecks[i]
    if (check && !check(arg)) throw new TypeError(\`Argument \${i} did not meet the contract\`)
  })
  return fn(...args)
}
`,
        // Checks the output but lets any input through.
        `const withContract = (inputChecks, outputCheck, fn) => (...args) => {
  const result = fn(...args)
  if (!outputCheck(result)) throw new TypeError('Result did not meet the contract')
  return result
}
`,
        // Checks the inputs after calling, so a bad argument has already done its damage.
        `const withContract = (inputChecks, outputCheck, fn) => (...args) => {
  const result = fn(...args)
  args.forEach((arg, i) => {
    const check = inputChecks[i]
    if (check && !check(arg)) throw new TypeError(\`Argument \${i} did not meet the contract\`)
  })
  if (!outputCheck(result)) throw new TypeError('Result did not meet the contract')
  return result
}
`,
      ],
      checks: (T, exp) => {
        const withContract = exp.withContract as (
          ins: ((x: any) => boolean)[],
          out: (x: any) => boolean,
          fn: (...a: any[]) => any,
        ) => (...a: any[]) => any;

        const isNumber = (x: unknown) => typeof x === 'number';
        const isPositive = (x: unknown) => typeof x === 'number' && x > 0;

        T.check('A call that honours the contract goes through', () => {
          const add = withContract([isNumber, isNumber], isNumber, (a: number, b: number) => a + b);
          const r = add(2, 3);
          return r === 5 || `Got ${T.fmt(r)}`;
        });

        T.check('A bad argument is rejected', () => {
          const add = withContract([isNumber, isNumber], isNumber, (a: number, b: number) => a + b);
          try {
            add('2', 3);
            return 'A string argument was accepted even though the contract asks for a number.';
          } catch {
            return true;
          }
        });

        T.check('A bad result is rejected too', () => {
          const bad = withContract([isNumber], isPositive, (n: number) => n - 100);
          try {
            bad(1);
            return 'A result of -99 was returned even though the contract promises a positive number. The output side has to be checked as well.';
          } catch {
            return true;
          }
        });

        T.check('The inputs are checked before the function runs', () => {
          const spy = T.spyFn((n: number) => n);
          const guarded = withContract([isNumber], isNumber, spy);
          try {
            guarded('nope');
          } catch {
            /* expected */
          }
          return (
            spy.calls.length === 0 ||
            'The function ran with a bad argument and only then was the contract checked. Checking afterwards is too late.'
          );
        });

        T.check('The message says which argument broke the contract', () => {
          const add = withContract([isNumber, isNumber], isNumber, (a: number, b: number) => a + b);
          try {
            add(1, 'x');
            return 'No error was thrown.';
          } catch (e) {
            const message = (e as Error).message ?? '';
            return (
              /1/.test(message) ||
              `The message was ${T.fmt(message)}. Name the position that failed, or the caller has to guess.`
            );
          }
        });

        T.check('Fewer contracts than arguments is fine', () => {
          const f = withContract([isNumber], isNumber, (a: number, b: number) => a + (b ?? 0));
          const r = f(1, 2);
          return r === 3 || `Got ${T.fmt(r)}. An argument with no contract is simply unchecked.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['fail-at-the-boundary'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is a contract for?',
      prompt: 'Pick the best description of what a runtime contract buys you.',
      options: [
        {
          code: '// It fails at the boundary that broke the promise,\n// instead of somewhere further downstream',
          correct: true,
          why: 'The value of a contract is where it fails, not that it fails. A bad argument is caught at the door.',
        },
        {
          code: '// It makes the function faster',
          correct: false,
          why: 'It adds work on every call. You trade a little speed for a better failure.',
        },
        {
          code: '// It replaces a type system',
          correct: false,
          why: 'It overlaps, but a contract runs at runtime on real values and a type checker runs before that.',
        },
        {
          code: '// It makes the function pure',
          correct: false,
          why: 'Unrelated. Throwing on a bad input does not remove any effect the function already had.',
        },
      ],
    },

    {
      id: 'both-ends',
      kind: 'code',
      role: 'apply',
      covers: ['both-sides', 'useful-message'],
      title: "Guard both ends, and say what went wrong",
      prompt:
        "A contract checks what comes in and what goes out, and a failure that does not say which is barely worth having. Write `contract`, which wraps a function with both guards and messages that name the offending value.",
      hints: [
        "The precondition runs before the call and the postcondition after it.",
        "The message has to say which side failed and what the value was, or the guard is just a crash with extra steps.",
        "A function that satisfies both should be indistinguishable from the unwrapped one.",
      ],
      exports: ['contract'],
      starter: `// contract :: ({ pre, post, name }, (a -> b)) -> (a -> b)
const contract = ({ pre, post, name }, fn) => fn
`,
      solution: `// contract :: ({ pre, post, name }, (a -> b)) -> (a -> b)
const contract = ({ pre, post, name }, fn) => (arg) => {
  if (!pre(arg)) {
    throw new TypeError(name + ': precondition failed for ' + JSON.stringify(arg))
  }
  const result = fn(arg)
  if (!post(result)) {
    throw new TypeError(name + ': postcondition failed for ' + JSON.stringify(result))
  }
  return result
}
`,
      broken: [
        `const contract = ({ pre, post, name }, fn) => (arg) => {
  if (!pre(arg)) throw new TypeError(name + ': precondition failed for ' + JSON.stringify(arg))
  return fn(arg)
}
`,
        `const contract = ({ pre, post, name }, fn) => (arg) => {
  const result = fn(arg)
  if (!post(result)) throw new TypeError(name + ': postcondition failed for ' + JSON.stringify(result))
  return result
}
`,
        `const contract = ({ pre, post, name }, fn) => (arg) => {
  if (!pre(arg)) throw new TypeError('failed')
  const result = fn(arg)
  if (!post(result)) throw new TypeError('failed')
  return result
}
`,
      ],
      checks: (T, exp) => {
        const contract = exp.contract;
        const spec = {
          name: 'sqrt',
          pre: (n: number) => typeof n === 'number' && n >= 0,
          post: (n: number) => typeof n === 'number' && !Number.isNaN(n),
        };
        const guarded = contract(spec, Math.sqrt);

        T.check('A good call passes straight through', () => {
          return guarded(9) === 3 || `guarded(9) gave ${T.fmt(guarded(9))}.`;
        });

        T.check('A bad input is stopped', () => {
          let threw = false;
          try {
            guarded(-1);
          } catch {
            threw = true;
          }
          return threw || 'A negative input was allowed through. That is the precondition.';
        });

        T.check('A bad input is stopped before the function runs', () => {
          let ran = false;
          const g = contract(spec, (n: number) => {
            ran = true;
            return n;
          });
          try {
            g(-1);
          } catch {
            /* expected */
          }
          return !ran || 'The function ran despite the precondition failing. Checking after the fact is not a guard.';
        });

        T.check('A bad output is stopped too', () => {
          const g = contract(spec, () => NaN);
          let threw = false;
          try {
            g(4);
          } catch {
            threw = true;
          }
          return threw || 'A NaN result came back without complaint. Both ends are guarded, not just the one going in.';
        });

        T.check('The message says which side failed', () => {
          let msg = '';
          try {
            guarded(-1);
          } catch (e) {
            msg = (e as Error).message;
          }
          return /pre/i.test(msg) || `The message was ${T.fmt(msg)}, and it should say the precondition is what failed.`;
        });

        T.check('The message names the offending value', () => {
          let msg = '';
          try {
            guarded(-1);
          } catch (e) {
            msg = (e as Error).message;
          }
          return /-1/.test(msg) || `The message was ${T.fmt(msg)}. Without the value it is a crash with extra steps.`;
        });

        T.check('The postcondition message is distinguishable from the precondition one', () => {
          const g = contract(spec, () => NaN);
          let pre = '';
          let post = '';
          try {
            g(-1);
          } catch (e) {
            pre = (e as Error).message;
          }
          try {
            g(4);
          } catch (e) {
            post = (e as Error).message;
          }
          return pre !== post || `Both failures said ${T.fmt(pre)}. Which end broke is the first thing you want to know.`;
        });

        T.check('The contract names itself', () => {
          let msg = '';
          try {
            guarded(-1);
          } catch (e) {
            msg = (e as Error).message;
          }
          return /sqrt/.test(msg) || `The message was ${T.fmt(msg)} and does not say which contract it was.`;
        });

        T.law('A satisfied contract is invisible', 60, (G) => {
          const n = Math.abs(G.int());
          return guarded(n) === Math.sqrt(n) || `At ${n}: ${T.fmt(guarded(n))} against ${T.fmt(Math.sqrt(n))}.`;
        });
      },
    },
  ],
};
