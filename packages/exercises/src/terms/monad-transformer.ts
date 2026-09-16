import type { ExerciseSet } from '@fpx/engine/types';

export const monadTransformer: ExerciseSet = {
  termId: 'monad-transformer',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Stack Maybe on top of another monad',
      prompt:
        'Two monads do not compose on their own. A transformer knows how to sit on top of one: `MaybeT` gives you Maybe behavior inside whatever it wraps, with one chain instead of two.',
      hints: [
        'A MaybeT holds an inner monad whose value is a Maybe.',
        '`chain` unwraps the inner monad, then looks at the Maybe. On Nothing it stops; on Just it runs f and takes its inner value.',
      ],
      exports: ['MaybeT'],
      starter: `const Just = (value) => ({ isNothing: false, value })
const Nothing = () => ({ isNothing: true })

// Id is the simplest possible inner monad.
const Id = (value) => ({
  value,
  map: (f) => Id(f(value)),
  chain: (f) => f(value)
})

// MaybeT :: m (Maybe a) -> MaybeT m a
const MaybeT = (inner) => ({
  inner,
  map: (f) => {
  },
  chain: (f) => {
  },
  runMaybeT: () => inner
})
`,
      solution: `const Just = (value) => ({ isNothing: false, value })
const Nothing = () => ({ isNothing: true })

const Id = (value) => ({
  value,
  map: (f) => Id(f(value)),
  chain: (f) => f(value)
})

// MaybeT :: m (Maybe a) -> MaybeT m a
const MaybeT = (inner) => ({
  inner,
  map: (f) =>
    MaybeT(inner.map((maybe) => (maybe.isNothing ? Nothing() : Just(f(maybe.value))))),
  chain: (f) =>
    MaybeT(
      inner.chain((maybe) =>
        maybe.isNothing ? Id(Nothing()) : f(maybe.value).runMaybeT()
      )
    ),
  runMaybeT: () => inner
})
`,
      broken: [
        // chain forgets to unwrap the result of f, so the layers multiply.
        `const Just = (value) => ({ isNothing: false, value })
const Nothing = () => ({ isNothing: true })
const Id = (value) => ({ value, map: (f) => Id(f(value)), chain: (f) => f(value) })

const MaybeT = (inner) => ({
  inner,
  map: (f) => MaybeT(inner.map((m) => (m.isNothing ? Nothing() : Just(f(m.value))))),
  chain: (f) => MaybeT(inner.chain((m) => (m.isNothing ? Id(Nothing()) : f(m.value)))),
  runMaybeT: () => inner
})
`,
        // map ignores the Nothing case and applies f to undefined.
        `const Just = (value) => ({ isNothing: false, value })
const Nothing = () => ({ isNothing: true })
const Id = (value) => ({ value, map: (f) => Id(f(value)), chain: (f) => f(value) })

const MaybeT = (inner) => ({
  inner,
  map: (f) => MaybeT(inner.map((m) => Just(f(m.value)))),
  chain: (f) => MaybeT(inner.chain((m) => (m.isNothing ? Id(Nothing()) : f(m.value).runMaybeT()))),
  runMaybeT: () => inner
})
`,
      ],
      checks: (T, exp) => {
        const MaybeT = exp.MaybeT as (inner: any) => any;
        const Just = (v: any) => ({ isNothing: false, value: v });
        const Nothing = () => ({ isNothing: true });
        const Id = (v: any): any => ({ value: v, map: (f: any) => Id(f(v)), chain: (f: any) => f(v) });

        const read = (mt: any) => {
          const inner = mt.runMaybeT();
          return inner.value;
        };

        T.check('map reaches through both layers', () => {
          const r = read(MaybeT(Id(Just(2))).map((n: number) => n + 1));
          return (r?.isNothing === false && r.value === 3) || `Got ${T.fmt(r)}, expected Just(3).`;
        });

        T.check('map skips a Nothing', () => {
          const spy = T.spyFn((n: number) => n + 1);
          const r = read(MaybeT(Id(Nothing())).map(spy));
          if (spy.calls.length > 0) return `The function ran on a Nothing, with ${T.fmt(spy.calls[0])}.`;
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('chain runs a step and stays one layer deep', () => {
          const r = read(MaybeT(Id(Just(2))).chain((n: number) => MaybeT(Id(Just(n * 10)))));
          return (
            r?.isNothing === false && r.value === 20 ||
            `Got ${T.fmt(r)}, expected Just(20). If you see a MaybeT in there, chain kept the layer f returned instead of unwrapping it.`
          );
        });

        T.check('chain short-circuits on Nothing', () => {
          const spy = T.spyFn((n: number) => MaybeT(Id(Just(n))));
          const r = read(MaybeT(Id(Nothing())).chain(spy));
          if (spy.calls.length > 0) return 'The step ran even though the value was Nothing.';
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A step can introduce a Nothing partway through', () => {
          const r = read(
            MaybeT(Id(Just(2)))
              .chain(() => MaybeT(Id(Nothing())))
              .map((n: number) => n * 100),
          );
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('One chain does the work of two', () => {
          // Without the transformer you would chain the outer monad and then the Maybe.
          const r = read(
            MaybeT(Id(Just(1)))
              .chain((n: number) => MaybeT(Id(Just(n + 1))))
              .chain((n: number) => MaybeT(Id(Just(n * 10)))),
          );
          return (r?.value === 20) || `Got ${T.fmt(r)}, expected Just(20).`;
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Why do transformers exist?',
      prompt: 'What problem does a monad transformer solve?',
      options: [
        {
          code: '// Monads do not compose in general, so each one ships a\n// transformer that knows how to sit on top of another',
          correct: true,
          why: 'Two functors always compose. Two monads do not, so the knowledge has to be supplied per monad.',
        },
        {
          code: '// They make monads faster',
          correct: false,
          why: 'They add a layer of wrapping. Speed is not the trade.',
        },
        {
          code: '// They turn any functor into a monad',
          correct: false,
          why: 'That is the Free monad.',
        },
        {
          code: '// They let a monad be used without chain',
          correct: false,
          why: 'Chain is exactly what they give you: one instead of two.',
        },
      ],
    },
  ],
};
