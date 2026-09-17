import type { ExerciseSet } from '@fpx/engine/types';

export const monadTransformer: ExerciseSet = {
  termId: 'monad-transformer',
  rubric: [
    {
      id: 'monads-do-not-compose',
      statement:
        "Knows two monads do not compose in general, so each one ships a transformer that knows how to sit on another.",
    },
    {
      id: 'one-chain',
      statement:
        "Can chain through a stacked monad in one step rather than unwrapping each layer.",
    },
    {
      id: 'unwrap-the-result',
      statement:
        "Knows chain must unwrap what the function returned, or the layers multiply.",
    },
  ],
  notes: `Two functors always compose. Two monads do not, which is the whole reason transformers exist.
A \`MaybeT\` knows how to sit on top of another monad and give you Maybe behaviour inside it.

\`\`\`js
const MaybeT = (inner) => ({
  inner,
  map: (f) =>
    MaybeT(inner.map((m) => (m.isNothing ? Nothing() : Just(f(m.value))))),
  chain: (f) =>
    MaybeT(inner.chain((m) => (m.isNothing ? Id(Nothing()) : f(m.value).runMaybeT()))),
  runMaybeT: () => inner
})
\`\`\`

Without it you are chaining twice at every step, once for each layer:

\`\`\`js
outer.chain((maybe) =>
  maybe.isNothing ? Id(Nothing()) : Id(Just(f(maybe.value)))
)
\`\`\`

With it, one chain:

\`\`\`js
MaybeT(Id(Just(1)))
  .chain((n) => MaybeT(Id(Just(n + 1))))
  .chain((n) => MaybeT(Id(Just(n * 10))))
  .runMaybeT()      // Id(Just(20))
\`\`\`

And a Nothing anywhere short-circuits the rest, through both layers:

\`\`\`js
MaybeT(Id(Just(2)))
  .chain(() => MaybeT(Id(Nothing())))
  .map((n) => n * 100)         // never runs
  .runMaybeT()                 // Id(Nothing())
\`\`\`

The mistake that makes the whole thing collapse is forgetting to unwrap what \`f\` returned:

\`\`\`js
chain: (f) => MaybeT(inner.chain((m) => (m.isNothing ? Id(Nothing()) : f(m.value))))
//                                                                     ^ a MaybeT, not its inner
// you now hold a MaybeT of an Id of a MaybeT
\`\`\`

Stacks get unpleasant past two layers, which is why effect systems and
[algebraic effects](#algebraic-effects) exist as alternatives.`,
  rungs: [
    {
      id: 'apply',
      covers: ['one-chain', 'unwrap-the-result'],
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
      covers: ['monads-do-not-compose'],
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

    {
      id: 'why',
      kind: 'code',
      role: 'break',
      covers: ['monads-do-not-compose', 'one-chain'],
      title: "Show that the nesting does not chain, then fix it",
      prompt:
        "Two monads stacked are not a monad. Write `nested`, which chains a Maybe inside a Result the naive way and ends up two layers deep, and `chainT`, which unwraps both. Seeing the extra layer is the point.",
      hints: [
        "`outer.chain(f)` peels one layer. The value inside is still a Maybe, so `f` receives a Maybe rather than a number.",
        "`nested` should do the naive thing and hand back the doubly wrapped result. Do not fix it there.",
        "`chainT` chains the outer, then chains the inner, then puts the outer back on.",
      ],
      exports: ['nested', 'chainT', 'layers'],
      starter: `const Ok = (value) => ({ tag: 'ok', value, chain: (f) => f(value), map: (f) => Ok(f(value)) })
const Err = (e) => ({ tag: 'err', e, chain: () => Err(e), map: () => Err(e) })
const Just = (value) => ({ tag: 'just', value, chain: (f) => f(value), map: (f) => Just(f(value)) })
const Nothing = () => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() })

// layers :: a -> Number   how deep is the wrapping?
const layers = (v) => 0

// nested :: (Ok(Just(a)), (a -> Ok(Just(b)))) -> ???   the naive chain
const nested = (stack, f) => stack

// chainT :: (Ok(Just(a)), (a -> Ok(Just(b)))) -> Ok(Just(b))
const chainT = (stack, f) => stack
`,
      solution: `const Ok = (value) => ({ tag: 'ok', value, chain: (f) => f(value), map: (f) => Ok(f(value)) })
const Err = (e) => ({ tag: 'err', e, chain: () => Err(e), map: () => Err(e) })
const Just = (value) => ({ tag: 'just', value, chain: (f) => f(value), map: (f) => Just(f(value)) })
const Nothing = () => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() })

// layers :: a -> Number   how deep is the wrapping?
const layers = (v) =>
  v && (v.tag === 'ok' || v.tag === 'just') ? 1 + layers(v.value) : 0

// nested :: (Ok(Just(a)), (a -> Ok(Just(b)))) -> ???   the naive chain
const nested = (stack, f) => stack.chain((inner) => inner.map(f))

// chainT :: (Ok(Just(a)), (a -> Ok(Just(b)))) -> Ok(Just(b))
const chainT = (stack, f) =>
  stack.chain((inner) =>
    inner.tag === 'nothing' ? Ok(Nothing()) : f(inner.value)
  )
`,
      broken: [
        `const Ok = (value) => ({ tag: 'ok', value, chain: (f) => f(value), map: (f) => Ok(f(value)) })
const Err = (e) => ({ tag: 'err', e, chain: () => Err(e), map: () => Err(e) })
const Just = (value) => ({ tag: 'just', value, chain: (f) => f(value), map: (f) => Just(f(value)) })
const Nothing = () => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() })
const layers = (v) => (v && (v.tag === 'ok' || v.tag === 'just') ? 1 + layers(v.value) : 0)
const nested = (stack, f) => chainT(stack, f)
const chainT = (stack, f) =>
  stack.chain((inner) => (inner.tag === 'nothing' ? Ok(Nothing()) : f(inner.value)))
`,
        `const Ok = (value) => ({ tag: 'ok', value, chain: (f) => f(value), map: (f) => Ok(f(value)) })
const Err = (e) => ({ tag: 'err', e, chain: () => Err(e), map: () => Err(e) })
const Just = (value) => ({ tag: 'just', value, chain: (f) => f(value), map: (f) => Just(f(value)) })
const Nothing = () => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() })
const layers = (v) => (v && (v.tag === 'ok' || v.tag === 'just') ? 1 + layers(v.value) : 0)
const nested = (stack, f) => stack.chain((inner) => inner.map(f))
const chainT = (stack, f) => stack.chain((inner) => inner.map(f))
`,
        `const Ok = (value) => ({ tag: 'ok', value, chain: (f) => f(value), map: (f) => Ok(f(value)) })
const Err = (e) => ({ tag: 'err', e, chain: () => Err(e), map: () => Err(e) })
const Just = (value) => ({ tag: 'just', value, chain: (f) => f(value), map: (f) => Just(f(value)) })
const Nothing = () => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() })
const layers = (v) => 2
const nested = (stack, f) => stack.chain((inner) => inner.map(f))
const chainT = (stack, f) =>
  stack.chain((inner) => (inner.tag === 'nothing' ? Ok(Nothing()) : f(inner.value)))
`,
      ],
      checks: (T, exp) => {
        const { nested, chainT, layers } = exp;
        const Ok = (value: unknown): any => ({ tag: 'ok', value, chain: (f: (x: unknown) => unknown) => f(value), map: (f: (x: unknown) => unknown) => Ok(f(value)) });
        const Just = (value: unknown): any => ({ tag: 'just', value, chain: (f: (x: unknown) => unknown) => f(value), map: (f: (x: unknown) => unknown) => Just(f(value)) });
        const Nothing = (): any => ({ tag: 'nothing', chain: () => Nothing(), map: () => Nothing() });
        const step = (n: number) => Ok(Just(n * 2));

        T.check('layers counts the wrapping', () => {
          const got = [layers(1), layers(Just(1)), layers(Ok(Just(1)))];
          return T.eq(got, [0, 1, 2]) || `It counted ${T.fmt(got)} for a bare value, one wrap, and two.`;
        });

        T.check('The naive chain ends up a layer too deep', () => {
          const r = nested(Ok(Just(21)), step);
          const d = layers(r);
          return (
            d === 3 ||
            `The naive chain came back ${d} layers deep, and this rung wants to see 3. Chaining the outer hands \`f\` the inner Maybe, and \`f\` wraps twice more on top.`
          );
        });

        T.check('chainT comes back at the right depth', () => {
          const r = chainT(Ok(Just(21)), step);
          const d = layers(r);
          return d === 2 || `chainT came back ${d} layers deep, expected 2: one Result holding one Maybe.`;
        });

        T.check('chainT produces the right value', () => {
          const r = chainT(Ok(Just(21)), step);
          return r.value && r.value.value === 42 || `chainT gave ${T.fmt(r)}, expected an Ok holding a Just holding 42.`;
        });

        T.check('The two really differ', () => {
          const a = layers(nested(Ok(Just(1)), step));
          const b = layers(chainT(Ok(Just(1)), step));
          return (
            a !== b ||
            `Both came back ${a} layers deep. If the naive one already works, there is nothing for a transformer to be for.`
          );
        });

        T.check('An empty inner short-circuits without losing the outer', () => {
          const r = chainT(Ok(Nothing()), step);
          return (
            r && r.tag === 'ok' && r.value && r.value.tag === 'nothing' ||
            `An Ok holding Nothing gave ${T.fmt(r)}. The inner failure has to stay inside the outer success, not replace it.`
          );
        });

        T.check('chainT does not run the function on an empty inner', () => {
          let ran = false;
          chainT(Ok(Nothing()), (n: number) => {
            ran = true;
            return Ok(Just(n));
          });
          return !ran || 'The function ran even though the inner Maybe was empty.';
        });

        T.check('Two chainTs in a row stay at two layers', () => {
          const r = chainT(chainT(Ok(Just(3)), step), step);
          return layers(r) === 2 || `Two chains gave ${layers(r)} layers. Staying flat across a whole pipeline is the thing being bought.`;
        });
      },
    },
  ],
};
