import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const profunctor: ExerciseSet = {
  termId: 'profunctor',
  rubric: [
    {
      id: 'both-ends',
      statement:
        "Can adapt the input and the output of a function-like structure in one step, with the input function running first.",
    },
    {
      id: 'variance',
      statement:
        "Knows it is contravariant in what it consumes and covariant in what it produces.",
    },
    {
      id: 'composition-order',
      statement:
        "Knows the input functions compose in reverse and the output functions compose forwards.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `promap`'s type and see one arrow pointing in and one pointing out, and say which end each function adapts.",
    },
  ],
  notes: `A profunctor consumes on one side and produces on the other, so it can be adapted at both ends
at once.

\`\`\`js
const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => g(run(f(x))))
//                        ^^^^^^^^^^^^^^^ f on the way in, g on the way out
})

const length = Fn((s) => s.length)

const trimmedIsEven = length.promap(
  (s) => s.trim(),          // pre-process the input
  (n) => n % 2 === 0        // post-process the output
)

trimmedIsEven.run('  code  ')   // true   trims to 'code', length 4
trimmedIsEven.run(' hello ')    // false  trims to 'hello', length 5
\`\`\`

Order matters and is easy to get backwards. Running both functions on the output is a common
slip and it silently changes what the thing means:

\`\`\`js
promap: (f, g) => Fn((x) => g(f(run(x))))   // trims a number
\`\`\`

The variance follows from the direction of travel. The input side is
[contravariant](#contravariant-functor), because adapting it means accepting a **wider** set of
things by converting them first. The output side is covariant, the ordinary kind.

So the composition law is mixed:

\`\`\`js
p.promap(f, g).promap(h, i)
// equals
p.promap((x) => f(h(x)), (y) => i(g(y)))
//        ^^^^^^^^^^^^^^ reversed     ^^^^^^^^^^^^^^ forwards
\`\`\`

Functions are the canonical profunctor, and profunctors are the foundation under the optics in
this glossary: a lens is a profunctor transformation.`,
  typedNotes: `Same track, second lap. A profunctor is the two previous concepts in one signature, and the
arrows are the whole story.

\`\`\`ts
interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}
\`\`\`

Two functions, pointing opposite ways. \`f\` is \`(c: C) => A\`, coming **in** toward your input.
\`g\` is \`(b: B) => D\`, going **out** from your output. The result is \`Fn<C, D>\`, a function
from the new input to the new output, with yours sandwiched in the middle.

Line the three up and the family is obvious:

\`\`\`ts
interface Box<A>        { map:       <B>(f: (a: A) => B) => Box<B> }             // out only
interface Predicate<A>  { contramap: <B>(f: (b: B) => A) => Predicate<B> }       // in only
interface Fn<A, B>      { promap:    <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D> }
\`\`\`

A function is [contravariant](#contravariant-functor) in its argument and covariant in its
result, and \`promap\` is the one operation that adapts both ends at once.

\`\`\`ts
const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c) => g(run(f(c))))
})

const double: Fn<number, number> = fn((n) => n * 2)

const parseThenLabel = double.promap(
  (s: string) => Number(s),
  (n) => \`= \${n}\`
)
parseThenLabel.run('21')   // '= 42'
\`\`\`

The body is the only one that typechecks, and reading it right to left tells you the running
order: \`f\` first, then \`run\`, then \`g\`. That is why the composition law reverses on one side
and not the other. Swapping \`f\` and \`g\` is not a subtle bug you have to test for, it is a type
error, because \`f\` produces an \`A\` and \`g\` consumes a \`B\` and there is nothing that says those
are the same.`,
  rungs: [
    {
      id: 'implement',
      covers: ['both-ends', 'composition-order'],
      kind: 'code',
      role: 'implement',
      title: 'Adjust both ends of a function',
      prompt:
        "A Profunctor consumes on one side and produces on the other. `promap(f, g)` pre-processes the input with f and post-processes the output with g. Give `Fn` a `promap`.",
      hints: [
        'f runs first, on the way in. g runs last, on the way out.',
        'Three calls nested. Start from the argument the new function receives, get it into the shape the old one accepts, run it, then adapt what comes out.',
      ],
      exports: ['Fn'],
      starter: `// Fn :: (a -> b) -> Profunctor a b
const Fn = (run) => ({
  run,
  // promap :: ((a' -> a), (b -> b')) -> Profunctor a' b'
  promap: (f, g) => {
  },
  inspect: () => 'Fn(?)'
})
`,
      solution: `// Fn :: (a -> b) -> Profunctor a b
const Fn = (run) => ({
  run,
  // promap :: ((a' -> a), (b -> b')) -> Profunctor a' b'
  promap: (f, g) => Fn((x) => g(run(f(x)))),
  inspect: () => 'Fn(?)'
})
`,
      broken: [
        // Both functions on the output side.
        `const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => g(f(run(x)))),
  inspect: () => 'Fn(?)'
})
`,
        // The two ends swapped.
        `const Fn = (run) => ({
  run,
  promap: (f, g) => Fn((x) => f(run(g(x)))),
  inspect: () => 'Fn(?)'
})
`,
      ],
      checks: (T, exp) => {
        const Fn = exp.Fn as (r: (x: any) => any) => any;

        T.check('The input function runs first', () => {
          const length = Fn((s: string) => s.length);
          const trimmedLength = length.promap((s: string) => s.trim(), (n: number) => n);
          const r = trimmedLength.run('  ab  ');
          return (
            r === 2 ||
            `Got ${T.fmt(r)}, expected 2. Trimming has to happen before the length is taken, not after.`
          );
        });

        T.check('The output function runs last', () => {
          const length = Fn((s: string) => s.length);
          const isEven = length.promap((s: string) => s, (n: number) => n % 2 === 0);
          const r = isEven.run('abcd');
          return r === true || `Got ${T.fmt(r)}, expected true.`;
        });

        T.check('Both ends together', () => {
          const length = Fn((s: string) => s.length);
          const p = length.promap((s: string) => s.trim(), (n: number) => n % 2 === 0);
          const four = p.run('  code  ');
          const five = p.run(' hello ');
          return (
            four === true && five === false ||
            `"code" gave ${T.fmt(four)} and "hello" gave ${T.fmt(five)}, expected true and false.`
          );
        });

        T.check('promap gives back something you can promap again', () => {
          const p = Fn((n: number) => n).promap((n: number) => n, (n: number) => n);
          return typeof p?.promap === 'function' || `Got ${T.fmt(p)}`;
        });

        laws.profunctor(T, { of: () => Fn((n: number) => n * 3), runs: 50 });
      },
    },

    {
      id: 'recognize',
      covers: ['variance'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which end is which?',
      prompt: 'A Profunctor `P a b` consumes an `a` and produces a `b`. How does it vary in each?',
      options: [
        {
          code: '// Contravariant in a, covariant in b',
          correct: true,
          why: 'The input side takes a function pointing the other way, and the output side takes one pointing the usual way.',
        },
        {
          code: '// Covariant in both',
          correct: false,
          why: 'That would be a bifunctor, not a profunctor.',
        },
        {
          code: '// Contravariant in both',
          correct: false,
          why: 'Then you could not post-process the result.',
        },
        {
          code: '// Covariant in a, contravariant in b',
          correct: false,
          why: 'The right idea, the wrong way round. The consuming side is the contravariant one.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['both-ends', 'variance', 'composition-order', 'typed-signature'],
      title: "Satisfy Fn<A, B>",
      prompt:
        "The interface is given. Fill in `fn` so `promap` adapts the input with `f` on the way in and the output with `g` on the way out.",
      hints: [
        "The result is `Fn<C, D>`, so the function you build takes a `C`. Start there and work inward.",
        "`f` turns that `C` into an `A`, which is what `run` accepts. `g` turns what `run` gives back into a `D`.",
        "Three calls nested: `g(run(f(c)))`. Get them in any other order and the types do not line up.",
      ],
      exports: ['fn'],
      starter: `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn(run) as never
})
`,
      solution: `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c) => g(run(f(c))))
})
`,
      broken: [
        `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c: never) => f(run(g(c as never) as never) as never)) as never
})
`,
        `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c: never) => g(run(c as never))) as never
})
`,
        `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c: never) => run(f(c)) as never) as never
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
        T.check('The Fn interface is still there to satisfy', () => {
          return /interface\s+Fn/.test(T.src) || 'The Fn interface has gone. It is the thing being satisfied.';
        });
        const fn = exp.fn;

        T.check('It still runs on its own', () => {
          const d = fn((n: number) => n * 2);
          return d.run(21) === 42 || `Doubling 21 gave ${T.fmt(d.run(21))}.`;
        });

        T.check('Both ends are adapted', () => {
          const d = fn((n: number) => n * 2);
          const p = d.promap((s: string) => Number(s), (n: number) => 'n is ' + n);
          const r = p.run('21');
          return r === 'n is 42' || `Parsing '21', doubling, then labelling gave ${T.fmt(r)}, expected 'n is 42'.`;
        });

        T.check('The input function runs first, not last', () => {
          const order: string[] = [];
          const d = fn((n: number) => { order.push('run'); return n; });
          d.promap((c: number) => { order.push('in'); return c; }, (b: number) => { order.push('out'); return b; }).run(1);
          return (
            T.eq(order, ['in', 'run', 'out']) ||
            `The three ran in the order ${T.fmt(order)}. The input adapter has to go first and the output adapter last.`
          );
        });

        T.check('Adapting only the output is not enough', () => {
          const d = fn((n: number) => n * 2);
          const p = d.promap((n: number) => n + 100, (n: number) => n);
          return p.run(1) === 202 || `With an input adapter that adds 100 before doubling, 1 gave ${T.fmt(p.run(1))}, expected 202.`;
        });

        T.law('promap with identity on both ends changes nothing', 60, (G) => {
          const h = G.fn();
          const n = G.int();
          const p = fn(h.f).promap((x: number) => x, (x: number) => x);
          return p.run(n) === h.f(n) || `With ${h.name} at ${n}, identity promap gave ${T.fmt(p.run(n))} instead of ${T.fmt(h.f(n))}.`;
        });

        T.law('Input adapters compose in reverse, output adapters compose forward', 60, (G) => {
          const h = G.fn();
          const f = G.fn();
          const g = G.fn();
          const n = G.int();
          const twice = fn(h.f).promap(f.f, f.f).promap(g.f, g.f);
          const once = fn(h.f).promap((x: number) => f.f(g.f(x)), (x: number) => g.f(f.f(x)));
          return (
            twice.run(n) === once.run(n) ||
            `With ${h.name} adapted by ${f.name} then ${g.name} at ${n}: one at a time gave ${T.fmt(twice.run(n))} and together gave ${T.fmt(once.run(n))}.`
          );
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'composition-order'],
      title: "One arrow in, one arrow out",
      prompt:
        "`f` is `(c: C) => A` coming in and `g` is `(b: B) => D` going out, so the order is `f`, then `run`, then `g`. Type the result of parsing a string, doubling, and labelling.",
      hints: [
        "The input adapter turns the string into a number before `double` ever sees it.",
        "`Number('21')` is 21, and doubling gives 42.",
        "The output adapter runs last, on the number that came out.",
      ],
      context: `interface Fn<A, B> {
  run: (a: A) => B
  promap: <C, D>(f: (c: C) => A, g: (b: B) => D) => Fn<C, D>
}

const fn = <A, B>(run: (a: A) => B): Fn<A, B> => ({
  run,
  promap: (f, g) => fn((c) => g(run(f(c))))
})

const double = fn((n: number) => n * 2)
`,
      placeholder: "'...'",
      expect: "= 42",
      solution: "double.promap((s: string) => Number(s), (n) => '= ' + n).run('21')",
      broken: ["'= 21'", "'= 4242'", "'21'"],
    },
  ],
};
