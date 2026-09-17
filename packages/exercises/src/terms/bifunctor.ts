import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const bifunctor: ExerciseSet = {
  termId: 'bifunctor',
  rubric: [
    {
      id: 'two-slots',
      statement:
        "Can map both positions of a two-slot structure, each with its own function.",
    },
    {
      id: 'slots-stay-put',
      statement:
        "Knows bimap maps the contents and never changes which slot or which case a value is in.",
    },
    {
      id: 'either-error-side',
      statement:
        "Can use bimap on Either to adjust the failure without touching the success path.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `bimap`'s type and see that the two functions cannot be crossed, because each one names a different type variable.",
    },
  ],
  notes: `A Bifunctor has two positions, and \`bimap\` maps each with its own function.

\`\`\`js
const Pair = (first, second) => ({
  first, second,
  bimap: (f, g) => Pair(f(first), g(second))
})

Pair(2, 'ab').bimap((n) => n * 10, (s) => s.toUpperCase())   // Pair(20, 'AB')
\`\`\`

The first function belongs to the first slot. Swapping them is a different function, and a
silent one if both slots happen to hold the same type:

\`\`\`js
bimap: (f, g) => Pair(g(second), f(first))   // the slots have traded places
\`\`\`

It maps the **contents**, never the structure. A Left stays a Left:

\`\`\`js
const Left = (error) => ({
  isRight: false,
  bimap: (f, g) => Left(f(error))      // still a Left
})
const Right = (value) => ({
  isRight: true,
  bimap: (f, g) => Right(g(value))     // still a Right
})
\`\`\`

On Either exactly one of the two functions runs, which is what makes it the natural way to
decorate an error without disturbing the happy path:

\`\`\`js
const withContext = (e) => e.bimap((msg) => \`while loading user: \${msg}\`, (v) => v)

withContext(Left('not found'))   // Left('while loading user: not found')
withContext(Right(42))           // Right(42), untouched
\`\`\`

Mapping over a Right only is \`map\`; a bifunctor is what gives you access to the other side
without unwrapping and rebuilding.`,
  typedNotes: `Same track, second lap. A bifunctor has two slots, and once the type variables are written
down it becomes impossible to describe crossing them.

\`\`\`ts
interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}
\`\`\`

Read \`bimap\` slowly. \`f\` is \`(a: A) => C\`, so it can only ever be handed the left. \`g\` is
\`(b: B) => D\`, so it can only ever be handed the right. The result is \`Pair<C, D>\` in that
order. There is no arrangement of those variables that lets \`f\` touch the right slot. The
"slots stay put" rule is not a convention here, it is the only thing that typechecks.

\`\`\`ts
const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(f(left), g(right))
})

pair('ada', 36).bimap((s) => s.length, (n) => n * 2)  // Pair<number, number>
pair('ada', 36).bimap((s) => s.toUpperCase(), String) // Pair<string, string>
\`\`\`

Both slots can change type, and they change independently. \`C\` and \`D\` are separate variables
precisely so that mapping the left has nothing to say about the right.

A [functor](#functor) is the one-slot version, and putting them side by side is the fastest
way to see what "bi" bought you:

\`\`\`ts
interface Functor<A>      { map:   <B>(f: (a: A) => B) => Functor<B> }
interface Pair<A, B>      { bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D> }
\`\`\`

[Either](#either) is the other famous one, and its type is where the error-handling habit
comes from. \`Either<E, A>\` maps \`E\` on the failure side and \`A\` on the success side, so
\`bimap(annotate, double)\` touches exactly one of them depending on which case you are holding.
The unused function is still required by the signature, which is the type system insisting you
say what happens in both cases.`,
  rungs: [
    {
      id: 'implement',
      covers: ['two-slots', 'slots-stay-put'],
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
      covers: ['either-error-side', 'slots-stay-put'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['two-slots', 'slots-stay-put', 'typed-signature'],
      title: "Satisfy Pair<A, B>",
      prompt:
        "The interface is given. Fill in `pair` so `bimap` moves each slot with its own function and hands back a new pair.",
      hints: [
        "`f` is typed `(a: A) => C`. The only value in scope with type `A` is the left one.",
        "`bimap` returns `Pair<C, D>`, which is another pair, so build one with `pair` again.",
        "Nothing is allowed to write into the pair you already made.",
      ],
      exports: ['pair'],
      starter: `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(left, right) as never
})
`,
      solution: `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(f(left), g(right))
})
`,
      broken: [
        `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(g(right), f(left)) as never
})
`,
        `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(f(left), f(right as never)) as never
})
`,
        `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(f(left), right) as never
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
        T.check('The Pair interface is still there to satisfy', () => {
          return /interface\s+Pair/.test(T.src) || 'The Pair interface has gone. It is the thing being satisfied.';
        });
        const pair = exp.pair;

        T.check('The slots are readable', () => {
          const p = pair('ada', 36);
          return (p.left === 'ada' && p.right === 36) || `A pair of 'ada' and 36 read back as ${T.fmt(p.left)} and ${T.fmt(p.right)}.`;
        });

        T.check('Each function lands on its own slot', () => {
          const p = pair('ada', 36).bimap((s: string) => s.length, (n: number) => n * 2);
          return (
            (p.left === 3 && p.right === 72) ||
            `Mapping length on the left and doubling on the right gave ${T.fmt(p.left)} and ${T.fmt(p.right)}. The two functions ended up on the wrong slots.`
          );
        });

        T.check('Both slots can come out a different type', () => {
          const p = pair(3, 5).bimap((n: number) => String(n), (n: number) => n > 4);
          return (
            (p.left === '3' && p.right === true) ||
            `Changing both types gave ${T.fmt(p.left)} and ${T.fmt(p.right)}.`
          );
        });

        T.check('bimap gives back something you can map again', () => {
          const p = pair(1, 2).bimap((n: number) => n + 1, (n: number) => n + 1).bimap((n: number) => n * 10, (n: number) => n * 10);
          return (p.left === 20 && p.right === 30) || `Mapping twice gave ${T.fmt(p.left)} and ${T.fmt(p.right)}.`;
        });

        T.law('Mapping with identity on both sides changes nothing', 60, (G) => {
          const a = G.int();
          const b = G.str();
          const p = pair(a, b).bimap((x: number) => x, (x: string) => x);
          return (p.left === a && p.right === b) || `${T.fmt([a, b])} came back as ${T.fmt([p.left, p.right])}.`;
        });

        T.law('Two bimaps in a row are one bimap of the compositions', 60, (G) => {
          const a = G.int();
          const b = G.int();
          const f = G.fn();
          const g = G.fn();
          const twice = pair(a, b).bimap(f.f, f.f).bimap(g.f, g.f);
          const once = pair(a, b).bimap((x: number) => g.f(f.f(x)), (x: number) => g.f(f.f(x)));
          return (
            (twice.left === once.left && twice.right === once.right) ||
            `With ${f.name} then ${g.name} on ${T.fmt([a, b])}, separately gave ${T.fmt([twice.left, twice.right])} and together gave ${T.fmt([once.left, once.right])}.`
          );
        });

        T.check('The pair you started with is left as it was', () => {
          const p = pair(1, 2);
          p.bimap((n: number) => n * 100, (n: number) => n * 100);
          return (p.left === 1 && p.right === 2) || `After mapping, the original read ${T.fmt(p.left)} and ${T.fmt(p.right)}.`;
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'either-error-side'],
      title: "The two slots cannot be crossed",
      prompt:
        "`f` is typed `(a: A) => C` and `g` is `(b: B) => D`, so neither one can reach the other slot. Type an array of the two sides after mapping length on the left and doubling on the right.",
      hints: [
        "The left holds a string, so the function that takes it is the one measuring length.",
        "The right holds a number, and it is doubled.",
        "Both slots change, and they change independently.",
      ],
      context: `interface Pair<A, B> {
  left: A
  right: B
  bimap: <C, D>(f: (a: A) => C, g: (b: B) => D) => Pair<C, D>
}

const pair = <A, B>(left: A, right: B): Pair<A, B> => ({
  left,
  right,
  bimap: (f, g) => pair(f(left), g(right))
})
`,
      placeholder: "[..., ...]",
      expect: [3,72],
      solution: "[pair('ada', 36).bimap((s) => s.length, (n) => n * 2).left, pair('ada', 36).bimap((s) => s.length, (n) => n * 2).right]",
      broken: ["[3, 36]", "[36, 3]", "['ada', 72]"],
    },
  ],
};
