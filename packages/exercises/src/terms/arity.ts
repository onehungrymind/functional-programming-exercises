import type { ExerciseSet } from '@fpx/engine/types';

export const arity: ExerciseSet = {
  termId: 'arity',
  rubric: [
    {
      id: 'name-it',
      statement: 'Can name the arity of any definition, from nullary through n-ary, without reaching for the docs.',
    },
    {
      id: 'declared-vs-call',
      statement:
        'Can predict what `fn.length` reports for a definition using defaults, rest, or destructuring, and knows it is the declared arity rather than the call arity.',
    },
    {
      id: 'why-it-matters',
      statement:
        'Can say what breaks when machinery reads `fn.length` and gets an answer it did not expect, as auto-currying does.',
    },
  ],
  notes: `Two different notions of arity, and \`fn.length\` reports the one you probably did not mean.

**Declared arity** is what \`fn.length\` gives you. **Call arity** is how many arguments a
particular call passes.

\`\`\`js
const add = (a, b) => a + b
add.length        // 2, declared
add(1, 2, 3)      // call arity 3, and add never notices
\`\`\`

Three rules decide what gets counted:

\`\`\`js
((a, b) => 0).length          // 2   plain parameters
((a, b, c = 0) => 0).length   // 2   counting stops at the first default
((a = 1, b) => 0).length      // 0   even though b has no default
((a, ...rest) => 0).length    // 1   a rest parameter is never counted
((...xs) => 0).length         // 0   so variadic looks exactly like nullary
(({ a, b }) => 0).length      // 1   one destructured parameter is one parameter
\`\`\`

This is not trivia, because [auto-currying](#auto-currying) decides how long to wait by reading
\`fn.length\`:

\`\`\`js
const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}

const add3 = (a, b, c) => a + b + c
curry(add3)(1)(2)(3)          // 6, as you would hope

const sum = (...ns) => ns.reduce((a, b) => a + b, 0)
curry(sum)(1)                 // 1, not a function
                              // sum.length is 0, so curry called through at once
\`\`\`

Any time declared arity is smaller than what the function really wants, machinery built on
\`fn.length\` acts too soon.`,
  rungs: [
    {
      id: 'recognize',
      kind: 'expr',
      role: 'recognize',
      covers: ['declared-vs-call'],
      title: 'What does fn.length report?',
      prompt:
        'Every one of these declares its parameters differently. Write the array of what `fn.length` gives for each, in order.',
      hints: [
        'Counting stops at the first parameter with a default. A rest parameter is never counted.',
        'A destructured parameter is still one parameter.',
      ],
      context: `const a = (x, y) => 0
const b = (x, y, z = 0) => 0
const c = (x = 1, y) => 0
const d = (x, ...rest) => 0
const e = ({ x, y }) => 0`,
      placeholder: '[a.length, b.length, ...]',
      expect: [2, 2, 0, 1, 1],
      solution: '[a.length, b.length, c.length, d.length, e.length]',
      broken: [
        // Assumes every declared parameter counts.
        '[2, 3, 2, 2, 2]',
        // Gets the defaults right but expects rest to count.
        '[2, 2, 0, 2, 1]',
        // Expects destructuring to count each property.
        '[2, 2, 0, 1, 2]',
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      covers: ['name-it', 'declared-vs-call'],
      title: 'Name an arity',
      prompt:
        'Write `arityName` so it turns a function into the word for how many arguments it declares. Anything above three is `n-ary`.',
      hints: [
        'The words go nullary, unary, binary, ternary.',
        '`fn.length` gives you the number. Everything above 3 shares one name.',
      ],
      exports: ['arityName'],
      starter: `// arityName :: Function -> String
const arityName = (fn) => {
  // nullary, unary, binary, ternary, or n-ary
}
`,
      solution: `// arityName :: Function -> String
const arityName = (fn) => {
  const names = ['nullary', 'unary', 'binary', 'ternary']
  return names[fn.length] || 'n-ary'
}
`,
      broken: [
        // Off by one: reads the count as an index into a 1-based list.
        `const arityName = (fn) => {
  const names = ['unary', 'binary', 'ternary']
  return names[fn.length] || 'n-ary'
}
`,
        // Forgets that anything past ternary has a name too.
        `const arityName = (fn) => {
  const names = ['nullary', 'unary', 'binary', 'ternary']
  return names[fn.length]
}
`,
      ],
      checks: (T, exp) => {
        const arityName = exp.arityName as (fn: (...a: any[]) => any) => string;

        T.check('A function of no arguments is nullary', () => {
          const r = arityName(() => 0);
          return r === 'nullary' || `Got ${T.fmt(r)} for \`() => 0\`.`;
        });

        T.check('One argument is unary, two is binary, three is ternary', () => {
          const cases: [(...a: any[]) => any, string][] = [
            [(a: number) => a, 'unary'],
            [(a: number, b: number) => a + b, 'binary'],
            [(a: number, b: number, c: number) => a + b + c, 'ternary'],
          ];
          for (const [fn, want] of cases) {
            const got = arityName(fn);
            if (got !== want) return `A function of ${fn.length} argument(s) came back as ${T.fmt(got)}, not ${T.fmt(want)}.`;
          }
          return true;
        });

        T.check('Four or more is n-ary', () => {
          const r = arityName((a: number, b: number, c: number, d: number) => a + b + c + d);
          return r === 'n-ary' || `Got ${T.fmt(r)} for a four-argument function. Past ternary they all share one name.`;
        });

        T.check('A rest parameter does not count, so (...xs) => 0 is nullary', () => {
          const r = arityName((..._xs: number[]) => 0);
          return (
            r === 'nullary' ||
            `Got ${T.fmt(r)}. \`fn.length\` ignores rest parameters entirely, so a variadic function declares an arity of 0.`
          );
        });

        T.check('Counting stops at the first default', () => {
          const r = arityName((_a: number, _b = 1) => 0);
          return (
            r === 'unary' ||
            `Got ${T.fmt(r)} for \`(a, b = 1) => 0\`. Parameters from the first default onward are not counted, so its declared arity is 1.`
          );
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      covers: ['why-it-matters', 'declared-vs-call'],
      title: 'Predict where currying goes wrong',
      prompt:
        '`curry` waits for `fn.length` arguments before calling through. Write `curriesBadly`, which reports whether a function is one it will mishandle.',
      hints: [
        'curry compares the arguments it has collected against `fn.length`.',
        'A function whose declared arity is smaller than the number of arguments it really wants gets called too early.',
      ],
      exports: ['curriesBadly'],
      starter: `// curry calls through once it has collected fn.length arguments.
const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}

// curriesBadly :: (Function, Number) -> Boolean
// wanted is how many arguments the function actually needs to do its job.
const curriesBadly = (fn, wanted) => {
}
`,
      solution: `const curry = (fn) => {
  const collect = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => collect(...args, ...more)
  return collect
}

// curriesBadly :: (Function, Number) -> Boolean
const curriesBadly = (fn, wanted) => fn.length < wanted
`,
      broken: [
        // Compares the wrong way round, so it flags the safe ones instead.
        `const curriesBadly = (fn, wanted) => fn.length > wanted\n`,
        // Only catches the fully variadic case and misses a trailing default.
        `const curriesBadly = (fn, wanted) => fn.length === 0\n`,
        // Declaring more than it needs is awkward, not broken.
        `const curriesBadly = (fn, wanted) => fn.length !== wanted\n`,
      ],
      checks: (T, exp) => {
        const curriesBadly = exp.curriesBadly as (fn: (...a: any[]) => any, wanted: number) => boolean;

        T.check('An ordinary three-argument function curries fine', () => {
          const r = curriesBadly((a: number, b: number, c: number) => a + b + c, 3);
          return r === false || `Got ${T.fmt(r)}. Its declared arity matches what it wants, so curry waits for all three.`;
        });

        T.check('A variadic function does not', () => {
          const sum = (...ns: number[]) => ns.reduce((a, b) => a + b, 0);
          const r = curriesBadly(sum, 3);
          return (
            r === true ||
            `Got ${T.fmt(r)}. A rest parameter makes fn.length 0, so curry calls through on the first argument.`
          );
        });

        T.check('A trailing default is caught too', () => {
          const r = curriesBadly((_a: number, _b: number, _c = 0) => 0, 3);
          return (
            r === true ||
            `Got ${T.fmt(r)}. Counting stops at the default, so fn.length is 2 and curry fires an argument early.`
          );
        });

        T.check('Any shortfall counts, not only a shortfall to zero', () => {
          const r = curriesBadly((_a: number, _b = 1) => 0, 2);
          return (
            r === true ||
            `A function of declared arity 1 that wants 2 gave ${T.fmt(r)}. Testing only for zero misses the trailing-default case.`
          );
        });

        T.check('Declaring more than it needs is awkward, not broken', () => {
          const r = curriesBadly((_a: number, _b: number) => 0, 1);
          return (
            r === false ||
            `Got ${T.fmt(r)}. curry will wait for an argument that does nothing, which still arrives at the right answer.`
          );
        });

        T.check('The prediction matches what curry actually does', () => {
          const curry = (fn: any) => {
            const collect = (...args: any[]): any =>
              args.length >= fn.length ? fn(...args) : (...more: any[]) => collect(...args, ...more);
            return collect;
          };
          const sum = (...ns: number[]) => ns.reduce((a, b) => a + b, 0);
          const calledEarly = typeof curry(sum)(1) !== 'function';
          return (
            curriesBadly(sum, 3) === calledEarly ||
            `curriesBadly said ${T.fmt(curriesBadly(sum, 3))}, but currying that function and passing one argument ${calledEarly ? 'did' : 'did not'} call through early.`
          );
        });
      },
    },
  ],
};
