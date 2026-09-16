import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const bifunctor: ExerciseSet = {
  termId: 'bifunctor',
  // TODO: the upstream entry is a glossary line; the rungs assume more than it teaches.
  notesTodo: true,
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'Map over both slots',
      prompt:
        'A Bifunctor has two positions and a `bimap` that maps each with its own function. Write it for Pair.',
      hints: ['The first function goes with the first slot, the second with the second.'],
      exports: ['Pair'],
      starter: `// Pair :: (a, b) -> Pair a b
const Pair = (first, second) => ({
  first,
  second,
  bimap: (f, g) => {
  },
  inspect: () => \`Pair(\${JSON.stringify(first)}, \${JSON.stringify(second)})\`
})
`,
      solution: `// Pair :: (a, b) -> Pair a b
const Pair = (first, second) => ({
  first,
  second,
  bimap: (f, g) => Pair(f(first), g(second)),
  inspect: () => \`Pair(\${JSON.stringify(first)}, \${JSON.stringify(second)})\`
})
`,
      broken: [
        // The two functions applied to the wrong slots.
        `const Pair = (first, second) => ({
  first, second,
  bimap: (f, g) => Pair(g(second), f(first)),
  inspect: () => \`Pair(\${JSON.stringify(first)}, \${JSON.stringify(second)})\`
})
`,
        // Only maps the second slot.
        `const Pair = (first, second) => ({
  first, second,
  bimap: (f, g) => Pair(first, g(second)),
  inspect: () => \`Pair(\${JSON.stringify(first)}, \${JSON.stringify(second)})\`
})
`,
        // Uses the same function on both.
        `const Pair = (first, second) => ({
  first, second,
  bimap: (f, g) => Pair(f(first), f(second)),
  inspect: () => \`Pair(\${JSON.stringify(first)}, \${JSON.stringify(second)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Pair = exp.Pair as (a: any, b: any) => any;

        T.check('Each function maps its own slot', () => {
          const r = Pair(2, 'ab').bimap((n: number) => n * 10, (s: string) => s.toUpperCase());
          return (
            r?.first === 20 && r?.second === 'AB' ||
            `Got ${T.fmt(r)}, expected Pair(20, "AB").`
          );
        });

        T.check('The slots do not swap', () => {
          const r = Pair('left', 'right').bimap((s: string) => `f(${s})`, (s: string) => `g(${s})`);
          return (
            r?.first === 'f(left)' ||
            `The first slot came back as ${T.fmt(r?.first)}. The first function belongs to the first slot.`
          );
        });

        T.check('bimap gives back a Pair', () => {
          const r = Pair(1, 2).bimap((n: number) => n, (n: number) => n);
          return typeof r?.bimap === 'function' || `Got ${T.fmt(r)}`;
        });

        laws.bifunctor(T, { of: (x: any) => Pair(x, x), pair: (a, b) => Pair(a, b), runs: 50 });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'bimap for Either',
      prompt:
        'Either is a bifunctor too: one function for the error and one for the success. Only one of them ever runs.',
      hints: ['On a Left, apply the first function to the error and leave it a Left.'],
      exports: ['Left', 'Right'],
      starter: `const Left = (error) => ({
  isRight: false,
  bimap: (f, g) => {
  },
  fold: (onLeft, onRight) => onLeft(error),
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})

const Right = (value) => ({
  isRight: true,
  bimap: (f, g) => {
  },
  fold: (onLeft, onRight) => onRight(value),
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
      solution: `const Left = (error) => ({
  isRight: false,
  bimap: (f, g) => Left(f(error)),
  fold: (onLeft, onRight) => onLeft(error),
  inspect: () => \`Left(\${JSON.stringify(error)})\`
})

const Right = (value) => ({
  isRight: true,
  bimap: (f, g) => Right(g(value)),
  fold: (onLeft, onRight) => onRight(value),
  inspect: () => \`Right(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // Both branches apply the same function.
        `const Left = (error) => ({ isRight: false, bimap: (f, g) => Left(f(error)), fold: (onLeft) => onLeft(error), inspect: () => \`Left(\${JSON.stringify(error)})\` })
const Right = (value) => ({ isRight: true, bimap: (f, g) => Right(f(value)), fold: (onLeft, onRight) => onRight(value), inspect: () => \`Right(\${JSON.stringify(value)})\` })
`,
        // Left switches sides.
        `const Left = (error) => ({ isRight: false, bimap: (f, g) => Right(f(error)), fold: (onLeft) => onLeft(error), inspect: () => \`Left(\${JSON.stringify(error)})\` })
const Right = (value) => ({ isRight: true, bimap: (f, g) => Right(g(value)), fold: (onLeft, onRight) => onRight(value), inspect: () => \`Right(\${JSON.stringify(value)})\` })
`,
      ],
      checks: (T, exp) => {
        const Left = exp.Left as (e: any) => any;
        const Right = exp.Right as (v: any) => any;
        const read = (e: any) => e.fold((l: any) => ({ left: l }), (r: any) => ({ right: r }));

        T.check('Right maps with the second function', () => {
          const r = read(Right(2).bimap(() => 'err', (n: number) => n + 1));
          return T.eq(r, { right: 3 }) || `Got ${T.fmt(r)}`;
        });

        T.check('Left maps with the first function', () => {
          const r = read(Left('boom').bimap((e: string) => e.toUpperCase(), () => 0));
          return T.eq(r, { left: 'BOOM' }) || `Got ${T.fmt(r)}`;
        });

        T.check('bimap does not change which side you are on', () => {
          const left = Left('e').bimap((e: any) => e, (v: any) => v);
          const right = Right(1).bimap((e: any) => e, (v: any) => v);
          return (
            left?.isRight === false && right?.isRight === true ||
            `A Left came back as ${left?.isRight ? 'Right' : 'Left'} and a Right as ${right?.isRight ? 'Right' : 'Left'}. bimap maps the contents, not the case.`
          );
        });

        T.check('Only one of the two functions runs', () => {
          const onError = T.spyFn((e: any) => e);
          const onValue = T.spyFn((v: any) => v);
          Right(1).bimap(onError, onValue);
          if (onError.calls.length !== 0) return 'The error function ran on a Right.';
          Left('e').bimap(onError, onValue);
          return onValue.calls.length === 1 || `The value function ran ${onValue.calls.length} times across a Right and a Left.`;
        });

        T.check('This is what makes an error message mappable', () => {
          // The point of bimap on Either: adjust the failure without touching the success path.
          const decorate = (e: any) => e.bimap((msg: string) => `error: ${msg}`, (v: any) => v);
          const failed = read(decorate(Left('not found')));
          const ok = read(decorate(Right(42)));
          return (
            T.eq(failed, { left: 'error: not found' }) && T.eq(ok, { right: 42 }) ||
            `Got ${T.fmt(failed)} and ${T.fmt(ok)}.`
          );
        });
      },
    },
  ],
};
