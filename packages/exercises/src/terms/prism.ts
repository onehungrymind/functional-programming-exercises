import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const prism: ExerciseSet = {
  termId: 'prism',
  rubric: [
    {
      id: 'may-not-match',
      statement:
        "Knows a prism focuses on a case that might not be there, unlike a lens which always finds its focus.",
    },
    {
      id: 'round-trip',
      statement:
        "Can write a matching pair where preview and review undo each other, and knows only exactly round-tripping values may match.",
    },
    {
      id: 'guard-the-edges',
      statement:
        "Can reject the inputs that nearly parse, such as trailing characters, padding, decimals, and the empty string.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can read a prism's type and see that the match may fail, because `preview` hands back an Option and `review` does not.",
    },
  ],
  notes: `Where a lens always finds its focus, a prism focuses on a case that **might not be there**. It
is the optic for a sum type: pick out the Right, the Some, the integer inside a string.

\`\`\`js
const preview = (s) => {          // String -> Option Number
  const n = Number(s)
  return Number.isInteger(n) && String(n) === s ? Some(n) : None()
}
const review = (n) => String(n)   // Number -> String, always succeeds
\`\`\`

The test \`String(n) === s\` is doing the real work. A prism may only match a value it can
**rebuild exactly**, which rules out a surprising number of near misses:

\`\`\`js
preview('42')      // Some(42)
preview('007')     // None. review(7) is '7', not '007', so the round trip would lose it.
preview(' 7 ')     // None. Same reason.
preview('1.5')     // None. Not an integer.
preview('12abc')   // None, though parseInt would happily say 12.
preview('')        // None, though Number('') is 0.
\`\`\`

Those last two are the traps. \`parseInt\` stops at the first bad character and \`Number('')\`
is zero, so both accept things nothing can rebuild:

\`\`\`js
const preview = (s) => {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? None() : Some(n)
}
preview('12abc')   // Some(12), and review(12) is '12'. The original is gone.
\`\`\`

The two laws say exactly that: rebuilding what you previewed gives the original back, and
previewing something you built always matches. Prisms compose with lenses, which is how you
reach into a field that may or may not be the case you want.`,
  typedNotes: `Same track, second lap. A prism is the optic for a part that might not be there, and the
types say so out loud.

\`\`\`ts
type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}
\`\`\`

Read the asymmetry. \`preview\` goes from the whole to \`Option<A>\`, because the case you are
looking for may not be the case you have. \`review\` goes from \`A\` straight back to \`S\` with no
Option anywhere, because building the whole out of the part always works. That lopsided pair
is the entire difference between a prism and an [iso](#iso).

Put a [lens](#lens) beside it and the point lands:

\`\`\`ts
interface Lens<S, A> { getter: (s: S) => A;        setter: (a: A, s: S) => S }
interface Prism<S, A> { preview: (s: S) => Option<A>; review: (a: A) => S }
\`\`\`

A lens focuses a part that is always present, so the getter returns \`A\`. A prism focuses a
part that is sometimes present, so \`preview\` returns \`Option<A>\`. Everything else about how
you use them is the same.

\`\`\`ts
const numeric: Prism<string, number> = {
  preview: (s) => /^(0|[1-9]\\d*)$/.test(s)
    ? { tag: 'some', value: Number(s) }
    : { tag: 'none' },
  review: (n) => String(n)
}

numeric.preview('42')    // { tag: 'some', value: 42 }
numeric.preview('abc')   // { tag: 'none' }
numeric.review(42)       // '42'
\`\`\`

The round trip is where the types stop helping and you have to think. \`preview(review(a))\` is
\`some a\` for every \`a\`, and the compiler will not check that for you. Notice that \`'007'\` has
to be rejected, or the trip back gives \`'7'\` and the law is gone.`,
  rungs: [
    {
      id: 'implement',
      covers: ['round-trip', 'guard-the-edges'],
      kind: 'code',
      role: 'implement',
      title: 'A prism for integers in strings',
      prompt:
        'Where a lens always finds its focus, a prism might not. Build one that reads an integer out of a string when there is one, and rebuilds the string from an integer.',
      hints: [
        '`preview` returns `Some(n)` when the string is a whole number, and `None()` otherwise.',
        '`review` goes the other way and always succeeds.',
        'Only a string that round-trips exactly should match: "007" reviews back to "7", so it must not match.',
      ],
      exports: ['preview', 'review', 'Some', 'None'],
      starter: `const Some = (value) => ({ isSome: true, value })
const None = () => ({ isSome: false })

// preview :: String -> Option Number
const preview = (s) => {
}

// review :: Number -> String
const review = (n) => {
}
`,
      solution: `const Some = (value) => ({ isSome: true, value })
const None = () => ({ isSome: false })

// preview :: String -> Option Number
const preview = (s) => {
  const n = Number(s)
  // Only match when rebuilding gives back exactly what we were handed,
  // so "007" and " 7 " stay out.
  return Number.isInteger(n) && String(n) === s ? Some(n) : None()
}

// review :: Number -> String
const review = (n) => String(n)
`,
      broken: [
        // parseInt is happy with trailing rubbish, so "12abc" matches and cannot round-trip.
        `const Some = (value) => ({ isSome: true, value })
const None = () => ({ isSome: false })
const preview = (s) => {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? None() : Some(n)
}
const review = (n) => String(n)
`,
        // Matches anything Number() can read, including "" and "1.5".
        `const Some = (value) => ({ isSome: true, value })
const None = () => ({ isSome: false })
const preview = (s) => {
  const n = Number(s)
  return Number.isNaN(n) ? None() : Some(n)
}
const review = (n) => String(n)
`,
        // review decorates, so it never previews back to the same number.
        `const Some = (value) => ({ isSome: true, value })
const None = () => ({ isSome: false })
const preview = (s) => {
  const n = Number(s)
  return Number.isInteger(n) && String(n) === s ? Some(n) : None()
}
const review = (n) => \`#\${n}\`
`,
      ],
      checks: (T, exp) => {
        const preview = exp.preview as (s: string) => any;
        const review = exp.review as (n: number) => string;

        T.check('A whole number matches', () => {
          const r = preview('42');
          return (r?.isSome === true && r.value === 42) || `preview("42") gave ${T.fmt(r)}, expected Some(42).`;
        });

        T.check('Something that is not a number does not match', () => {
          const r = preview('abc');
          return r?.isSome === false || `preview("abc") gave ${T.fmt(r)}, expected None.`;
        });

        T.check('A number with trailing rubbish does not match', () => {
          const r = preview('12abc');
          return (
            r?.isSome === false ||
            `preview("12abc") gave ${T.fmt(r)}. parseInt would stop at the first bad character, which matches something that cannot be rebuilt.`
          );
        });

        T.check('A decimal does not match an integer prism', () => {
          const r = preview('1.5');
          return r?.isSome === false || `preview("1.5") gave ${T.fmt(r)}`;
        });

        T.check('An empty string does not match', () => {
          const r = preview('');
          return r?.isSome === false || `preview("") gave ${T.fmt(r)}. Number("") is 0, which is a trap worth guarding.`;
        });

        T.check('A padded number does not match, because it cannot be rebuilt', () => {
          const r = preview('007');
          return (
            r?.isSome === false ||
            `preview("007") gave ${T.fmt(r)}. Reviewing 7 gives "7", not "007", so matching it would break the round trip.`
          );
        });

        T.check('review turns a number back into a string', () => {
          const r = review(42);
          return r === '42' || `Got ${T.fmt(r)}`;
        });

        laws.prism(T, {
          preview,
          review,
          matched: (p: any) => p?.isSome === true,
          focus: (p: any) => p.value,
          sample: (G) => (G.bool() ? String(G.int()) : G.oneOf(['abc', '', '1.5', '007', '12abc'])),
          value: (G) => G.int(),
          runs: 60,
        });
      },
    },

    {
      id: 'recognize',
      covers: ['may-not-match'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Lens or prism?',
      prompt: 'What separates a prism from a lens?',
      options: [
        {
          code: '// A lens always finds its focus; a prism might not',
          correct: true,
          why: 'A lens is for a field that is always there. A prism is for a case that may not match.',
        },
        {
          code: '// A prism is read-only',
          correct: false,
          why: 'Both read and write. review is a prism writing.',
        },
        {
          code: '// A prism only works on strings',
          correct: false,
          why: 'It works on any sum type. Picking the Right out of an Either is a prism.',
        },
        {
          code: '// A lens composes and a prism does not',
          correct: false,
          why: 'Both compose, with each other too. That is most of why optics are interesting.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['may-not-match', 'round-trip', 'typed-signature'],
      title: "Satisfy Prism<string, number>",
      prompt:
        "The interface is given. Fill in `numeric` so that `preview` finds a whole number inside a string when there is one, and `review` puts it back. Only a well-formed number counts: `'007'` is not one.",
      hints: [
        "`preview` returns an Option, never a bare number. That is the whole reason a prism is not a lens.",
        "`/^(0|[1-9]\\d*)$/` accepts `'0'` and `'42'` and rejects `'007'` and `'abc'`.",
        "`review` never fails, so it needs no Option on the way out.",
      ],
      exports: ['numeric'],
      starter: `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}

const numeric: Prism<string, number> = {
  preview: (s) => ({ tag: 'none' }),
  review: (n) => ''
}
`,
      solution: `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}

const numeric: Prism<string, number> = {
  preview: (s) =>
    /^(0|[1-9]\\d*)$/.test(s) ? { tag: 'some', value: Number(s) } : { tag: 'none' },
  review: (n) => String(n)
}
`,
      broken: [
        `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}

const numeric: Prism<string, number> = {
  preview: (s) => ({ tag: 'some', value: Number(s) }),
  review: (n) => String(n)
}
`,
        `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}

const numeric: Prism<string, number> = {
  preview: (s) =>
    /^\\d+$/.test(s) ? { tag: 'some', value: Number(s) } : { tag: 'none' },
  review: (n) => String(n)
}
`,
        `type Option<A> = { tag: 'some', value: A } | { tag: 'none' }

interface Prism<S, A> {
  preview: (s: S) => Option<A>
  review: (a: A) => S
}

const numeric: Prism<string, number> = {
  preview: (s) =>
    /^(0|[1-9]\\d*)$/.test(s) ? { tag: 'some', value: Number(s) } : { tag: 'none' },
  review: (n) => n
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
        T.check('The Prism interface is still there to satisfy', () => {
          return /interface\s+Prism/.test(T.src) || 'The Prism interface has gone. It is the thing being satisfied.';
        });
        const p = exp.numeric;

        T.check('preview finds a number that is there', () => {
          const r = p.preview('42');
          return (
            T.eq(r, { tag: 'some', value: 42 }) ||
            `preview('42') gave ${T.fmt(r)}. It should be an Option carrying 42.`
          );
        });

        T.check('preview comes back empty when there is no match', () => {
          const r = p.preview('abc');
          return (
            r && r.tag === 'none' ||
            `preview('abc') gave ${T.fmt(r)}. Nothing matched, so there is no value to carry.`
          );
        });

        T.check('review never fails, so it hands back the whole directly', () => {
          const r = p.review(42);
          return r === '42' || `review(42) gave ${T.fmt(r)}, expected the string '42'.`;
        });

        T.check('A string that is not well formed does not match', () => {
          const r = p.preview('007');
          return (
            r && r.tag === 'none' ||
            `preview('007') gave ${T.fmt(r)}. If it matched, review would give back '7' and the round trip would be broken.`
          );
        });

        T.law('preview after review always matches', 60, (G) => {
          const n = G.nat();
          const r = p.preview(p.review(n));
          return (
            T.eq(r, { tag: 'some', value: n }) ||
            `review(${n}) then preview gave ${T.fmt(r)}, expected the same number back.`
          );
        });

        T.law('review after a successful preview gives the string back unchanged', 60, (G) => {
          const s = String(G.nat());
          const r = p.preview(s);
          if (!r || r.tag !== 'some') return `preview(${T.fmt(s)}) found nothing, and it should have.`;
          const back = p.review(r.value);
          return back === s || `preview then review turned ${T.fmt(s)} into ${T.fmt(back)}.`;
        });
      },
    },
  ],
};
