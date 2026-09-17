import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const comonad: ExerciseSet = {
  termId: 'comonad',
  rubric: [
    {
      id: 'arrows-reversed',
      statement:
        "Knows a comonad is a monad with the arrows reversed: extract takes a value out where of puts one in.",
    },
    {
      id: 'extend-sees-context',
      statement:
        "Can write extend, and knows the function it takes receives the whole container rather than the value inside.",
    },
    {
      id: 'laws',
      statement:
        "Can check the two identity laws and associativity for a comonad instance.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can put a monad's signatures next to a comonad's and show that every arrow has turned around.",
    },
  ],
  notes: `A comonad is a monad with every arrow turned round. Put the signatures side by side:

\`\`\`js
// Monad                          Comonad
// of      :: a -> m a            extract :: w a -> a
// chain   :: (a -> m b)          extend  :: (w a -> b)
//            -> m a -> m b                  -> w a -> w b
\`\`\`

\`of\` puts a value in; \`extract\` takes one out. \`chain\` takes a function that **produces**
a container; \`extend\` takes one that **consumes** a container.

\`\`\`js
const CoIdentity = (value) => ({
  value,
  map: (f) => CoIdentity(f(value)),
  extract: () => value,
  extend: (f) => CoIdentity(f(CoIdentity(value)))
})
\`\`\`

The part that catches people is that \`extend\` hands the function the **whole container**, not
the value:

\`\`\`js
CoIdentity(3).extend((w) => w.extract() + 1)   // CoIdentity(4)
//                    ^ w is a CoIdentity, not 3

extend: (f) => CoIdentity(f(value))            // wrong: f gets the bare value
\`\`\`

That is the whole point of the shape: \`f\` can look at the **context**, not just the value. For
CoIdentity there is no context to look at, which is why the interesting comonads are things like
a zipper over a list, where \`extract\` is the element under the cursor and \`extend\` runs a
function at every position with its neighbours available. A blur filter is an extend over an
image.

The laws mirror the monad laws exactly:

\`\`\`js
w.extend((w) => w.extract())          // equals w
w.extend(f).extract()                 // equals f(w)
w.extend(f).extend(g)                 // equals w.extend((w) => g(w.extend(f)))
\`\`\``,
  typedNotes: `Same track, second lap. "The arrows are reversed" is the standard line about comonads, and
until you write the types down it is just a line.

\`\`\`ts
interface Monad<A> {
  of:    (a: A)                    => Monad<A>    // value  ->  wrapped
  chain: <B>(f: (a: A) => Monad<B>) => Monad<B>
}

interface Comonad<A> {
  extract: ()                          => A       // wrapped  ->  value
  extend:  <B>(f: (w: Comonad<A>) => B) => Comonad<B>
}
\`\`\`

Two reversals, and they are both literal. \`of\` goes value to wrapped; \`extract\` goes wrapped
to value, the same arrow read backwards. \`chain\`'s function takes a bare \`A\` and returns a
wrapped \`B\`; \`extend\`'s function takes a **wrapped** \`A\` and returns a bare \`B\`. Cover the
names and you could not tell which one you were looking at except by which end the wrapper
sits on.

\`\`\`ts
interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity(f(coidentity(value)))
})
\`\`\`

The consequence is what \`extend\` can see. \`map\`'s function is handed the value and nothing
else. \`extend\`'s function is handed the whole container, so it can look at the surroundings
and not only the thing in focus:

\`\`\`ts
const w = coidentity(5)

w.extend((c) => c.extract() * 2).extract()   // 10, used the value
w.extend((c) => typeof c.extract()).extract() // 'number', asked about it
\`\`\`

On CoIdentity there is no surrounding context to speak of, which is exactly why it is the one
to learn on: the shape is visible without the payoff getting in the way. On a zipper or a
grid, \`f\` seeing the whole container is the difference between a cell and its neighbours.`,
  rungs: [
    {
      id: 'implement',
      covers: ['extend-sees-context', 'laws'],
      kind: 'code',
      role: 'implement',
      title: 'extract and extend',
      prompt:
        'A Comonad is a Monad with the arrows turned round. Where `of` puts a value in, `extract` takes one out; where `chain` takes a function that wraps, `extend` takes one that unwraps.',
      hints: [
        '`extract` simply hands the value back.',
        '`extend(f)` calls f with the whole container, not with the value inside, and wraps the answer.',
      ],
      exports: ['CoIdentity'],
      starter: `// CoIdentity :: a -> CoIdentity a
const CoIdentity = (value) => ({
  value,
  map: (f) => CoIdentity(f(value)),
  // extract :: CoIdentity a ~> () -> a
  extract: () => {
  },
  // extend :: CoIdentity a ~> (CoIdentity a -> b) -> CoIdentity b
  extend: (f) => {
  },
  inspect: () => \`CoIdentity(\${JSON.stringify(value)})\`
})
`,
      solution: `// CoIdentity :: a -> CoIdentity a
const CoIdentity = (value) => ({
  value,
  map: (f) => CoIdentity(f(value)),
  extract: () => value,
  extend: (f) => CoIdentity(f(CoIdentity(value))),
  inspect: () => \`CoIdentity(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // extend passes the bare value instead of the container.
        `const CoIdentity = (value) => ({
  value,
  map: (f) => CoIdentity(f(value)),
  extract: () => value,
  extend: (f) => CoIdentity(f(value)),
  inspect: () => \`CoIdentity(\${JSON.stringify(value)})\`
})
`,
        // extend forgets to wrap the result.
        `const CoIdentity = (value) => ({
  value,
  map: (f) => CoIdentity(f(value)),
  extract: () => value,
  extend: (f) => f(CoIdentity(value)),
  inspect: () => \`CoIdentity(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const CoIdentity = exp.CoIdentity as (v: any) => any;

        T.check('extract gives the value back', () => {
          const r = CoIdentity(7).extract();
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('extend hands the whole container to the function', () => {
          let received: any;
          CoIdentity(3).extend((w: any) => {
            received = w;
            return 0;
          });
          return (
            received && typeof received.extract === 'function' ||
            `The function received ${T.fmt(received)}. extend passes the container, which is what lets f look at its context.`
          );
        });

        T.check('extend wraps its result', () => {
          const r = CoIdentity(3).extend((w: any) => w.extract() + 1);
          return (
            r && typeof r.extract === 'function' && r.extract() === 4 ||
            `Got ${T.fmt(r)}, expected CoIdentity(4).`
          );
        });

        T.check('extend can be chained', () => {
          const r = CoIdentity(1)
            .extend((w: any) => w.extract() + 1)
            .extend((w: any) => w.extract() * 10);
          return r?.extract?.() === 20 || `Got ${T.fmt(r)}, expected CoIdentity(20).`;
        });

        laws.comonad(T, { of: CoIdentity, runs: 60 });
      },
    },

    {
      id: 'recognize',
      covers: ['arrows-reversed'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Monad or comonad?',
      prompt: 'Which pair of signatures belongs to a Comonad?',
      options: [
        {
          code: '// extract :: w a -> a\n// extend  :: (w a -> b) -> w a -> w b',
          correct: true,
          why: 'Both point out of the container. The function extend takes consumes a container and produces a plain value.',
        },
        {
          code: '// of    :: a -> m a\n// chain :: (a -> m b) -> m a -> m b',
          correct: false,
          why: 'That is the Monad pair, with the arrows the other way.',
        },
        {
          code: '// extract :: a -> w a\n// extend  :: (b -> w a) -> w a -> w b',
          correct: false,
          why: 'extract points the wrong way. It takes a value out, not in.',
        },
        {
          code: '// map :: (a -> b) -> w a -> w b\n// ap  :: w (a -> b) -> w a -> w b',
          correct: false,
          why: 'Functor and Apply. Every comonad is a functor, but these are not what makes it one.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['arrows-reversed', 'extend-sees-context', 'typed-signature'],
      title: "Satisfy CoIdentity<A>",
      prompt:
        "The interface is given. Write `coidentity` so `extract` takes the value out and `extend` hands the whole container to its function.",
      hints: [
        "`extract` returns `A`. It is the mirror of a monad's `of`, which takes one.",
        "`extend`'s `f` is typed `(w: CoIdentity<A>) => B`. It wants the container, not the value.",
        "`f` returns a bare `B`, and `extend` owes a `CoIdentity<B>`, so that result gets wrapped.",
      ],
      exports: ['coidentity'],
      starter: `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity(value) as never
})
`,
      solution: `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity(f(coidentity(value)))
})
`,
      broken: [
        `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity((f as (v: never) => never)(value as never))
})
`,
        `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => f(coidentity(value)) as never
})
`,
        `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity(value) as never
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
        T.check('The CoIdentity interface is still there to satisfy', () => {
          return /interface\s+CoIdentity/.test(T.src) || 'The CoIdentity interface has gone. It is the thing being satisfied.';
        });
        const co = exp.coidentity;

        T.check('extract takes the value back out', () => {
          const r = co(5).extract();
          return r === 5 || `extract on a CoIdentity of 5 gave ${T.fmt(r)}.`;
        });

        T.check('extend hands its function the container, not the value', () => {
          let seen: { extract?: unknown } | undefined;
          co(5).extend((w: { extract: () => number }) => { seen = w; return 0; });
          return (
            (typeof seen?.extract === 'function') ||
            `The function was handed ${T.fmt(seen)}. \`f\` is typed to take the whole container, which is the difference from map.`
          );
        });

        T.check('extend wraps what the function gives back', () => {
          const r = co(5).extend((w: { extract: () => number }) => w.extract() * 2);
          return (
            (r && typeof r.extract === 'function' && r.extract() === 10) ||
            `Doubling through extend gave ${T.fmt(r)}. It owes a CoIdentity, so the bare result gets wrapped.`
          );
        });

        T.check('Extending twice keeps working', () => {
          const r = co(5)
            .extend((w: { extract: () => number }) => w.extract() + 1)
            .extend((w: { extract: () => number }) => w.extract() * 10);
          return r.extract() === 60 || `Two extends gave ${T.fmt(r.extract())}, expected 60.`;
        });

        T.check('The function can ask about the value, not just use it', () => {
          const r = co(5).extend((w: { extract: () => number }) => typeof w.extract());
          return r.extract() === 'number' || `Asking the type through extend gave ${T.fmt(r.extract())}.`;
        });

        T.law('Extending with extract changes nothing', 60, (G) => {
          const n = G.int();
          const r = co(n).extend((w: { extract: () => number }) => w.extract()).extract();
          return r === n || `${n} came back as ${T.fmt(r)}.`;
        });

        T.law('Extracting after an extend is just running the function', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const run = (w: { extract: () => number }) => f.f(w.extract());
          const a = co(n).extend(run).extract();
          const b = run(co(n));
          return a === b || `With ${f.name} at ${n}: ${T.fmt(a)} against ${T.fmt(b)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'laws'],
      title: "extend hands over the container, not the value",
      prompt:
        "`extend` takes `(w: CoIdentity<A>) => B`, so its function receives the whole container. Type an array of what a map-like function and a container-aware one give.",
      hints: [
        "A monad's chain takes a bare `A`. A comonad's extend takes a wrapped one.",
        "`typeof w` would say 'object', because `w` is the container.",
        "`w.extract()` is how you reach the value from inside.",
      ],
      context: `interface CoIdentity<A> {
  value: A
  extract: () => A
  extend: <B>(f: (w: CoIdentity<A>) => B) => CoIdentity<B>
}

const coidentity = <A>(value: A): CoIdentity<A> => ({
  value,
  extract: () => value,
  extend: (f) => coidentity(f(coidentity(value)))
})
`,
      placeholder: "[..., ...]",
      expect: [10,"object"],
      solution: "[coidentity(5).extend((w) => w.extract() * 2).extract(), coidentity(5).extend((w) => typeof w).extract()]",
      broken: ["[10, 'number']", "[5, 'object']", "[10, 'function']"],
    },
  ],
};
