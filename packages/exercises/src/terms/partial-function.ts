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
  notes: `A partial function is one whose signature promises more than it delivers. \`first ::
[a] -> a\` claims that for any list it gives you an \`a\`. Hand it \`[]\` and it does not.

There are three distinct ways that happens, and they are worth separating because they fail
very differently in practice.

**It throws.** \`JSON.parse('nope')\` is the honest one. Loud, immediate, easy to find, and it
gives you a stack trace pointing at the problem.

**It returns nothing useful.** \`[][0]\` gives you \`undefined\`, which is not an \`a\` but
looks enough like one to travel. This is the dangerous case, because the failure surfaces later,
somewhere else, as \`Cannot read property 'x' of undefined\`, and by then the list that was
empty is nowhere near the stack trace.

**It never returns.** A recursion that misses its base case, or a loop whose condition is never
met. \`countDown(-1)\` where the base case tests \`n === 0\` will recurse until the stack runs
out. The signature says \`Number -> [Number]\` and for negative inputs there is simply no
answer coming.

Two habits follow. When you write a signature, ask which inputs will not honour it. And when you
survey someone else's function for these, catch each throw and carry on, or your survey stops at
the first bad input and tells you about one problem instead of all of them.

The repair is a [total function](#total-function): either widen what comes out, so
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
  ],
};
