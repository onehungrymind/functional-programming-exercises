import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const naturalTransformation: ExerciseSet = {
  termId: 'natural-transformation',
  rubric: [
    {
      id: 'changes-the-container',
      statement:
        "Can convert one functor into another without touching the values inside.",
    },
    {
      id: 'naturality',
      statement:
        "Can state the naturality law and say what it forbids: looking at the values on the way through.",
    },
    {
      id: 'may-drop-elements',
      statement:
        "Knows it may change how many elements there are, as head does, and still be natural.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can say why binding `A` on the function rather than on the type is what stops a natural transformation from looking at the elements.",
    },
  ],
  notes: `A natural transformation changes the **container** and leaves the **contents** alone.

\`\`\`js
// head :: Array a -> Maybe a
const head = (xs) => (xs.length > 0 ? Just(xs[0]) : Nothing())

head([1, 2, 3])   // Just(1)
head([])          // Nothing
\`\`\`

The law says it cannot matter whether you map before or after:

\`\`\`js
nat(fa.map(f))        // has to equal
nat(fa).map(f)

head([1, 2].map((n) => n * 10))   // Just(10)
head([1, 2]).map((n) => n * 10)   // Just(10)
\`\`\`

What that forbids is the transformation **looking at the values**. The moment it does, the two
sides come apart:

\`\`\`js
const head = (xs) => (xs.length ? Just(xs[0] + 1) : Nothing())

head([1, 2].map((n) => n * 10))   // Just(11)
head([1, 2]).map((n) => n * 10)   // Just(20)
\`\`\`

So a natural transformation can only work on **shape**. Wrapping undefined instead of reporting
emptiness breaks a different promise:

\`\`\`js
const head = (xs) => Just(xs[0])
head([])   // Just(undefined), which claims there is a value
\`\`\`

It **may** change how many elements there are. \`head\` drops all but one and is perfectly
natural; so are \`reverse\`, \`Array -> Set\`, and \`Maybe -> Array\`. Naturality constrains what
it can know, not what it can keep.

The practical read: a conversion between two containers should be writable without ever
inspecting an element. If you find yourself needing to, you are writing something else.`,
  typedNotes: `Same track, second lap. This one the types tell you something the JavaScript could only ask
you to believe, and where they stop is worth knowing too.

\`\`\`ts
type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>
\`\`\`

Look at where \`<A>\` sits. It is on the **function**, not on the alias. \`ArrayToMaybe\` is one
concrete thing, and whoever calls it picks the \`A\`. That means the body has to work for every
\`A\` at once: \`number\`, \`string\`, \`User\`, a function, a type nobody has written yet.

So ask what such a body is allowed to do. It cannot compare elements, because \`A\` has no \`<\`.
It cannot test them, because \`A\` has no truthiness you are entitled to rely on. It cannot make
one up, because there is no value of type \`A\` lying around. All it can do is look at the
**shape**, choose some of the elements it was handed, and put them somewhere else.

\`\`\`ts
const head: ArrayToMaybe = (xs) => (xs.length ? some(xs[0]) : none)
const last: ArrayToMaybe = (xs) => (xs.length ? some(xs[xs.length - 1]) : none)
\`\`\`

Both legal, both natural, and neither one knows what it is carrying. Now try to write one that
is not:

\`\`\`ts
const firstTruthy: ArrayToMaybe = (xs) => {
  const hit = xs.find((x) => x)   // error: A is not known to be truthy-testable
  return hit ? some(hit) : none
}
\`\`\`

That is the naturality law showing up as a type error. The law says \`head(xs.map(f))\` is the
same as mapping \`f\` over \`head(xs)\`, and the reason it holds for \`head\` is precisely that
\`head\` cannot consult the elements. The property you were checking by hand in the first lap is
a consequence of the signature.

\`\`\`ts
const xs = [3, 1, 2]
head(xs.map((n) => n * 10))          // some 30
mapMaybe((n) => n * 10, head(xs))    // some 30
\`\`\`

**Where TypeScript runs out.** What a natural transformation actually is, in general, is this:

\`\`\`ts
type Nat<F, G> = <A>(fa: F<A>) => G<A>
\`\`\`

\`F<A>\` is not legal. \`F\` is a plain type parameter, and TypeScript will not let you apply one
to an argument, so you cannot write "for any two containers". What you can write is one alias
per pair, naming both containers concretely. The good news is that the interesting half, \`A\`
being bound on the function so the elements stay opaque, survives that completely. You lose
the ability to say it once for all containers; you do not lose the thing it was saying.`,
  rungs: [
    {
      id: 'implement',
      covers: ['changes-the-container', 'naturality', 'may-drop-elements'],
      kind: 'code',
      role: 'implement',
      title: 'Change the container, not the contents',
      prompt:
        'A natural transformation moves a value from one functor to another without touching what is inside. Write `head :: Array a -> Maybe a`.',
      hints: [
        'An empty array has no head, so that case is Nothing.',
        'Whatever you do, do not apply a function to the element on the way through. Naturality is exactly the promise that you did not.',
      ],
      exports: ['head', 'Just', 'Nothing'],
      starter: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// head :: Array a -> Maybe a
const head = (xs) => {
}
`,
      solution: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// head :: Array a -> Maybe a
const head = (xs) => (xs.length > 0 ? Just(xs[0]) : Nothing())
`,
      broken: [
        // Wraps undefined instead of reporting emptiness.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => Just(xs[0])
`,
        // Touches the value on the way through, which breaks naturality.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => (xs.length > 0 ? Just(xs[0] + 1) : Nothing())
`,
        // Takes the last element rather than the first, which is still natural but wrong.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const head = (xs) => (xs.length > 0 ? Just(xs[xs.length - 1]) : Nothing())
`,
      ],
      checks: (T, exp) => {
        const head = exp.head as (xs: any[]) => any;

        T.check('It takes the first element', () => {
          const r = head([1, 2, 3]);
          return (r?.isNothing === false && r.value === 1) || `Got ${T.fmt(r)}, expected Just(1).`;
        });

        T.check('An empty array gives Nothing', () => {
          const r = head([]);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. Wrapping undefined would claim there is a value when there is not, which is the thing Maybe exists to avoid.`
          );
        });

        T.check('A single-element array works', () => {
          const r = head([7]);
          return r?.value === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('The element comes through untouched', () => {
          const o = { id: 1 };
          const r = head([o]);
          return r?.value === o || 'The element was changed on the way through. A natural transformation moves the container, not the contents.';
        });

        laws.naturalTransformation(
          T,
          (xs: any[]) => head(xs),
          (n: number) => [n, n + 1, n + 2],
          60,
        );

        T.check('Naturality holds for the empty case too', () => {
          const left = head([].map((x: number) => x + 1));
          const right = head([]).map((x: number) => x + 1);
          return (
            left?.isNothing === true && right?.isNothing === true ||
            `Mapping before gave ${T.fmt(left)} and mapping after gave ${T.fmt(right)}. Both should be Nothing.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['naturality'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does naturality forbid?',
      prompt: 'The law says `nat(fa.map(f))` equals `nat(fa).map(f)`. What does that rule out?',
      options: [
        {
          code: '// The transformation looking at the values it carries',
          correct: true,
          why: 'If it inspected or changed them, mapping before and after would give different answers. It can only work on the shape.',
        },
        {
          code: '// The transformation changing the number of elements',
          correct: false,
          why: 'It can. head drops all but one, and that is perfectly natural.',
        },
        {
          code: '// The transformation being partial',
          correct: false,
          why: 'head is partial in spirit, which is why it returns a Maybe. Naturality is untroubled.',
        },
        {
          code: '// Using map inside the transformation',
          correct: false,
          why: 'Not forbidden in itself. Mapping with identity would be fine, if pointless.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['changes-the-container', 'naturality', 'typed-signature'],
      title: "Satisfy ArrayToMaybe",
      prompt:
        "The alias is given. Write `head` so it changes the container without ever consulting what is inside it.",
      hints: [
        "`A` is bound on the function, so the body has to work for every type at once.",
        "Ask about the array, not about the elements. `xs.length` is fair game; `xs[0] > 0` is not.",
        "An empty array has no first element, and there is no value of type `A` you could invent instead.",
      ],
      exports: ['head'],
      starter: `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>

const head: ArrayToMaybe = (xs) => none
`,
      solution: `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>

const head: ArrayToMaybe = (xs) => (xs.length ? some(xs[0]) : none)
`,
      broken: [
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>

const head: ArrayToMaybe = (xs) => some(xs[0])
`,
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>

const head: ArrayToMaybe = (xs) => {
  const hit = (xs as unknown[]).find((x) => x)
  return hit === undefined ? none : some(hit as never)
}
`,
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

type ArrayToMaybe = <A>(xs: A[]) => Maybe<A>

const head: ArrayToMaybe = (xs) => (xs.length ? some(xs[xs.length - 1]) : none)
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
        T.check('The ArrayToMaybe declaration is still there to satisfy', () => {
          return /type\s+ArrayToMaybe/.test(T.src) || 'The ArrayToMaybe declaration has gone. It is the thing being satisfied.';
        });
        const head = exp.head;
        const mapMaybe = (f: (a: unknown) => unknown, m: { tag: string, value?: unknown }) =>
          m.tag === 'some' ? { tag: 'some', value: f(m.value) } : m;

        T.check('A filled array gives its first element', () => {
          const r = head([3, 1, 2]);
          return T.eq(r, { tag: 'some', value: 3 }) || `head([3, 1, 2]) gave ${T.fmt(r)}.`;
        });

        T.check('It is the first, not the last', () => {
          const r = head(['a', 'b', 'c']);
          return (
            T.eq(r, { tag: 'some', value: 'a' }) ||
            `head(['a', 'b', 'c']) gave ${T.fmt(r)}. Either end is a natural transformation, but this one is head.`
          );
        });

        T.check('An empty array gives nothing, not a some holding undefined', () => {
          const r = head([]);
          return (
            (r && r.tag === 'none') ||
            `head([]) gave ${T.fmt(r)}. There is no value of type A to put in there, which is the whole reason the result is a Maybe.`
          );
        });

        T.check('A falsy first element is still the first element', () => {
          const a = head([0, 1, 2]);
          const b = head([false, true]);
          return (
            (T.eq(a, { tag: 'some', value: 0 }) && T.eq(b, { tag: 'some', value: false })) ||
            `head([0, 1, 2]) gave ${T.fmt(a)} and head([false, true]) gave ${T.fmt(b)}. \`A\` is a variable, so the body is not entitled to test the elements for truthiness.`
          );
        });

        T.check('It carries whatever it is handed, including functions', () => {
          const f = (n: number) => n;
          const r = head([f, f]);
          return (r.tag === 'some' && r.value === f) || `An array of functions gave ${T.fmt(r)}.`;
        });

        T.law('Naturality: mapping then transforming is transforming then mapping', 80, (G) => {
          const xs = G.ints();
          const f = G.fn();
          const a = head(xs.map(f.f));
          const b = mapMaybe(f.f as never, head(xs) as never);
          return (
            T.eq(a, b) ||
            `With ${f.name} over ${T.fmt(xs)}: mapping first gave ${T.fmt(a)} and transforming first gave ${T.fmt(b)}.`
          );
        });

        T.law('The length of the input decides the tag, nothing else', 80, (G) => {
          const xs = G.ints();
          const r = head(xs);
          const want = xs.length ? 'some' : 'none';
          return r.tag === want || `${T.fmt(xs)} has length ${xs.length}, so the tag should be ${want} and it was ${T.fmt(r.tag)}.`;
        });
      },
    },
  ],
};
