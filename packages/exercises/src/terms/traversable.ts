import type { ExerciseSet } from '@fpx/engine/types';

export const traversable: ExerciseSet = {
  termId: 'traversable',
  rubric: [
    {
      id: 'swap-the-layers',
      statement:
        "Can turn a structure of containers into a container of the structure, so the check happens once.",
    },
    {
      id: 'all-or-nothing',
      statement:
        "Knows one failure sinks the whole thing, and that filtering the failures out is a different operation.",
    },
    {
      id: 'empty-succeeds',
      statement:
        "Knows an empty structure succeeds, because nothing failed.",
    },
    {
      id: 'traverse',
      statement:
        "Can map and sequence in one pass, and use it to validate a list.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read `sequence`'s type as a layer swap, and name what has to be true for the swap to be possible at all.",
    },
  ],
  notes: `Traversable swaps two layers. An array of Maybes becomes a Maybe of an array, so you check once
instead of at every element.

\`\`\`js
const sequence = (maybes) => {
  const out = []
  for (const m of maybes) {
    if (m.isNothing) return Nothing()     // one failure sinks it
    out.push(m.value)
  }
  return Just(out)
}

sequence([Just(1), Just(2), Just(3)])     // Just([1, 2, 3])
sequence([Just(1), Nothing(), Just(3)])   // Nothing
\`\`\`

All-or-nothing is the contract. Dropping the failures is a perfectly good operation and it is
**not** this one:

\`\`\`js
Just(maybes.filter((m) => !m.isNothing).map((m) => m.value))   // Just([1, 3]). Different.
\`\`\`

The empty case succeeds, because nothing failed:

\`\`\`js
sequence([])   // Just([]), not Nothing
\`\`\`

\`traverse\` maps and sequences in one pass, which is what you actually reach for:

\`\`\`js
const traverse = (f, xs) => {
  const out = []
  for (const x of xs) {
    const m = f(x)
    if (m.isNothing) return Nothing()
    out.push(m.value)
  }
  return Just(out)
}

const parseNum = (s) => {
  const n = Number(s)
  return Number.isInteger(n) && s.trim() !== '' ? Just(n) : Nothing()
}

traverse(parseNum, ['1', '2', '3'])   // Just([1, 2, 3])
traverse(parseNum, ['1', 'x', '3'])   // Nothing
traverse(parseNum, ['1', '', '3'])    // Nothing, and note Number('') is 0
\`\`\`

Swap Maybe for a Promise-like and the same shape gives you "run all of these and give me one
result", which is what \`Promise.all\` is.`,
  typedNotes: `Same track, second lap. The signature is the concept. Read it as two nested things trading
places.

\`\`\`ts
const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => ...
\`\`\`

In: an array of Maybes. Out: a Maybe of an array. Same two containers, opposite order. Nothing
else in this glossary has a type quite that legible, and the name for it is the layer swap.

Now read it for consequences. The result is \`Maybe<A[]>\`, a single Maybe on the outside, so
there is exactly one decision to report. It cannot be partly empty. Either the whole thing is
a \`some\` carrying every value, or it is a \`none\` carrying nothing, and that is where "all or
nothing" comes from. A signature returning \`Maybe<A>[]\` would be the other thing, one decision
per element, and that is just the input again.

\`\`\`ts
const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => {
  const out: A[] = []
  for (const m of xs) {
    if (m.tag === 'none') return none
    out.push(m.value)
  }
  return some(out)
}

sequence([some(1), some(2)])   // some [1, 2]
sequence([some(1), none])      // none
sequence([])                   // some []
\`\`\`

The empty case falls out of the type rather than being a special case. \`Maybe<A[]>\` with no
elements to object is a \`some\` holding \`[]\`, because there was no \`none\` to find. Returning
\`none\` there would be saying a failure happened, and none did.

\`traverse\` is the same swap with a map folded in:

\`\`\`ts
const traverse = <A, B>(f: (a: A) => Maybe<B>, xs: A[]): Maybe<B[]> =>
  sequence(xs.map(f))
\`\`\`

\`(a: A) => Maybe<B>\` is a function that may fail, \`A[]\` is a list of inputs, and \`Maybe<B[]>\`
is one answer for the lot. That is validation, written as a type.

**Where TypeScript runs out.** The general statement is:

\`\`\`ts
const sequence: <F, G, A>(fga: F<G<A>>) => G<F<A>>
\`\`\`

which needs \`F\` and \`G\` to be type constructors, and TypeScript's type parameters only range
over types. So you cannot write "for any traversable outer and any applicative inner", and
there is no \`interface Traversable<T>\` to implement. What you can write is one \`sequence\` per
pair: array of Maybe, array of Either, tree of Maybe, each a separate function with the same
shape.

That is a real loss, and it is worth being clear that it is a loss of expression rather than
of understanding. The swap is the same swap every time. You just have to say it once per pair
instead of once.`,
  rungs: [
    {
      id: 'implement',
      covers: ['swap-the-layers', 'all-or-nothing', 'empty-succeeds'],
      kind: 'code',
      role: 'implement',
      title: 'Turn the structure inside out',
      prompt:
        '`sequence` swaps two layers: an array of Maybes becomes a Maybe of an array. It succeeds only when every element does.',
      hints: [
        'Walk the list, and as soon as one element is Nothing the whole thing is Nothing.',
        'Otherwise collect the values into one array and wrap it once.',
      ],
      exports: ['sequence'],
      starter: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// sequence :: [Maybe a] -> Maybe [a]
const sequence = (maybes) => {
}
`,
      solution: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// sequence :: [Maybe a] -> Maybe [a]
const sequence = (maybes) => {
  const out = []
  for (const m of maybes) {
    if (m.isNothing) return Nothing()
    out.push(m.value)
  }
  return Just(out)
}
`,
      broken: [
        // Drops the failures instead of failing the whole thing.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const sequence = (maybes) => Just(maybes.filter((m) => !m.isNothing).map((m) => m.value))
`,
        // Leaves the layers as they were.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const sequence = (maybes) => maybes
`,
        // An empty list comes back as Nothing, which loses the identity case.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const sequence = (maybes) => {
  if (maybes.length === 0) return Nothing()
  const out = []
  for (const m of maybes) {
    if (m.isNothing) return Nothing()
    out.push(m.value)
  }
  return Just(out)
}
`,
      ],
      checks: (T, exp) => {
        const sequence = exp.sequence as (ms: any[]) => any;
        const Just = (v: any) => ({ isNothing: false, value: v, map: (f: any) => Just(f(v)) });
        const Nothing = () => ({ isNothing: true, map: () => Nothing() });

        T.check('All present becomes one Just of the values', () => {
          const r = sequence([Just(1), Just(2), Just(3)]);
          return (
            r?.isNothing === false && T.eq(r.value, [1, 2, 3]) ||
            `Got ${T.fmt(r)}, expected Just([1, 2, 3]).`
          );
        });

        T.check('One missing makes the whole thing Nothing', () => {
          const r = sequence([Just(1), Nothing(), Just(3)]);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. sequence is all or nothing: a single failure has to sink it, not be filtered out.`
          );
        });

        T.check('An empty list succeeds with an empty array', () => {
          const r = sequence([]);
          return (
            r?.isNothing === false && T.eq(r.value, []) ||
            `Got ${T.fmt(r)}, expected Just([]). Nothing failed, because there was nothing to fail.`
          );
        });

        T.check('The order of the values is kept', () => {
          const r = sequence([Just('a'), Just('b'), Just('c')]);
          return T.eq(r?.value, ['a', 'b', 'c']) || `Got ${T.fmt(r?.value)}`;
        });

        T.check('The layers really are swapped', () => {
          const r = sequence([Just(1)]);
          return (
            Array.isArray(r?.value) ||
            `Got ${T.fmt(r)}. The result should be one Maybe holding an array, not an array of Maybes.`
          );
        });

        T.check('Nothing is lost when everything is present', () => {
          const inputs = [Just(1), Just(2), Just(3), Just(4)];
          const r = sequence(inputs);
          return (
            r?.value?.length === inputs.length ||
            `Four Justs gave ${T.fmt(r?.value)}. Every element has to come through.`
          );
        });
      },
    },

    {
      id: 'apply',
      covers: ['traverse', 'all-or-nothing'],
      kind: 'code',
      role: 'apply',
      title: 'traverse in one pass',
      prompt:
        "`traverse(f, xs)` maps and sequences together. Use it to validate a list of inputs, failing on the first bad one. Write `traverse`, then `parseAll` on top of it.",
      hints: ['Apply f to each element, then sequence the results. One pass is enough.'],
      exports: ['traverse', 'parseAll'],
      starter: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// traverse :: ((a -> Maybe b), [a]) -> Maybe [b]
const traverse = (f, xs) => {
}

// parseAll :: [String] -> Maybe [Number]
const parseAll = (strings) => {
  // each string must be a whole number
}
`,
      solution: `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

// traverse :: ((a -> Maybe b), [a]) -> Maybe [b]
const traverse = (f, xs) => {
  const out = []
  for (const x of xs) {
    const m = f(x)
    if (m.isNothing) return Nothing()
    out.push(m.value)
  }
  return Just(out)
}

const parseNum = (s) => {
  const n = Number(s)
  return Number.isInteger(n) && s.trim() !== '' ? Just(n) : Nothing()
}

// parseAll :: [String] -> Maybe [Number]
const parseAll = (strings) => traverse(parseNum, strings)
`,
      broken: [
        // Keeps going and collects undefined for the failures.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const traverse = (f, xs) => Just(xs.map((x) => f(x).value))
const parseNum = (s) => {
  const n = Number(s)
  return Number.isInteger(n) && s.trim() !== '' ? Just(n) : Nothing()
}
const parseAll = (strings) => traverse(parseNum, strings)
`,
        // Accepts an empty string, which Number() turns into 0.
        `const Just = (value) => ({ isNothing: false, value, map: (f) => Just(f(value)) })
const Nothing = () => ({ isNothing: true, map: () => Nothing() })

const traverse = (f, xs) => {
  const out = []
  for (const x of xs) {
    const m = f(x)
    if (m.isNothing) return Nothing()
    out.push(m.value)
  }
  return Just(out)
}
const parseNum = (s) => {
  const n = Number(s)
  return Number.isInteger(n) ? Just(n) : Nothing()
}
const parseAll = (strings) => traverse(parseNum, strings)
`,
      ],
      checks: (T, exp) => {
        const traverse = exp.traverse as (f: (x: any) => any, xs: any[]) => any;
        const parseAll = exp.parseAll as (ss: string[]) => any;
        const Just = (v: any) => ({ isNothing: false, value: v, map: (f: any) => Just(f(v)) });
        const Nothing = () => ({ isNothing: true, map: () => Nothing() });

        T.check('traverse maps and collects when everything succeeds', () => {
          const r = traverse((n: number) => Just(n * 2), [1, 2, 3]);
          return T.eq(r?.value, [2, 4, 6]) || `Got ${T.fmt(r)}, expected Just([2, 4, 6]).`;
        });

        T.check('traverse fails as a whole on one failure', () => {
          const r = traverse((n: number) => (n > 0 ? Just(n) : Nothing()), [1, -1, 3]);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. Collecting undefined for the failures is the trap here: one failure sinks the lot.`
          );
        });

        T.check('parseAll reads a list of numbers', () => {
          const r = parseAll(['1', '2', '3']);
          return T.eq(r?.value, [1, 2, 3]) || `Got ${T.fmt(r)}`;
        });

        T.check('One bad entry fails the list', () => {
          const r = parseAll(['1', 'x', '3']);
          return r?.isNothing === true || `Got ${T.fmt(r)}`;
        });

        T.check('An empty string is not a number', () => {
          const r = parseAll(['1', '', '3']);
          return (
            r?.isNothing === true ||
            `Got ${T.fmt(r)}. Number("") is 0, which slips through a check that only asks whether the result is an integer.`
          );
        });

        T.check('An empty list succeeds', () => {
          const r = parseAll([]);
          return (r?.isNothing === false && T.eq(r.value, [])) || `Got ${T.fmt(r)}, expected Just([]).`;
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['swap-the-layers', 'all-or-nothing', 'empty-succeeds', 'typed-signature'],
      title: "Write sequence over an array of Maybes",
      prompt:
        "The types are given. Write `sequence` so an array of Maybes becomes one Maybe of an array, with a single answer for the whole list.",
      hints: [
        "The return type has one Maybe on the outside, so there is one decision to make, not one per element.",
        "A single `none` anywhere settles it. Everything after that is irrelevant.",
        "An empty array had no failure in it, so read the return type again and ask what that means.",
      ],
      exports: ['sequence'],
      starter: `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => none
`,
      solution: `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => {
  const out: A[] = []
  for (const m of xs) {
    if (m.tag === 'none') return none
    out.push(m.value)
  }
  return some(out)
}
`,
      broken: [
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> =>
  some(xs.filter((m) => m.tag === 'some').map((m) => (m as { value: A }).value))
`,
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => {
  if (xs.length === 0) return none
  const out: A[] = []
  for (const m of xs) {
    if (m.tag === 'none') return none
    out.push(m.value)
  }
  return some(out)
}
`,
        `type Maybe<A> =
  | { tag: 'some', value: A }
  | { tag: 'none' }

const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => {
  const out: A[] = []
  for (const m of xs) {
    if (m.tag === 'none') return none
    out.unshift(m.value)
  }
  return some(out)
}
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
        const sequence = exp.sequence;
        const some = (v: unknown) => ({ tag: 'some', value: v });
        const none = { tag: 'none' };

        T.check('All present becomes one some holding all of them', () => {
          const r = sequence([some(1), some(2), some(3)]);
          return T.eq(r, some([1, 2, 3])) || `Three somes gave ${T.fmt(r)}, expected one some holding [1, 2, 3].`;
        });

        T.check('One missing settles the whole thing', () => {
          const r = sequence([some(1), none, some(3)]);
          return (
            (r && r.tag === 'none') ||
            `A list with one none gave ${T.fmt(r)}. There is one Maybe on the outside, so there is one answer, and it cannot be partly successful.`
          );
        });

        T.check('A none at the very end still settles it', () => {
          const r = sequence([some(1), some(2), none]);
          return (r && r.tag === 'none') || `A none in the last position gave ${T.fmt(r)}.`;
        });

        T.check('The empty list succeeds', () => {
          const r = sequence([]);
          return (
            T.eq(r, some([])) ||
            `sequence([]) gave ${T.fmt(r)}. Nothing failed, so there is nothing to report, and the type says that is a some holding an empty array.`
          );
        });

        T.check('Order is preserved', () => {
          const r = sequence([some('a'), some('b'), some('c')]);
          return T.eq(r, some(['a', 'b', 'c'])) || `Sequencing a, b, c gave ${T.fmt(r)}.`;
        });

        T.check('Falsy values are values', () => {
          const r = sequence([some(0), some(''), some(false)]);
          return T.eq(r, some([0, '', false])) || `A list of falsy somes gave ${T.fmt(r)}.`;
        });

        T.law('Success carries every value through, in order', 60, (G) => {
          const xs = G.ints();
          const r = sequence(xs.map(some));
          return T.eq(r, some(xs)) || `${T.fmt(xs)} came back as ${T.fmt(r)}.`;
        });

        T.law('A none anywhere means none overall', 60, (G) => {
          const xs = G.ints();
          const at = xs.length ? G.nat() % xs.length : 0;
          const ms = xs.map((n, i) => (i === at ? none : some(n)));
          if (!ms.length) return true;
          const r = sequence(ms);
          return (
            r.tag === 'none' ||
            `With a none at index ${at} of ${ms.length}, the result was ${T.fmt(r)}.`
          );
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'traverse'],
      title: "One Maybe on the outside means one decision",
      prompt:
        "`Maybe<A>[]` goes in and `Maybe<A[]>` comes out, so there is exactly one answer for the whole list. Type an array of the three tags.",
      hints: [
        "A single `none` anywhere settles the whole thing, because there is only one Maybe left to report with.",
        "The empty list had no failure in it, so nothing went wrong.",
        "There is no partly-successful result the return type could express.",
      ],
      context: `type Maybe<A> = { tag: 'some', value: A } | { tag: 'none' }
const some = <A>(value: A): Maybe<A> => ({ tag: 'some', value })
const none: Maybe<never> = { tag: 'none' }

const sequence = <A>(xs: Maybe<A>[]): Maybe<A[]> => {
  const out: A[] = []
  for (const m of xs) {
    if (m.tag === 'none') return none
    out.push(m.value)
  }
  return some(out)
}
`,
      placeholder: "[..., ..., ...]",
      expect: ["some","none","some"],
      solution: "[sequence([some(1), some(2)]).tag, sequence([some(1), none]).tag, sequence([]).tag]",
      broken: ["['some', 'none', 'none']", "['some', 'some', 'some']", "['none', 'none', 'some']"],
    },
  ],
};
