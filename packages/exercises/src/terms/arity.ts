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
      covers: ['declared-vs-call', 'name-it'],
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

    {
      id: 'curry-by-length',
      kind: 'code',
      role: 'break',
      covers: ['why-it-matters', 'declared-vs-call'],
      title: "Curry by reading fn.length, then find where that breaks",
      prompt:
        "Three functions, in this order, because each one uses the one before it.\n\n1. `curryN(n, fn)` gathers arguments until it has `n` of them, then calls `fn` with all of them. Given fewer, it hands back a function waiting for the rest.\n\n2. `curryByLength(fn)` does the same job, except it is not told the arity. It reads `fn.length`. Build it out of `curryN`.\n\n3. `surprise()` returns `true` if `curryByLength` gets `volDefaulted` wrong, and `false` if it handles it correctly. \"Wrong\" here means something specific: hand it two of that function's three arguments and see whether it has already called through instead of waiting for the third.\n\nThe starter has a worked example against each one.",
      hints: [
        "Start with `curryN`. Keep the arguments you have been given so far, and each time more arrive, decide whether you now have enough to call `fn` or whether to wait again.",
        "`curryByLength` is one line once `curryN` works. The only thing it adds is where the count comes from.",
        "For `surprise`, apply `curryByLength` to the defaulted function, give that two arguments, and look at what you are holding. A function means it is still waiting and nothing went wrong. A number means it finished a step early.",
      ],
      exports: ['curryByLength', 'curryN', 'surprise'],
      starter: `// Two functions to try these on. Both multiply three numbers.
const vol = (l, w, h) => l * w * h              // vol.length is 3
const volDefaulted = (l, w, h = 1) => l * w * h // volDefaulted.length is 2, not 3

// curryN :: (Number, Function) -> Function
// Gathers n arguments, then calls fn with all of them.
//   curryN(3, vol)(2)(3)(4)  ->  24
//   curryN(3, vol)(2, 3)(4)  ->  24      grouping does not matter
//   curryN(3, vol)(2)(3)     ->  a function, still waiting for the third
const curryN = (n, fn) => fn

// curryByLength :: Function -> Function
// The same job, but it reads the arity off fn.length instead of being told.
//   curryByLength(vol)(2)(3)(4)  ->  24
const curryByLength = (fn) => fn

// surprise :: () -> Boolean
// true if curryByLength mishandles volDefaulted, false if it does not.
// Give curryByLength two of volDefaulted's three arguments. If what you get back is
// still a function, it is waiting properly and the answer is false. If it has already
// produced a number, it stopped a step early and the answer is true.
const surprise = () => false
`,
      solution: `const vol = (l, w, h) => l * w * h
const volDefaulted = (l, w, h = 1) => l * w * h

// curryN :: (Number, Function) -> Function
const curryN = (n, fn) => {
  const collect = (got) =>
    got.length >= n ? fn(...got) : (...more) => collect([...got, ...more])
  return collect([])
}

// curryByLength :: Function -> Function
const curryByLength = (fn) => curryN(fn.length, fn)

// surprise :: () -> Boolean
const surprise = () => {
  // volDefaulted.length is 2, so curryByLength calls through after two arguments
  // and hands back a number where it should still be waiting for the third.
  const afterTwo = curryByLength(volDefaulted)(2)(3)
  return typeof afterTwo !== 'function'
}
`,
      broken: [
        `const curryByLength = (fn) => curryN(fn.length, fn)
const curryN = (n, fn) => {
  const collect = (got) => (got.length >= n ? fn(...got) : (...more) => collect([...got, ...more]))
  return collect([])
}
const surprise = () => false
`,
        `const curryByLength = (fn) => curryN(fn.length + 1, fn)
const curryN = (n, fn) => {
  const collect = (got) => (got.length >= n ? fn(...got) : (...more) => collect([...got, ...more]))
  return collect([])
}
const surprise = () => {
  const vol = (l, w, h = 1) => l * w * h
  // Two of three arguments in, and it has already called through.
  return typeof curryByLength(vol)(2)(3) !== 'function'
}
`,
        `const curryByLength = (fn) => curryN(fn.length, fn)
const curryN = (n, fn) => {
  const collect = (got) => (got.length > n ? fn(...got) : (...more) => collect([...got, ...more]))
  return collect([])
}
const surprise = () => {
  const vol = (l, w, h = 1) => l * w * h
  // Two of three arguments in, and it has already called through.
  return typeof curryByLength(vol)(2)(3) !== 'function'
}
`,
      ],
      checks: (T, exp) => {
        const { curryByLength, curryN, surprise } = exp;
        const vol = (l: number, w: number, h: number) => l * w * h;
        const defaulted = (l: number, w: number, h = 1) => l * w * h;

        T.check('It curries a plain three-parameter function', () => {
          const r = curryByLength(vol)(2)(3)(4);
          return r === 24 || `It gave ${T.fmt(r)}, expected 24.`;
        });

        T.check('It is still waiting after two of three', () => {
          return typeof curryByLength(vol)(2)(3) === 'function' || 'Two of three arguments should not be enough to call through.';
        });

        T.check('curryN uses the count it was handed', () => {
          const r = curryN(3, defaulted)(2)(3)(4);
          return r === 24 || `curryN(3, defaulted)(2)(3)(4) gave ${T.fmt(r)}, expected 24.`;
        });

        T.check('Reading fn.length gets the defaulted function wrong', () => {
          const r = curryByLength(defaulted)(2)(3);
          return (
            r === 6 ||
            `It gave ${T.fmt(r)}. A defaulted parameter is not counted, so fn.length says 2 and the third argument is never waited for. That is the answer this rung wants to see.`
          );
        });

        T.check('And surprise reports it', () => {
          const r = surprise();
          return (
            r === true ||
            `surprise reported ${T.fmt(r)}. Getting 6 instead of a function still waiting is the surprise, and the rung is about noticing it rather than avoiding it.`
          );
        });

        T.check('curryN fixes the same case', () => {
          const partial = curryN(3, defaulted)(2)(3);
          return typeof partial === 'function' && partial(4) === 24 || `curryN still gave ${T.fmt(partial)} after two arguments.`;
        });

        T.check('A rest parameter reports nothing at all', () => {
          const rested = (...xs: number[]) => xs.length;
          const r = curryByLength(rested);
          return r === 0 || `Currying a rest-only function by its length gave ${T.fmt(r)}. fn.length is 0, so it calls through immediately with nothing.`;
        });

        T.law('curryN agrees with calling directly', 60, (G) => {
          const a = G.int(), b = G.int(), c = G.int();
          const r = curryN(3, vol)(a)(b)(c);
          return r === vol(a, b, c) || `At ${T.fmt([a, b, c])}: ${T.fmt(r)} against ${T.fmt(vol(a, b, c))}.`;
        });
      },
    },
  ],
};
