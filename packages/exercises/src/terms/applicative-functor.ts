import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const applicativeFunctor: ExerciseSet = {
  termId: 'applicative-functor',
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Apply a wrapped function to a wrapped value',
      prompt:
        '`map` applies a plain function to a wrapped value. `ap` applies a function that is itself wrapped. Give Box an `ap`.',
      hints: [
        'The Box you call `ap` on holds the function. The one you pass holds the argument.',
        'Unwrap both, apply, wrap the result.',
      ],
      exports: ['Box'],
      starter: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  ap: (other) => {
    // this Box holds a function; other holds the argument
  },
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

Box.of = Box
`,
      solution: `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  ap: (other) => other.map(value),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})

Box.of = Box
`,
      broken: [
        // The two sides swapped: applies the argument to the function.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  ap: (other) => Box(other.value(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = Box
`,
        // Gives back the bare result rather than a Box.
        `const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  ap: (other) => value(other.value),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
Box.of = Box
`,
      ],
      checks: (T, exp) => {
        const Box = exp.Box as any;

        T.check('ap applies the wrapped function to the wrapped value', () => {
          const r = Box((n: number) => n + 1).ap(Box(2));
          return (r && r.value === 3) || `Got ${T.fmt(r)}, expected Box(3).`;
        });

        T.check('ap gives back a Box', () => {
          const r = Box((n: number) => n + 1).ap(Box(2));
          return (
            typeof r?.map === 'function' ||
            `Got ${T.fmt(r)}. ap stays inside the container, so a chain of them keeps working.`
          );
        });

        T.check('It is the receiver that holds the function', () => {
          const r = Box((n: number) => n * 10).ap(Box(3));
          return (
            r?.value === 30 ||
            `Got ${T.fmt(r)}, expected Box(30). The Box you call ap on carries the function; the argument is the one you pass in.`
          );
        });

        T.check('A curried function can be applied one argument at a time', () => {
          const add = (a: number) => (b: number) => a + b;
          const r = Box(add).ap(Box(2)).ap(Box(3));
          return (
            r?.value === 5 ||
            `Got ${T.fmt(r)}, expected Box(5). This is the payoff: a two-argument function applied to two wrapped values.`
          );
        });

        T.check('map can be written in terms of of and ap', () => {
          const f = (n: number) => n + 1;
          const viaAp = Box.of(f).ap(Box(4));
          const viaMap = Box(4).map(f);
          return (
            viaAp?.value === viaMap?.value ||
            `of(f).ap(x) gave ${T.fmt(viaAp)} and x.map(f) gave ${T.fmt(viaMap)}. They have to agree.`
          );
        });

        laws.applicative(T, { of: (x: any) => Box.of(x), runs: 50 });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Combine two Maybes without unwrapping either',
      prompt:
        'Write `liftA2`, which applies a two-argument function to two wrapped values. If either is Nothing, the answer is Nothing.',
      hints: [
        'Curry the function, `map` it over the first, then `ap` the second.',
        '`ma.map((a) => (b) => f(a, b))` gives you a Maybe holding a function, which is exactly what ap wants.',
      ],
      exports: ['liftA2', 'Just', 'Nothing'],
      starter: `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  ap: (other) => other.map(value)
})
const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  ap: () => Nothing()
})

// liftA2 :: ((a, b) -> c) -> Maybe a -> Maybe b -> Maybe c
const liftA2 = (f, ma, mb) => {
}
`,
      solution: `const Just = (value) => ({
  isNothing: false, value,
  map: (f) => Just(f(value)),
  ap: (other) => other.map(value)
})
const Nothing = () => ({
  isNothing: true,
  map: () => Nothing(),
  ap: () => Nothing()
})

// liftA2 :: ((a, b) -> c) -> Maybe a -> Maybe b -> Maybe c
const liftA2 = (f, ma, mb) => ma.map((a) => (b) => f(a, b)).ap(mb)
`,
      broken: [
        // Reaches for the values directly, which is wrong the moment one is Nothing.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)), ap: (other) => other.map(value) })
const Nothing = () => ({ isNothing: true, map: () => Nothing(), ap: () => Nothing() })

const liftA2 = (f, ma, mb) => Just(f(ma.value, mb.value))
`,
        // Maps without currying, so ap is handed a partially applied two-argument function.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)), ap: (other) => other.map(value) })
const Nothing = () => ({ isNothing: true, map: () => Nothing(), ap: () => Nothing() })

const liftA2 = (f, ma, mb) => ma.map((a) => f(a)).ap(mb)
`,
        // Arguments reach f the wrong way round.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)), ap: (other) => other.map(value) })
const Nothing = () => ({ isNothing: true, map: () => Nothing(), ap: () => Nothing() })

const liftA2 = (f, ma, mb) => ma.map((a) => (b) => f(b, a)).ap(mb)
`,
      ],
      checks: (T, exp) => {
        const liftA2 = exp.liftA2 as (f: (a: any, b: any) => any, ma: any, mb: any) => any;
        const Just = exp.Just as (v: any) => any;
        const Nothing = exp.Nothing as () => any;

        T.check('Two Justs combine', () => {
          const r = liftA2((a: number, b: number) => a + b, Just(2), Just(3));
          return (r?.isNothing === false && r.value === 5) || `Got ${T.fmt(r)}, expected Just(5).`;
        });

        T.check('The arguments reach f in the order they were given', () => {
          const r = liftA2((a: number, b: number) => a - b, Just(10), Just(3));
          return (
            r?.value === 7 ||
            `Got ${T.fmt(r)}, expected Just(7). The first Maybe supplies the first argument.`
          );
        });

        T.check('A Nothing on the left gives Nothing', () => {
          const r = liftA2((a: number, b: number) => a + b, Nothing(), Just(3));
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('A Nothing on the right gives Nothing too', () => {
          const r = liftA2((a: number, b: number) => a + b, Just(2), Nothing());
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. Reaching into .value would have read undefined here rather than short-circuiting.`
          );
        });

        T.check('f never runs when either side is missing', () => {
          const spy = T.spyFn((a: number, b: number) => a + b);
          liftA2(spy, Nothing(), Just(1));
          liftA2(spy, Just(1), Nothing());
          return spy.calls.length === 0 || `f ran ${spy.calls.length} time(s), with ${T.fmt(spy.calls)}.`;
        });

        T.check('It works for a function of any two types', () => {
          const r = liftA2((s: string, n: number) => s.repeat(n), Just('ab'), Just(3));
          return r?.value === 'ababab' || `Got ${T.fmt(r)}`;
        });
      },
    },
  ],
};
