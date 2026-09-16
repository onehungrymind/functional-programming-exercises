import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const prism: ExerciseSet = {
  termId: 'prism',
  rungs: [
    {
      id: 'implement',
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
