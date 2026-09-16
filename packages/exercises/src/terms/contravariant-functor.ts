import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const contravariantFunctor: ExerciseSet = {
  termId: 'contravariant-functor',
  rubric: [
    {
      id: 'maps-the-input',
      statement:
        "Knows contramap applies its function on the way in, adapting what the structure accepts rather than what it produces.",
    },
    {
      id: 'order-reverses',
      statement:
        "Knows the composition law reverses, and can say why chaining contramaps runs the last one first.",
    },
    {
      id: 'behavioural-equality',
      statement:
        "Knows two of these are compared by what they do on sample inputs, because their whole content is a function.",
    },
  ],
  notes: `A functor maps the **output**. A contravariant functor maps the **input**.

\`\`\`js
const Predicate = (run) => ({
  run,
  contramap: (f) => Predicate((x) => run(f(x)))   // f runs first, on the way in
})

const isLong = Predicate((n) => n > 3)
const isLongString = isLong.contramap((s) => s.length)

isLongString.run('hi')      // false
isLongString.run('hello')   // true
\`\`\`

A Predicate **consumes**; there is no output to map. Adapting it means adapting what it will
accept, which is what turns a predicate about numbers into one about strings.

The composition law runs backwards, and this is the part worth committing to memory:

\`\`\`js
u.map(f).map(g)                    // equals u.map((x) => g(f(x)))
u.contramap(f).contramap(g)        // equals u.contramap((x) => f(g(x)))
//                                                              ^^^^^^^ reversed
\`\`\`

It follows from the shape. Each \`contramap\` adds a step **earlier** in the pipeline, so the
last one added is the first to run.

One practical trap when testing these: structural equality is useless here. A Predicate's entire
content is a closure, so comparing two of them compares nothing and every law passes:

\`\`\`js
deepEqual(Predicate(f), Predicate(g))   // true for any f and g
\`\`\`

They have to be judged by behaviour:

\`\`\`js
const same = (a, b) => [-7, -1, 0, 1, 5].every((x) => a.run(x) === b.run(x))
\`\`\`

Comparators, serializers, and anything else shaped \`a -> something\` are contravariant in
\`a\` for the same reason.`,
  rungs: [
    {
      id: 'implement',
      covers: ['maps-the-input', 'behavioural-equality'],
      kind: 'code',
      role: 'implement',
      title: 'Map over the input instead of the output',
      prompt:
        'A Predicate consumes values rather than producing them, so a function is applied before it runs, not after. That is `contramap`.',
      hints: [
        '`map` would apply f to the result. `contramap` applies it to the argument on the way in.',
        '`Predicate((x) => run(f(x)))`.',
      ],
      exports: ['Predicate'],
      starter: `// Predicate :: (a -> Boolean) -> Predicate a
const Predicate = (run) => ({
  run,
  // contramap :: (b -> a) -> Predicate b
  contramap: (f) => {
  },
  inspect: () => 'Predicate(?)'
})
`,
      solution: `// Predicate :: (a -> Boolean) -> Predicate a
const Predicate = (run) => ({
  run,
  // contramap :: (b -> a) -> Predicate b
  contramap: (f) => Predicate((x) => run(f(x))),
  inspect: () => 'Predicate(?)'
})
`,
      broken: [
        // Applies f to the result, which is an ordinary covariant map.
        `const Predicate = (run) => ({
  run,
  contramap: (f) => Predicate((x) => f(run(x))),
  inspect: () => 'Predicate(?)'
})
`,
        // Ignores f entirely.
        `const Predicate = (run) => ({
  run,
  contramap: (f) => Predicate(run),
  inspect: () => 'Predicate(?)'
})
`,
      ],
      checks: (T, exp) => {
        const Predicate = exp.Predicate as (r: (x: any) => boolean) => any;

        T.check('contramap gives back a Predicate', () => {
          const p = Predicate((n: number) => n > 0).contramap((s: string) => s.length);
          return typeof p?.run === 'function' || `Got ${T.fmt(p)}`;
        });

        T.check('The function is applied on the way in', () => {
          const isLong = Predicate((n: number) => n > 3).contramap((s: string) => s.length);
          const short = isLong.run('hi');
          const long = isLong.run('hello');
          return (
            short === false && long === true ||
            `"hi" gave ${T.fmt(short)} and "hello" gave ${T.fmt(long)}, expected false and true. contramap turns a predicate about numbers into one about strings.`
          );
        });

        T.check('It changes what the predicate accepts, not what it answers', () => {
          const p = Predicate((n: number) => n > 0).contramap((n: number) => -n);
          const r = p.run(5);
          return (
            typeof r === 'boolean' && r === false ||
            `Got ${T.fmt(r)}. Negating the input means 5 arrives as -5, which is not positive. The answer is still a boolean.`
          );
        });

        laws.contravariant(T, {
          of: () => Predicate((n: number) => n > 0),
          run: (u: any, x: number) => u.run(x),
          runs: 50,
        });
      },
    },

    {
      id: 'recognize',
      covers: ['order-reverses'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which way does composition go?',
      prompt:
        'For a functor, `u.map(f).map(g)` equals `u.map(x => g(f(x)))`. What is the equivalent for contramap?',
      options: [
        {
          code: 'u.contramap(f).contramap(g)  ===  u.contramap(x => f(g(x)))',
          correct: true,
          why: 'The order reverses. Each contramap adds a step earlier in the pipeline, so the last one added runs first.',
        },
        {
          code: 'u.contramap(f).contramap(g)  ===  u.contramap(x => g(f(x)))',
          correct: false,
          why: 'That is the covariant order. Reading it that way is the classic mistake.',
        },
        {
          code: 'u.contramap(f).contramap(g)  ===  u.contramap(f)',
          correct: false,
          why: 'Then the second contramap would do nothing.',
        },
        {
          code: 'There is no composition law for contramap',
          correct: false,
          why: 'There is, and it is the reversed one. Both laws mirror the functor laws exactly.',
        },
      ],
    },
  ],
};
