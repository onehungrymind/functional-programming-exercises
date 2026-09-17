import type { ExerciseSet } from '@fpx/engine/types';

export const partialFunction: ExerciseSet = {
  termId: 'partial-function',
  rubric: [
    {
      id: 'three-failures',
      statement:
        'Can name the three ways a function can be undefined somewhere: it throws, it returns nothing useful, or it never returns at all.',
    },
    {
      id: 'spot-them',
      statement:
        'Can look at a signature and say where reality will not match it, including the quiet cases that return undefined rather than throwing.',
    },
    {
      id: 'survey',
      statement: 'Can probe a function across a set of inputs and collect the ones it is not defined for, without the survey dying on the first throw.',
    },
  ],
  notes: `A partial function is one whose signature promises more than it delivers. There are three ways
that happens, and they fail very differently.

**It throws.** The honest one: loud, immediate, with a stack trace pointing at the problem.

\`\`\`js
// parse :: String -> Object
const parse = (s) => JSON.parse(s)
parse('{}')      // {}
parse('nope')    // SyntaxError
\`\`\`

**It returns nothing useful.** The dangerous one, because \`undefined\` is not an \`a\` but looks
enough like one to travel:

\`\`\`js
// first :: [a] -> a
const first = (xs) => xs[0]
first([1, 2])    // 1
first([])        // undefined

// ...and the failure surfaces somewhere else entirely
first(users).name   // TypeError: Cannot read property 'name' of undefined
\`\`\`

**It never returns.**

\`\`\`js
// countDown :: Number -> [Number]
const countDown = (n) => (n === 0 ? [0] : [n, ...countDown(n - 1)])
countDown(3)     // [3, 2, 1, 0]
countDown(-1)    // RangeError: Maximum call stack size exceeded
\`\`\`

When you survey someone else's function for these, catch each throw and carry on, or you stop
at the first bad input and learn about one problem instead of all of them:

\`\`\`js
const breaksOn = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      return fn(x) === undefined
    } catch (e) {
      return true
    }
  })

breaksOn(parse, ['{}', 'nope', '[1]'])   // ['nope']
\`\`\`

The repair is a [total function](#total-function): widen what comes out, so
\`[a] -> Option a\` can honestly say "nothing here", or narrow what goes in.`,
  rungs: [
    {
      id: 'recognize',
      covers: ['three-failures', 'spot-them'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are partial?',
      prompt:
        'A partial function is not defined for every input in its domain: some inputs throw, hang, or hand back nothing useful. Select every partial one.',
      options: [
        {
          code: '// first :: [a] -> a\nconst first = (xs) => xs[0]',
          correct: true,
          why: 'An empty list has no first element, so it quietly returns undefined instead of an a.',
        },
        {
          code: '// length :: [a] -> Number\nconst length = (xs) => xs.length',
          correct: false,
          why: 'Every list has a length, the empty one included.',
        },
        {
          code: '// parse :: String -> Object\nconst parse = (s) => JSON.parse(s)',
          correct: true,
          why: 'Most strings are not JSON, and those throw rather than return an Object.',
        },
        {
          code: '// half :: Number -> Number\nconst half = (n) => n / 2',
          correct: false,
          why: 'Every number halves. Even the awkward ones give a number back.',
        },
        {
          code: '// countDown :: Number -> [Number]\nconst countDown = (n) =>\n  n === 0 ? [0] : [n, ...countDown(n - 1)]',
          correct: true,
          why: 'A negative n never reaches the base case, so it recurses until the stack runs out.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['survey', 'three-failures'],
      kind: 'code',
      role: 'implement',
      title: 'Find the inputs that break it',
      prompt:
        'Write `breaksOn`, which runs a function against each input and collects the ones it is not defined for: the inputs that throw, or that give back undefined.',
      hints: [
        'Wrap the call in try/catch. A throw counts as undefined behavior, and so does a return of undefined.',
        'Collect the inputs themselves, not the results.',
      ],
      exports: ['breaksOn'],
      starter: `// breaksOn :: (a -> b) -> [a] -> [a]
const breaksOn = (fn, inputs) => {
  // keep the inputs fn is not defined for
}
`,
      solution: `// breaksOn :: (a -> b) -> [a] -> [a]
const breaksOn = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      return fn(x) === undefined
    } catch (e) {
      return true
    }
  })
`,
      broken: [
        // Lets the throw escape, so the whole survey dies on the first bad input.
        `const breaksOn = (fn, inputs) => inputs.filter((x) => fn(x) === undefined)
`,
        // Catches throws but forgets that undefined is a failure too.
        `const breaksOn = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      fn(x)
      return false
    } catch (e) {
      return true
    }
  })
`,
        // Collects the results instead of the inputs.
        `const breaksOn = (fn, inputs) =>
  inputs.map((x) => {
    try {
      return fn(x)
    } catch (e) {
      return x
    }
  })
`,
      ],
      checks: (T, exp) => {
        const breaksOn = exp.breaksOn as (fn: (x: any) => any, xs: any[]) => any[];

        T.check('An input that throws is reported', () => {
          const parse = (s: string) => JSON.parse(s);
          const r = breaksOn(parse, ['{}', 'nope', '[1]']);
          return T.eq(r, ['nope']) || `Got ${T.fmt(r)}. A throw means the function is not defined there.`;
        });

        T.check('An input that returns undefined is reported too', () => {
          const first = (xs: number[]) => xs[0];
          const r = breaksOn(first, [[1], [], [2, 3]]);
          return (
            T.eq(r, [[]]) ||
            `Got ${T.fmt(r)}. Returning undefined where a value was promised is the quieter half of being partial.`
          );
        });

        T.check('A total function reports nothing', () => {
          const r = breaksOn((n: number) => n * 2, [-1, 0, 1, 99]);
          return T.eq(r, []) || `Got ${T.fmt(r)} for a function defined everywhere.`;
        });

        T.check('The inputs come back, not the results', () => {
          const r = breaksOn((n: number) => (n < 0 ? undefined : n * 10), [-5, 3]);
          return T.eq(r, [-5]) || `Got ${T.fmt(r)}. Report which inputs broke it, not what came out.`;
        });

        T.check('It survives a throw and keeps surveying', () => {
          const risky = (n: number) => {
            if (n === 1) throw new Error('boom');
            return n;
          };
          const r = breaksOn(risky, [1, 2, 1]);
          return (
            T.eq(r, [1, 1]) ||
            `Got ${T.fmt(r)}. The survey has to catch each throw and carry on, or it stops at the first bad input.`
          );
        });

        T.check('Order is preserved and nothing is added', () => {
          const r = breaksOn((n: number) => (n % 2 ? undefined : n), [1, 2, 3, 4, 5]);
          return T.eq(r, [1, 3, 5]) || `Got ${T.fmt(r)}`;
        });
      },
    },

    {
      id: 'widen',
      kind: 'code',
      role: 'apply',
      covers: ['spot-them', 'survey', 'three-failures'],
      title: "Survey three functions, then make them total",
      prompt:
        "`probe` runs a function over a list of inputs and collects the ones it is not defined for, without dying on the first throw. Then make `safeHead`, `safeDiv` and `safeParse` total by widening what they return.",
      hints: [
        "`probe` has to survive a throw, so each call needs its own try/catch. Collect the input, not the error.",
        "A value that is `undefined`, `NaN`, or a throw all count as not defined for that input.",
        "Widening means every input gets an answer. `null` for the missing case is enough here, as long as nothing throws and nothing comes back `undefined` or `NaN`.",
      ],
      exports: ['probe', 'safeHead', 'safeDiv', 'safeParse'],
      starter: `// probe :: ((a -> b), [a]) -> [a]   the inputs it is not defined for
const probe = (fn, inputs) => []

// safeHead :: [a] -> a | null
const safeHead = (xs) => xs[0]

// safeDiv :: (Number, Number) -> Number | null
const safeDiv = (a, b) => a / b

// safeParse :: String -> Number | null
const safeParse = (s) => Number(s)
`,
      solution: `// probe :: ((a -> b), [a]) -> [a]   the inputs it is not defined for
const probe = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      const r = fn(x)
      return r === undefined || (typeof r === 'number' && Number.isNaN(r))
    } catch {
      return true
    }
  })

// safeHead :: [a] -> a | null
const safeHead = (xs) => (xs.length ? xs[0] : null)

// safeDiv :: (Number, Number) -> Number | null
const safeDiv = (a, b) => (b === 0 ? null : a / b)

// safeParse :: String -> Number | null
const safeParse = (s) => (Number.isNaN(Number(s)) ? null : Number(s))
`,
      broken: [
        `const probe = (fn, inputs) => {
  try {
    return inputs.filter((x) => fn(x) === undefined)
  } catch {
    return []
  }
}
const safeHead = (xs) => (xs.length ? xs[0] : null)
const safeDiv = (a, b) => (b === 0 ? null : a / b)
const safeParse = (s) => (Number.isNaN(Number(s)) ? null : Number(s))
`,
        `const probe = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      const r = fn(x)
      return r === undefined || (typeof r === 'number' && Number.isNaN(r))
    } catch {
      return true
    }
  })
const safeHead = (xs) => xs[0]
const safeDiv = (a, b) => (b === 0 ? null : a / b)
const safeParse = (s) => (Number.isNaN(Number(s)) ? null : Number(s))
`,
        `const probe = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      fn(x)
      return false
    } catch {
      return true
    }
  })
const safeHead = (xs) => (xs.length ? xs[0] : null)
const safeDiv = (a, b) => (b === 0 ? null : a / b)
const safeParse = (s) => (Number.isNaN(Number(s)) ? null : Number(s))
`,
        `const probe = (fn, inputs) =>
  inputs.filter((x) => {
    try {
      const r = fn(x)
      return r === undefined || (typeof r === 'number' && Number.isNaN(r))
    } catch {
      return true
    }
  })
const safeHead = (xs) => (xs.length ? xs[0] : null)
const safeDiv = (a, b) => a / b
const safeParse = (s) => (Number.isNaN(Number(s)) ? null : Number(s))
`,
      ],
      checks: (T, exp) => {
        const { probe, safeHead, safeDiv, safeParse } = exp;

        T.check('probe survives a function that throws', () => {
          const boom = (n: number) => {
            if (n === 2) throw new Error('nope');
            return n;
          };
          let r;
          try {
            r = probe(boom, [1, 2, 3]);
          } catch (e) {
            return `probe let the throw escape: ${(e as Error).message}. Each call needs its own guard, or the survey dies on the first bad input.`;
          }
          return T.eq(r, [2]) || `probe gave ${T.fmt(r)}, expected [2].`;
        });

        T.check('probe keeps going after a throw', () => {
          const boom = (n: number) => {
            if (n % 2 === 0) throw new Error('even');
            return n;
          };
          const r = probe(boom, [1, 2, 3, 4]);
          return T.eq(r, [2, 4]) || `probe gave ${T.fmt(r)}, expected [2, 4]. It stopped at the first one.`;
        });

        T.check('probe counts undefined as not defined', () => {
          const half = (n: number) => (n % 2 === 0 ? n / 2 : undefined);
          const r = probe(half, [1, 2, 3, 4]);
          return T.eq(r, [1, 3]) || `probe gave ${T.fmt(r)}, expected [1, 3]. A silent undefined is a gap too.`;
        });

        T.check('probe counts NaN as not defined', () => {
          const r = probe((s: string) => Number(s), ['1', 'x', '3']);
          return T.eq(r, ['x']) || `probe gave ${T.fmt(r)}, expected ['x'].`;
        });

        T.check('probe finds nothing wrong with a total function', () => {
          const r = probe((n: number) => n * 2, [1, 2, 3]);
          return T.eq(r, []) || `probe gave ${T.fmt(r)} for a function defined everywhere.`;
        });

        T.check('safeHead has an answer for the empty list', () => {
          const r = safeHead([]);
          return r === null || `safeHead([]) gave ${T.fmt(r)}. Widening means every input gets an answer.`;
        });

        T.check('safeHead still gives the head', () => {
          return safeHead([4, 5]) === 4 || `safeHead([4, 5]) gave ${T.fmt(safeHead([4, 5]))}.`;
        });

        T.check('safeDiv has an answer for zero', () => {
          const r = safeDiv(1, 0);
          return r === null || `safeDiv(1, 0) gave ${T.fmt(r)}. Infinity is not a number you meant.`;
        });

        T.check('safeParse has an answer for nonsense', () => {
          const r = safeParse('banana');
          return r === null || `safeParse('banana') gave ${T.fmt(r)}.`;
        });

        T.check('The three are total under probe', () => {
          const a = probe(safeHead, [[], [1], [1, 2]]);
          const b = probe((s: string) => safeParse(s), ['1', 'x', '']);
          if (a.length) return `safeHead is still undefined for ${T.fmt(a)}.`;
          if (b.length) return `safeParse is still undefined for ${T.fmt(b)}.`;
          return true;
        });
      },
    },
  ],
};
