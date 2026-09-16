import type { ExerciseSet } from '@fpx/engine/types';

export const contracts: ExerciseSet = {
  termId: 'contracts',
  rungs: [
    {
      id: 'implement',
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
  ],
};
