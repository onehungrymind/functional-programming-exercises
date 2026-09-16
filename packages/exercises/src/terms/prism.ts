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
  ],
};
