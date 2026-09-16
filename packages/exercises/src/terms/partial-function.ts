import type { ExerciseSet } from '@fpx/engine/types';

export const partialFunction: ExerciseSet = {
  termId: 'partial-function',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'recognize',
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
