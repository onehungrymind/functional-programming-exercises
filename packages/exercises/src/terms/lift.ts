import type { ExerciseSet } from '@fpx/engine/types';

export const lift: ExerciseSet = {
  termId: 'lift',
  rubric: [
    {
      id: 'one-definition',
      statement:
        "Can write liftA2 once and have it work on any applicative, because it uses only map and ap.",
    },
    {
      id: 'curry-first',
      statement:
        "Knows the function has to be curried before ap, since ap supplies one argument at a time.",
    },
    {
      id: 'never-reach-inside',
      statement:
        "Knows lifting must not read a field like .value, and can say why that would restrict it to one shape.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `liftA2`'s type and say why the function has to be curried before `ap` can be used, and why the typed version has to name its container where the JavaScript one did not.",
    },
  ],
  notes: `Lifting takes a function that knows nothing about containers and makes it work on them.

\`\`\`js
const liftA2 = (f) => (ma) => (mb) => ma.map((a) => (b) => f(a, b)).ap(mb)

liftA2((a, b) => a + b)(Box(2))(Box(3))     // Box(5)
\`\`\`

The currying is not optional. \`ap\` supplies **one** argument, so what \`map\` puts inside the
container has to be a function waiting for the next one:

\`\`\`js
ma.map((a) => (b) => f(a, b)).ap(mb)   // Box holds a function of one argument. Works.
ma.map(f).ap(mb)                        // Box holds a function of two. ap gives it one.
\`\`\`

What makes one definition serve every applicative is that it only ever uses \`map\` and
\`ap\`. It never looks inside:

\`\`\`js
liftA2((a, b) => a + b)(Box(2))(Box(3))              // Box(5)
liftA2((a, b) => a + b)(List([1, 2]))(List([10, 20])) // List([11, 21, 12, 22])
liftA2((a, b) => a + b)(Just(2))(Nothing())           // Nothing
\`\`\`

Same code, three behaviours, because each container's \`ap\` decides what combining means. For
a list it is every pairing; for Maybe it is short-circuiting.

Reaching for a field would throw all of that away:

\`\`\`js
const liftA2 = (f) => (ma) => (mb) => Box(f(ma.value, mb.value))
// works for Box, wrong for List, and actively broken for Maybe
\`\`\`

The general rule: a function written against an interface stays general; one written against a
representation does not.`,
  typedNotes: `Same track, second lap. The types explain the currying step, which in JavaScript looks like an
arbitrary flourish.

\`\`\`ts
const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    ma.map((a) => (b: B) => f(a, b)).ap(mb)
\`\`\`

Follow the middle line, because that is the whole trick. \`f\` arrives taking two arguments at
once, and \`ap\` has no use for that: \`ap\` needs its receiver to hold a \`B -> C\`. So you map
over \`ma\` with something that takes an \`A\` and returns \`(b: B) => C\`.

\`\`\`ts
ma                                   // Box<A>
ma.map((a) => (b: B) => f(a, b))     // Box<(b: B) => C>
   .ap(mb)                           // Box<C>
\`\`\`

Three lines, three types, and each step is the only one available. Currying is not a style
choice here; a two-argument \`f\` produces a \`Box<C>\` on the first \`map\` and then there is
nothing left for \`mb\` to do.

What you never see in that definition is a \`.value\`. It goes in wrapped, moves through \`map\`
and \`ap\`, and comes out wrapped, and every intermediate type in the chain still has \`Box\` on
the outside:

\`\`\`ts
const add = (a: number, b: number) => a + b

liftA2(add)(box(1))(box(2)).value   // 3
\`\`\`

**Where TypeScript runs out.** Go back and look at the JavaScript version:

\`\`\`js
const liftA2 = (f) => (ma) => (mb) => ma.map((a) => (b) => f(a, b)).ap(mb)
\`\`\`

That one definition works for Box, for Maybe, for Either, for arrays, for anything with \`map\`
and \`ap\`. It is genuinely polymorphic in the container, and it is the same code, character for
character, as the typed one. The typed version had to nail itself to \`Box\`.

The signature you want is:

\`\`\`ts
const liftA2: <F, A, B, C>(f: (a: A, b: B) => C) => (ma: F<A>) => (mb: F<B>) => F<C>
\`\`\`

\`F<A>\` is not legal there, because \`F\` is a plain type parameter and TypeScript will not let
you apply one to an argument. Abstracting over a container needs higher-kinded types, and
TypeScript does not have them. So this is the rare case where the second lap is a step down:
the runtime behaviour is more general than anything you can write a type for, and you have to
pick a container or reach for an encoding. Worth knowing which of the two you are looking at.`,
  rungs: [
    {
      id: 'implement',
      covers: ['one-definition', 'curry-first', 'never-reach-inside'],
      kind: 'code',
      role: 'implement',
      title: 'Lift an ordinary function into a container',
      prompt:
        'Lifting takes a function that knows nothing about containers and makes it work on them. Write `liftA2` once, and use it on two different types.',
      hints: [
        'The same definition works for anything with `map` and `ap`. That is the point of writing it once.',
        '`ma.map(curried).ap(mb)`.',
      ],
      exports: ['liftA2'],
      starter: `// liftA2 :: ((a, b) -> c) -> f a -> f b -> f c
const liftA2 = (f) => (ma) => (mb) => {
}
`,
      solution: `// liftA2 :: ((a, b) -> c) -> f a -> f b -> f c
const liftA2 = (f) => (ma) => (mb) => ma.map((a) => (b) => f(a, b)).ap(mb)
`,
      broken: [
        // Forgets to curry before ap.
        `const liftA2 = (f) => (ma) => (mb) => ma.map(f).ap(mb)
`,
        // Arguments swapped.
        `const liftA2 = (f) => (ma) => (mb) => mb.map((b) => (a) => f(a, b)).ap(ma)
`,
      ],
      checks: (T, exp) => {
        const liftA2 = exp.liftA2 as (f: (a: any, b: any) => any) => (ma: any) => (mb: any) => any;

        // Two unrelated applicatives, to show the same lift works on both.
        const Box = (value: any): any => ({
          value,
          map: (f: any) => Box(f(value)),
          ap: (other: any) => other.map(value),
          inspect: () => `Box(${JSON.stringify(value)})`,
        });
        const List = (xs: any[]): any => ({
          xs,
          map: (f: any) => List(xs.map(f)),
          ap: (other: any) => List(xs.flatMap((f: any) => other.xs.map(f))),
          inspect: () => `List(${JSON.stringify(xs)})`,
        });

        T.check('It works on a single-value container', () => {
          const r = liftA2((a: number, b: number) => a + b)(Box(2))(Box(3));
          return r?.value === 5 || `Got ${T.fmt(r)}, expected Box(5).`;
        });

        T.check('The arguments arrive in the order they were given', () => {
          const r = liftA2((a: number, b: number) => a - b)(Box(10))(Box(3));
          return r?.value === 7 || `Got ${T.fmt(r)}, expected Box(7).`;
        });

        T.check('The same definition works on a list', () => {
          const r = liftA2((a: number, b: number) => a + b)(List([1, 2]))(List([10, 20]));
          return (
            T.eq(r?.xs, [11, 21, 12, 22]) ||
            `Got ${T.fmt(r)}, expected List([11, 21, 12, 22]). One definition should serve every applicative, because it only uses map and ap.`
          );
        });

        T.check('It never reaches inside the container', () => {
          // A container with no readable field: only map and ap are available.
          const Opaque = (v: any): any => ({
            map: (f: any) => Opaque(f(v)),
            ap: (o: any) => o.map(v),
            reveal: () => v,
          });
          const r = liftA2((a: number, b: number) => a * b)(Opaque(3))(Opaque(4));
          return (
            r?.reveal?.() === 12 ||
            `Got ${T.fmt(r)}. If this fails, the definition is reading a field like .value instead of going through map and ap.`
          );
        });

        T.check('It is curried, one argument at a time', () => {
          const add = liftA2((a: number, b: number) => a + b);
          const addTo2 = add(Box(2));
          return (
            typeof add === 'function' && typeof addTo2 === 'function' && addTo2(Box(8))?.value === 10 ||
            'Each step should take one argument and hand back the next function.'
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['never-reach-inside'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does lifting need from the container?',
      prompt: 'One `liftA2` serves every applicative. What does it rely on?',
      options: [
        {
          code: '// map and ap, and nothing else',
          correct: true,
          why: 'It never looks inside. That is exactly why the same definition works for Box, Array, Maybe and the rest.',
        },
        {
          code: '// A .value field to read',
          correct: false,
          why: 'Then it would only work for containers shaped that way, which defeats the purpose.',
        },
        {
          code: '// chain',
          correct: false,
          why: 'chain is stronger than needed. Applicative is enough, and some things have ap without chain.',
        },
        {
          code: '// A way to compare two containers',
          correct: false,
          why: 'Useful for testing the laws, but lifting itself never compares anything.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['curry-first', 'never-reach-inside', 'typed-signature'],
      title: "Write liftA2 over Box",
      prompt:
        "`Box` is given, with `map` and `ap`. Write `liftA2` so an ordinary two-argument function can work on two wrapped values without ever unwrapping either.",
      hints: [
        "Map over the first box with something that takes an `a` and gives back a function still waiting for a `b`.",
        "After that map you are holding a `Box<(b: B) => C>`, which is exactly what `ap` wants as its receiver.",
        "If `.value` appears anywhere in your answer, you left the container.",
      ],
      exports: ['liftA2'],
      starter: `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    ma as never
`,
      solution: `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    ma.map((a) => (b: B) => f(a, b)).ap(mb)
`,
      broken: [
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    box(f(ma.value, mb.value))
`,
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    ma.map((a) => (b: B) => f(b as never, a as never)).ap(mb)
`,
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

const liftA2 =
  <A, B, C>(f: (a: A, b: B) => C) =>
  (ma: Box<A>) =>
  (mb: Box<B>): Box<C> =>
    ma.map((a) => f(a, mb.value as never)) as never
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
        const liftA2 = exp.liftA2;
        const bx = (v: unknown): any => ({
          value: v,
          map(f: (a: unknown) => unknown) { return bx(f(v)); },
          ap(other: { map: (f: unknown) => unknown }) { return other.map(v as never); },
        });

        T.check('Two wrapped numbers add up', () => {
          const r = liftA2((a: number, b: number) => a + b)(bx(1))(bx(2));
          return (r && r.value === 3) || `Adding wrapped 1 and 2 gave ${T.fmt(r && r.value)}.`;
        });

        T.check('The result is still wrapped', () => {
          const r = liftA2((a: number, b: number) => a + b)(bx(1))(bx(2));
          return (
            (r && typeof r.map === 'function') ||
            `liftA2 gave ${T.fmt(r)}. The return type is Box<C>, so the value never leaves the container.`
          );
        });

        T.check('The arguments keep their order', () => {
          const r = liftA2((a: number, b: number) => a - b)(bx(10))(bx(3));
          return r.value === 7 || `Subtracting 3 from 10 gave ${T.fmt(r.value)}, expected 7. The first box is the first argument.`;
        });

        T.check('It works on something other than numbers', () => {
          const r = liftA2((a: string, b: string) => a + ' ' + b)(bx('hello'))(bx('world'));
          return r.value === 'hello world' || `Joining two wrapped strings gave ${T.fmt(r.value)}.`;
        });

        T.check('It is curried, one box at a time', () => {
          const add = liftA2((a: number, b: number) => a + b);
          const addOne = add(bx(1));
          return (
            typeof addOne === 'function' && addOne(bx(5)).value === 6 ||
            `Applying one box at a time did not work. liftA2(f)(ma) should still be waiting for mb.`
          );
        });

        T.check('Nothing was unwrapped along the way', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('liftA2'));
          return (
            !/\.value\b/.test(body) ||
            'The answer reaches for `.value`. Every step in the chain is typed Box<something>, so there is never a point where you have to look inside.'
          );
        });

        T.law('It agrees with applying the function directly', 60, (G) => {
          const a = G.int();
          const b = G.int();
          const f = (x: number, y: number) => x * 2 + y;
          const r = liftA2(f)(bx(a))(bx(b)).value;
          return r === f(a, b) || `On ${T.fmt([a, b])}: lifted gave ${T.fmt(r)} and direct gave ${T.fmt(f(a, b))}.`;
        });

        T.law('The two boxes are not swapped', 60, (G) => {
          const a = G.int();
          const b = G.int();
          const r = liftA2((x: number, y: number) => x - y)(bx(a))(bx(b)).value;
          return r === a - b || `On ${T.fmt([a, b])} subtraction gave ${T.fmt(r)}, expected ${a - b}.`;
        });
      },
    },
  ],
};
