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
        '`traverse(f, xs)` maps and sequences together. Use it to validate a list of inputs, failing on the first bad one.',
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
  ],
};
