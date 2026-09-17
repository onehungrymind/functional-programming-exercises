import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const pointedFunctor: ExerciseSet = {
  termId: 'pointed-functor',
  rubric: [
    {
      id: 'of-lifts',
      statement:
        "Can add an of that puts a value into the container and does nothing else.",
    },
    {
      id: 'neutral',
      statement:
        "Knows of must not inspect or transform what it is given, including when it is handed a container.",
    },
    {
      id: 'why-it-matters',
      statement:
        "Can say what of is for: a known starting point that the applicative and monad laws are stated against.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `of`'s type and explain why being fully generic means it cannot inspect, change, or decide anything about the value.",
    },
  ],
  notes: `A Pointed Functor is a functor with an \`of\`: a way into the container that does the **least
interesting thing possible**.

\`\`\`js
Box.of = (value) => Box(value)

Box.of(3)   // Box(3)
\`\`\`

That sounds too small to name, and the rules are what make it worth naming. \`of\` must add
nothing:

\`\`\`js
Box.of = (value) => Box(value * 2)      // no
Box.of = (value) => value               // no, that is not a Box
\`\`\`

And it must not be clever about what it is handed. Lifting a container gives you a container in
a container, and that is correct:

\`\`\`js
Box.of(Box(1))                                  // Box(Box(1))
Box.of = (v) => (v && v.map ? v : Box(v))       // wrong: of always adds exactly one layer
\`\`\`

Flattening is [chain](#monad)'s job, not \`of\`'s.

The reason it earns a name is that everything above it is **stated in terms of it**. The
applicative and monad laws all mention \`of\`, so without a predictable one there is nothing to
state them against:

\`\`\`js
M.of(a).chain(f)      // has to equal f(a)              left identity
m.chain(M.of)         // has to equal m                 right identity
A.of((x) => x).ap(v)  // has to equal v                 applicative identity
\`\`\`

A useful consequence: lifting then mapping is the same as applying then lifting.

\`\`\`js
Box.of(n).map(f)      // equals Box.of(f(n))
\`\`\``,
  typedNotes: `Same track, second lap. \`of\` has one of the most constrained types in the whole glossary, and
the constraint is the point.

\`\`\`ts
interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({ ... })
\`\`\`

Read \`of\`'s type on its own: \`<A>(a: A) => Box<A>\`. \`A\` is a variable, not a type. The body
does not know whether it is holding a number, a user record, or a function, so there is
nothing it can do with the value except put it somewhere. It cannot branch on it, cannot
default it, cannot validate it. Being neutral is not restraint, it is the only behaviour the
signature leaves available.

\`\`\`ts
const of = <A>(a: A): Box<A> => ({
  value: a,
  map: (f) => of(f(a))
})
\`\`\`

Compare a lift that is not generic, and watch the freedom appear:

\`\`\`ts
const ofNumber = (a: number): Box<number> =>
  of(a < 0 ? 0 : a)   // it can do this, because it knows what it has
\`\`\`

That typechecks fine, and it is no longer a pointed functor's \`of\`. The moment the type
variable becomes a concrete type, the function is allowed to have opinions.

This is what makes \`of\` the entry point everything else assumes. The [applicative](#applicative-functor)
laws, the [monad](#monad) laws, \`chain\`'s left identity: they all say "wrapping and then doing
X is the same as doing X", and none of them hold if wrapping is allowed to change things.

\`\`\`ts
of(5).map((n) => n * 2).value   // 10, and of contributed nothing
\`\`\`

The other half of the type is \`map\` returning \`Box<B>\` rather than a bare \`B\`. A pointed
functor gives you the door in and keeps you inside once you are through.`,
  rungs: [
    {
      id: 'implement',
      covers: ['of-lifts', 'neutral'],
      kind: 'code',
      role: 'implement',
      title: 'A functor that knows how to lift',
      prompt:
        'A Pointed Functor is a functor with an `of` that puts any value into the most ordinary container it can. Add one to Box.',
      hints: [
        '`of` should do the least interesting thing possible: just wrap the value.',
        'It hangs off the constructor, so `Box.of(3)` works without an existing Box.',
      ],
      exports: ['Box'],
      starter: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

// of :: a -> Box a
Box.of = (value) => {
}
`,
      solution: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

// of :: a -> Box a
Box.of = (value) => Box(value)
`,
      broken: [
        // of does something extra, so it is no longer the neutral lift.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => Box(value * 2)
`,
        // of hands back the bare value.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => value
`,
        // of flattens a Box that is handed to it, which of must not do.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = (value) => (value && value.map ? value : Box(value))
`,
      ],
      checks: (T, exp) => {
        const Box = exp.Box as any;

        T.check('of gives back a Box', () => {
          const r = Box.of(3);
          return (r && typeof r.map === 'function') || `Got ${T.fmt(r)}`;
        });

        T.check('of wraps the value unchanged', () => {
          const r = Box.of(3);
          return r.value === 3 || `Box.of(3) holds ${T.fmt(r.value)}. of is the neutral way in: it should add nothing.`;
        });

        T.check('of does nothing clever with a container', () => {
          const inner = Box(1);
          const r = Box.of(inner);
          return (
            r.value === inner ||
            `Box.of(Box(1)) unwrapped its argument. of lifts exactly one level, whatever it is given. Flattening is chain's job.`
          );
        });

        T.law('Lifting then mapping equals lifting the applied value', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const left = Box.of(n).map(f.f).value;
          const right = Box.of(f.f(n)).value;
          return (
            left === right ||
            `With n = ${n}, f = ${f.name}: mapping after of gave ${T.fmt(left)}, of after applying gave ${T.fmt(right)}.`
          );
        });

        laws.functor(T, { of: (x: any) => Box.of(x), runs: 50 });
      },
    },

    {
      id: 'recognize',
      covers: ['why-it-matters', 'neutral'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is of allowed to do?',
      prompt: 'Pick the rule `of` has to follow.',
      options: [
        {
          code: '// Put the value in the container and nothing else',
          correct: true,
          why: 'of is the neutral way in. Anything extra would break the laws that build on it.',
        },
        {
          code: '// Validate the value and reject bad ones',
          correct: false,
          why: 'That would make of partial, and the applicative laws assume it always succeeds.',
        },
        {
          code: '// Flatten the value if it is already a container',
          correct: false,
          why: 'of always adds exactly one layer. Removing one is what chain does.',
        },
        {
          code: '// Pick the most appropriate case for the value',
          correct: false,
          why: 'Tempting for something like Either, but of has to be predictable. It always goes to the same side.',
        },
      ],
    },

    {
      id: 'entry-point',
      kind: 'code',
      role: 'apply',
      covers: ['why-it-matters', 'of-lifts'],
      title: "Write a pipeline that works for any pointed functor",
      prompt:
        "`of` is what lets generic code start from a bare value without knowing which container it is building. Write `runPipeline`, which takes a functor, a plain value and some functions, and works unchanged for two different containers.",
      hints: [
        "`runPipeline` lifts the value with `F.of`, then maps each function over it in turn.",
        "It must never mention Box or Maybe by name. Everything it needs arrives in `F`.",
        "`Logged.of` is the second container. If your pipeline works for Box and not for it, something is hardcoded.",
      ],
      exports: ['Box', 'Logged', 'runPipeline'],
      starter: `// Box :: a -> { value, map }
const Box = { of: (a) => ({ value: a, map: (f) => Box.of(a) }) }

// Logged :: a -> { value, seen, map }   remembers every value it has held
const Logged = {
  of: (a, seen = [a]) => ({ value: a, seen, map: (f) => Logged.of(a, seen) })
}

// runPipeline :: (Pointed, a, [a -> a]) -> F a
const runPipeline = (F, value, fns) => F.of(value)
`,
      solution: `// Box :: a -> { value, map }
const Box = { of: (a) => ({ value: a, map: (f) => Box.of(f(a)) }) }

// Logged :: a -> { value, seen, map }   remembers every value it has held
const Logged = {
  of: (a, seen = [a]) => ({
    value: a,
    seen,
    map: (f) => Logged.of(f(a), [...seen, f(a)])
  })
}

// runPipeline :: (Pointed, a, [a -> a]) -> F a
const runPipeline = (F, value, fns) => fns.reduce((acc, f) => acc.map(f), F.of(value))
`,
      broken: [
        `const Box = { of: (a) => ({ value: a, map: (f) => Box.of(f(a)) }) }
const Logged = {
  of: (a, seen = [a]) => ({ value: a, seen, map: (f) => Logged.of(f(a), [...seen, f(a)]) })
}
const runPipeline = (F, value, fns) => fns.reduce((acc, f) => Box.of(f(acc.value)), F.of(value))
`,
        `const Box = { of: (a) => ({ value: a, map: (f) => Box.of(f(a)) }) }
const Logged = {
  of: (a, seen = [a]) => ({ value: a, seen, map: (f) => Logged.of(f(a), [f(a)]) })
}
const runPipeline = (F, value, fns) => fns.reduce((acc, f) => acc.map(f), F.of(value))
`,
        `const Box = { of: (a) => ({ value: a, map: (f) => Box.of(a) }) }
const Logged = {
  of: (a, seen = [a]) => ({ value: a, seen, map: (f) => Logged.of(f(a), [...seen, f(a)]) })
}
const runPipeline = (F, value, fns) => fns.reduce((acc, f) => acc.map(f), F.of(value))
`,
        `const Box = { of: (a) => ({ value: a, map: (f) => Box.of(f(a)) }) }
const Logged = {
  of: (a, seen = [a]) => ({ value: a, seen, map: (f) => Logged.of(f(a), [...seen, f(a)]) })
}
const runPipeline = (F, value, fns) => fns.reduce((acc, f) => f(acc), value)
`,
      ],
      checks: (T, exp) => {
        const { Box, Logged, runPipeline } = exp;
        const fns = [(n: number) => n + 1, (n: number) => n * 2];

        T.check('It works for Box', () => {
          const r = runPipeline(Box, 3, fns);
          return r && r.value === 8 || `Over Box it gave ${T.fmt(r)}, expected a container holding 8.`;
        });

        T.check('The same code works for the other container', () => {
          const r = runPipeline(Logged, 3, fns);
          return r && r.value === 8 || `Over Logged it gave ${T.fmt(r)}, expected a container holding 8.`;
        });

        T.check('Each container keeps its own behaviour', () => {
          const r = runPipeline(Logged, 3, fns);
          return (
            T.eq(r.seen, [3, 4, 8]) ||
            `Logged remembered ${T.fmt(r.seen)}, expected [3, 4, 8]. The pipeline is the same; what the container does along the way is its business.`
          );
        });

        T.check('The result stays in the container', () => {
          const r = runPipeline(Box, 3, fns);
          return typeof r.map === 'function' || `It gave ${T.fmt(r)}, which cannot be mapped again. of is the door in and map keeps you inside.`;
        });

        T.check('An empty pipeline is just the lift', () => {
          const r = runPipeline(Box, 5, []);
          return (
            r && r.value === 5 ||
            `With no functions it gave ${T.fmt(r)}. of has to be neutral, so lifting and doing nothing leaves the value exactly as it was.`
          );
        });

        T.check('The pipeline names no container', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const runPipeline'));
          return (
            !/\b(Box|Logged)\b/.test(body) ||
            'runPipeline mentions a container by name. Everything it needs arrives in F, and that is the whole reason of exists as an interface rather than a constructor.'
          );
        });

        T.law('Lifting then mapping agrees with lifting the answer', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const a = runPipeline(Box, n, [f.f]).value;
          const b = Box.of(f.f(n)).value;
          return a === b || `With ${f.name} at ${n}: ${T.fmt(a)} against ${T.fmt(b)}. This is the law that fails first when of is not neutral.`;
        });

        T.check('Three steps run in order', () => {
          const r = runPipeline(Logged, 1, [(n: number) => n + 1, (n: number) => n * 10, (n: number) => n - 5]);
          return T.eq(r.seen, [1, 2, 20, 15]) || `Logged remembered ${T.fmt(r.seen)}.`;
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['of-lifts', 'neutral', 'typed-signature'],
      title: "Satisfy Box<A>",
      prompt:
        "The interface is given. Write `of` so it lifts any value at all without touching it, and `map` so it stays inside the box.",
      hints: [
        "`of` is typed `<A>(a: A) => Box<A>`. It cannot look at the value, so it should not try.",
        "`map` owes a `Box<B>`, and `f` gives a bare `B`, so wrap the result.",
        "No defaulting, no coercing, no special case for anything.",
      ],
      exports: ['of'],
      starter: `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({
  value: a,
  map: (f) => of(a) as never
})
`,
      solution: `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({
  value: a,
  map: (f) => of(f(a))
})
`,
      broken: [
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({
  value: (a === null || a === undefined ? 0 : a) as A,
  map: (f) => of(f(a))
})
`,
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({
  value: a,
  map: (f) => f(a) as never
})
`,
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
}

const of = <A>(a: A): Box<A> => ({
  value: (typeof a === 'number' ? (a as number) * 1 : a) as A,
  map: (f) => of(a) as never
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
        T.check('The Box interface is still there to satisfy', () => {
          return /interface\s+Box/.test(T.src) || 'The Box interface has gone. It is the thing being satisfied.';
        });
        const of = exp.of;

        T.check('of puts the value where you can read it', () => {
          const b = of(5);
          return b.value === 5 || `of(5) gave a box holding ${T.fmt(b.value)}.`;
        });

        T.check('of lifts anything at all, without opinions', () => {
          const cases: unknown[] = [0, '', false, null, undefined, NaN];
          for (const c of cases) {
            const got = of(c).value;
            const same = Number.isNaN(c as number) ? Number.isNaN(got as number) : got === c;
            if (!same) {
              return `of(${T.fmt(c)}) gave a box holding ${T.fmt(got)}. The type variable means \`of\` cannot know what it has, so it cannot treat any value specially.`;
            }
          }
          return true;
        });

        T.check('An object goes in as itself, not a copy', () => {
          const o = { name: 'ada' };
          return of(o).value === o || 'The object was rebuilt on the way in. Lifting is not copying.';
        });

        T.check('map stays inside the box', () => {
          const r = of(5).map((n: number) => n * 2);
          return (
            (r && typeof r.map === 'function' && r.value === 10) ||
            `Mapping gave ${T.fmt(r)}, which should be another Box so it can be mapped again.`
          );
        });

        T.check('Mapping twice works', () => {
          const r = of(5).map((n: number) => n + 1).map((n: number) => n * 10);
          return r.value === 60 || `Two maps gave ${T.fmt(r.value)}, expected 60.`;
        });

        T.law('Lifting then mapping is the same as lifting the result', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const a = of(n).map(f.f).value;
          const b = of(f.f(n)).value;
          return a === b || `With ${f.name} at ${n}: ${T.fmt(a)} against ${T.fmt(b)}. This is the law that fails first when \`of\` is not neutral.`;
        });

        T.law('Mapping with identity changes nothing', 60, (G) => {
          const n = G.int();
          const r = of(n).map((x: number) => x).value;
          return r === n || `${n} came back as ${T.fmt(r)}.`;
        });
      },
    },
  ],
};
