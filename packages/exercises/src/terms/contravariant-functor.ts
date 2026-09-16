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
    {
      id: 'typed-signature',
      statement:
        "Can read `contramap`'s type and see the arrow pointing the other way, `(b: B) => A` where map would have `(a: A) => B`.",
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
  typedNotes: `Same track, second lap. This is the concept where the types stop being decoration. The whole
idea is one arrow pointing the other way, and in JavaScript you had to take that on faith.

\`\`\`ts
interface Functor<A>   { map:       <B>(f: (a: A) => B) => Functor<B> }
interface Predicate<A> { contramap: <B>(f: (b: B) => A) => Predicate<B> }
\`\`\`

Put your finger on the two \`f\`s. \`map\` takes \`(a: A) => B\`: it starts where you are and goes
where you want. \`contramap\` takes \`(b: B) => A\`: it starts where you want and comes back to
where you are. Both return a thing parameterised by \`B\`. Same destination, opposite arrow.

The reason is sitting in what a predicate is made of:

\`\`\`ts
interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate((b) => run(f(b)))
})
\`\`\`

\`A\` only ever appears as an argument. To end up with something that accepts \`B\`, you need a
way to turn a \`B\` into an \`A\` before \`run\` ever sees it, so the function has to point inward.
There is no other way to write a body that typechecks.

\`\`\`ts
const isLong: Predicate<string> = predicate((s) => s.length > 3)

const nameIsLong: Predicate<{ name: string }> = isLong.contramap((p) => p.name)
nameIsLong.run({ name: 'Ada' })       // false
nameIsLong.run({ name: 'Grace' })     // true
\`\`\`

TypeScript can be told about this directly. Since 4.7 you can annotate a type parameter with
\`in\` for contravariant and \`out\` for covariant, and the compiler will reject a definition that
does not match:

\`\`\`ts
interface Predicate<in A>  { run: (a: A) => boolean }   // A only goes in
interface Box<out A>       { value: A }                 // A only comes out
\`\`\`

Write \`interface Predicate<out A>\` on that first one and it is an error, because \`A\` is in an
argument position. That is the variance you were reasoning about by hand, checked.`,
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['maps-the-input', 'order-reverses', 'typed-signature'],
      title: "Satisfy Predicate<A>",
      prompt:
        "The interface is given. Fill in `predicate` so `contramap` builds a predicate over a new type by converting into the old one first.",
      hints: [
        "`f` is typed `(b: B) => A`. It runs before `run` does, not after.",
        "The result is a `Predicate<B>`, so build one with `predicate` again.",
        "If you find yourself wanting to call `f` on the result of `run`, check the arrow direction again. `run` gives a boolean, and `f` does not take one.",
      ],
      exports: ['predicate'],
      starter: `interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate(run) as never
})
`,
      solution: `interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate((b) => run(f(b)))
})
`,
      broken: [
        `interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate((b: never) => f(run(b) as never) as never) as never
})
`,
        `interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate(run) as never
})
`,
        `interface Predicate<A> {
  run: (a: A) => boolean
  contramap: <B>(f: (b: B) => A) => Predicate<B>
}

const predicate = <A>(run: (a: A) => boolean): Predicate<A> => ({
  run,
  contramap: (f) => predicate((b: never) => !run(f(b))) as never
})
`,
      ],
      checks: (T, exp) => {
        T.check('The annotations are still doing work', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          if (/(:\s*any\b)|(\bas\s+any\b)/.test(src)) {
            return 'The answer leans on `any`, which satisfies nothing. The point is to satisfy the signature.';
          }
          return true;
        });
        T.check('The Predicate interface is still there to satisfy', () => {
          return /interface\s+Predicate/.test(T.src) || 'The Predicate interface has gone. It is the thing being satisfied.';
        });
        const predicate = exp.predicate;

        T.check('A predicate runs', () => {
          const p = predicate((s: string) => s.length > 3);
          return (p.run('Grace') === true && p.run('Ada') === false) || `'Grace' and 'Ada' gave ${T.fmt(p.run('Grace'))} and ${T.fmt(p.run('Ada'))}.`;
        });

        T.check('contramap gives back a predicate over the new type', () => {
          const p = predicate((s: string) => s.length > 3).contramap((o: { name: string }) => o.name);
          return typeof p.run === 'function' || `contramap gave ${T.fmt(p)}, which has nothing to run.`;
        });

        T.check('The function runs on the way in, before the predicate does', () => {
          const isLong = predicate((s: string) => s.length > 3);
          const nameIsLong = isLong.contramap((o: { name: string }) => o.name);
          return (
            (nameIsLong.run({ name: 'Grace' }) === true && nameIsLong.run({ name: 'Ada' }) === false) ||
            `Grace and Ada gave ${T.fmt(nameIsLong.run({ name: 'Grace' }))} and ${T.fmt(nameIsLong.run({ name: 'Ada' }))}. The conversion has to happen before the test, not after.`
          );
        });

        T.check('The answer is not just inverted', () => {
          const isPos = predicate((n: number) => n > 0);
          const q = isPos.contramap((n: number) => n);
          return q.run(5) === true || `Contramapping with identity flipped the answer. contramap changes what goes in, never what comes out.`;
        });

        T.law('Contramapping with identity changes nothing', 60, (G) => {
          const f = G.pred();
          const n = G.int();
          const p = predicate(f.f);
          const q = p.contramap((x: number) => x);
          return q.run(n) === p.run(n) || `With ${f.name} at ${n}, identity contramap gave ${T.fmt(q.run(n))} instead of ${T.fmt(p.run(n))}.`;
        });

        T.law('Two contramaps compose in reverse order', 60, (G) => {
          const p = G.pred();
          const f = G.fn();
          const g = G.fn();
          const n = G.int();
          const twice = predicate(p.f).contramap(f.f).contramap(g.f);
          const once = predicate(p.f).contramap((x: number) => f.f(g.f(x)));
          return (
            twice.run(n) === once.run(n) ||
            `With ${p.name}, ${f.name} and ${g.name} at ${n}: contramapping one at a time gave ${T.fmt(twice.run(n))}, and contramapping with f after g gave ${T.fmt(once.run(n))}. The order reverses.`
          );
        });
      },
    },
  ],
};
