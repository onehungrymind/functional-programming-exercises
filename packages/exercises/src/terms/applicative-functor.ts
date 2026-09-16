import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const applicativeFunctor: ExerciseSet = {
  termId: 'applicative-functor',
  rubric: [
    {
      id: 'wrapped-function',
      statement:
        "Can apply a function that is itself inside a container, and knows the receiver holds the function.",
    },
    {
      id: 'multiple-arguments',
      statement:
        "Can apply a curried function to several wrapped values in sequence.",
    },
    {
      id: 'stronger-than-functor',
      statement:
        "Knows map can be written from of and ap, so every applicative is a functor, and can say what ap adds.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `ap`'s type and say why it only makes sense when the container holds a function, and can name what TypeScript cannot say about applicatives in general.",
    },
  ],
  notes: `\`map\` applies a plain function to a wrapped value. \`ap\` applies a function that is **itself
wrapped**.

\`\`\`js
const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  ap: (other) => other.map(value)    // this Box holds the function
})

Box((n) => n + 1).ap(Box(2))   // Box(3)
\`\`\`

Which side holds the function matters, and getting it backwards is the usual slip:

\`\`\`js
ap: (other) => Box(other.value(value))   // argument applied to function
Box((n) => n * 10).ap(Box(3))            // TypeError: 3 is not a function
\`\`\`

The payoff is functions of more than one argument. \`map\` cannot do this at all:

\`\`\`js
const add = (a) => (b) => a + b

Box(2).map(add)              // Box(a function waiting for b) and now you are stuck
Box(add).ap(Box(2)).ap(Box(3))   // Box(5)
\`\`\`

That is precisely what \`ap\` adds over \`map\`: the ability to keep feeding arguments in
without ever unwrapping.

And it subsumes \`map\`, which is why every applicative is a functor:

\`\`\`js
Box.of(f).ap(x)   // the same as x.map(f)
\`\`\`

The laws worth knowing are homomorphism, which says lifting then applying matches applying then
lifting, and interchange, which pins down that \`ap\` cannot care about evaluation order:

\`\`\`js
A.of(f).ap(A.of(x))              // equals A.of(f(x))
A.of(f).ap(A.of(y))              // equals A.of((g) => g(y)).ap(A.of(f))
\`\`\``,
  typedNotes: `Same track, second lap. \`ap\` is the first signature in this glossary that TypeScript has to
work at, and the second lap here comes with an honest limit attached.

Start with the contrast:

\`\`\`ts
map: <B>(f: (a: A) => B)      => Box<B>   // the function is bare
ap:  <B>(other: Box<B>)       => Box<?>   // the function is the thing we are holding
\`\`\`

\`map\` takes the function as an argument. \`ap\` does not take a function at all: it is called
**on** the container that holds one. So \`ap\` only means anything when \`A\` is itself a function
type, and that is a condition on the receiver, not on the argument. TypeScript has a way to
say exactly that, a \`this\` parameter:

\`\`\`ts
interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}
\`\`\`

Read \`this: Box<(b: B) => C>\`. It says this method exists only when the box you are calling it
on holds a \`B -> C\`. Given that, and a \`Box<B>\` alongside, the only thing you could produce is
a \`Box<C>\`. Reach for \`ap\` on a \`Box<number>\` and it is a compile error rather than a runtime
one.

The \`this\` parameter also forces the method-shorthand form, because an arrow function has no
\`this\` of its own:

\`\`\`ts
const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
})

box((a: number) => (b: number) => a + b).ap(box(1)).ap(box(2)).value   // 3
\`\`\`

Two arguments, one at a time, each one wrapped. That chain is where \`ap\` earns its keep, and
it is why an applicative is stronger than a [functor](#functor): \`map\` can only ever take one
bare function and one wrapped value.

**Where TypeScript runs out.** What you actually want to write is this:

\`\`\`ts
interface Applicative<F> {
  of: <A>(a: A) => F<A>
  ap: <A, B>(ff: F<(a: A) => B>, fa: F<A>) => F<B>
}
\`\`\`

That is not legal TypeScript. \`F\` there is a type constructor, something you apply to an
argument to get a type, and TypeScript's type parameters only range over types. Languages with
higher-kinded types let you abstract over \`F\`; here you cannot, so \`Applicative\` as an
interface does not exist. You write the shape once per container, and "Box is an applicative"
stays a fact you hold in your head rather than one the compiler tracks. There are encodings
that fake it, and they are worth knowing about eventually, but they are machinery rather than
insight.`,
  rungs: [
    {
      id: 'implement',
      covers: ['wrapped-function', 'multiple-arguments', 'stronger-than-functor'],
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
      covers: ['multiple-arguments'],
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['wrapped-function', 'stronger-than-functor', 'typed-signature'],
      title: "Satisfy Box<A> including ap",
      prompt:
        "The interface is given, with a `this` parameter on `ap`. Write `box` so a wrapped function can be applied to a wrapped value.",
      hints: [
        "`this` is the box holding the function, and `other` is the box holding the argument.",
        "`ap` has to be a method, not an arrow. An arrow function has no `this` of its own.",
        "You already have something that applies a bare function to a wrapped value. Use it on `other`.",
      ],
      exports: ['box'],
      starter: `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(f(value)),
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other
  }
})
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
    return box((other.value as unknown as (x: unknown) => unknown)(this.value)) as never
  }
})
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
    return this.value(other.value) as never
  }
})
`,
        `interface Box<A> {
  value: A
  map: <B>(f: (a: A) => B) => Box<B>
  ap: <B, C>(this: Box<(b: B) => C>, other: Box<B>) => Box<C>
}

const box = <A>(value: A): Box<A> => ({
  value,
  map: (f) => box(value) as never,
  ap<B, C>(this: Box<(b: B) => C>, other: Box<B>) {
    return other.map(this.value)
  }
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
        T.check('The Box declaration is still there to satisfy', () => {
          return /interface\s+Box/.test(T.src) || 'The Box declaration has gone. It is the thing being satisfied.';
        });
        const box = exp.box;

        T.check('map still works', () => {
          const r = box(21).map((n: number) => n * 2);
          return r.value === 42 || `Mapping gave a box holding ${T.fmt(r.value)}.`;
        });

        T.check('ap applies the wrapped function to the wrapped value', () => {
          const r = box((n: number) => n + 1).ap(box(41));
          return (
            (r && r.value === 42) ||
            `Applying a wrapped increment to a wrapped 41 gave ${T.fmt(r && r.value)}. \`this\` holds the function and \`other\` holds the argument.`
          );
        });

        T.check('The arguments are not the other way round', () => {
          const r = box((s: string) => s + '!').ap(box('hi'));
          return r.value === 'hi!' || `Applying an appender to 'hi' gave ${T.fmt(r.value)}.`;
        });

        T.check('ap gives back a box, not a bare value', () => {
          const r = box((n: number) => n + 1).ap(box(41));
          return (
            (r && typeof r.map === 'function') ||
            `ap gave ${T.fmt(r)}. The return type is Box<C>, so it has to be applyable again.`
          );
        });

        T.check('Two arguments, one ap at a time', () => {
          const r = box((a: number) => (b: number) => a + b).ap(box(1)).ap(box(2));
          return r.value === 3 || `Adding 1 and 2 through two aps gave ${T.fmt(r.value)}. This is the chain map cannot do.`;
        });

        T.check('Three arguments still works', () => {
          const r = box((a: number) => (b: number) => (c: number) => a + b + c).ap(box(1)).ap(box(2)).ap(box(3));
          return r.value === 6 || `Three aps gave ${T.fmt(r.value)}, expected 6.`;
        });

        T.law('ap with a wrapped identity changes nothing', 60, (G) => {
          const n = G.int();
          const r = box((x: number) => x).ap(box(n));
          return r.value === n || `${n} came back as ${T.fmt(r.value)}.`;
        });

        T.law('Applying a wrapped f agrees with mapping a bare f', 60, (G) => {
          const n = G.int();
          const f = G.fn();
          const a = box(f.f).ap(box(n)).value;
          const b = box(n).map(f.f).value;
          return a === b || `With ${f.name} at ${n}: ap gave ${T.fmt(a)} and map gave ${T.fmt(b)}.`;
        });
      },
    },
  ],
};
