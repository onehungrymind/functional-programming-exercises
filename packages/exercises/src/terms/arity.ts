import type { ExerciseSet } from '@fpx/engine/types';

export const arity: ExerciseSet = {
  termId: 'arity',
  notes: `The glossary entry covers the names. The part that catches people out is that
JavaScript has two different notions of arity, and \`fn.length\` reports the one you probably
did not mean.

**Declared arity** is what \`fn.length\` gives you: the number of parameters written before
the first one that has a default or a rest. **Call arity** is how many arguments a particular
call actually passes, which \`arguments.length\` would tell you inside the function.

Three rules decide what \`fn.length\` counts:

- Counting **stops at the first parameter with a default**, and everything after it is
  ignored, even parameters that have no default of their own. So \`(a = 1, b) => 0\` has a
  length of 0, not 1.
- A **rest parameter is never counted**. \`(...xs) => 0\` has a length of 0, which means a
  variadic function and a nullary one look identical to \`fn.length\`.
- A **destructured parameter is still one parameter**. \`({ a, b }) => 0\` has a length of 1.

This matters well beyond trivia, because [auto-currying](#auto-currying) decides how many
arguments to wait for by reading \`fn.length\`. Curry a variadic function and it will call
through immediately, having been told the function takes nothing.`,
  rungs: [
    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'What does fn.length actually count?',
      prompt:
        '`fn.length` reports declared arity, which is not always the number of arguments a call takes. Select every definition whose `length` is 2.',
      options: [
        { code: 'const add = (a, b) => a + b', correct: true, why: 'Two plain parameters, so length is 2.' },
        {
          code: 'const add = (a, b, c = 0) => a + b + c',
          correct: true,
          why: 'Counting stops at the first parameter with a default, so length is 2.',
        },
        {
          code: 'const add = (a, ...rest) => a + rest.length',
          correct: false,
          why: 'A rest parameter is not counted at all, so length is 1.',
        },
        {
          code: 'const add = (a = 1, b) => a + b',
          correct: false,
          why: 'Counting stops at the first default even when later parameters have none, so length is 0.',
        },
        {
          code: 'const add = ({ a, b }) => a + b',
          correct: false,
          why: 'One destructured parameter is still one parameter, so length is 1.',
        },
      ],
    },

    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
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
  ],
};
