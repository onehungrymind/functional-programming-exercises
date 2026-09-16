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
  ],
};
