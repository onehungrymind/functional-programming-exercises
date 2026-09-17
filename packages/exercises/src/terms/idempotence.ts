import { idempotence as idempotenceLaw } from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const idempotence: ExerciseSet = {
  termId: 'idempotence',
  rubric: [
    {
      id: 'the-law',
      statement:
        "Can state the law, f(f(x)) equals f(x), and classify a function against it.",
    },
    {
      id: 'not-repetition',
      statement:
        "Knows idempotent means applying it again changes nothing, not that it can be called safely twice.",
    },
    {
      id: 'make-it-so',
      statement:
        "Can make a normalizer idempotent, doing all of the work in the first pass rather than some of it each time.",
    },
  ],
  notes: `Idempotent means applying it again changes nothing: \`f(f(x))\` equals \`f(x)\`.

\`\`\`js
Math.abs(Math.abs(-5))    // 5, the same as Math.abs(-5)
'  hi  '.trim().trim()    // 'hi', the same as one trim
[3, 1].sort().sort()      // [1, 3], the same as one sort

;((n) => n + 1)(((n) => n + 1)(0))   // 2, and one application gives 1. Not idempotent.
\`\`\`

The usual confusion is with "safe to call twice". A DELETE request is often called idempotent
because the second one does no further harm, but that is about **effects**, not about a value
settling. Here the law is about the value:

\`\`\`js
const push = (xs) => [...xs, 0]
push(push([]))    // [0, 0]
push([])          // [0]      different, so not idempotent
\`\`\`

When you write a normalizer, the trap is doing **some** of the work per pass rather than all of
it in the first:

\`\`\`js
// strips one +tag per call, so two tags need two passes
const normalize = (email) => {
  const [local, domain] = email.split('@')
  const parts = local.split('+')
  return \`\${parts.slice(0, -1).join('+') || parts[0]}@\${domain}\`
}
normalize('ada+a+b@x.com')              // 'ada+a@x.com'
normalize(normalize('ada+a+b@x.com'))   // 'ada@x.com'   not settled after one

// everything from the first plus goes, in one pass
const normalize = (email) => {
  const [local, domain] = email.trim().toLowerCase().split('@')
  return \`\${local.split('+')[0]}@\${domain}\`
}
\`\`\`

And anything that appends a marker is never idempotent, however innocent it looks:

\`\`\`js
const normalize = (s) => s.trim() + ' [normalized]'   // grows on every pass
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['the-law', 'not-repetition'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are idempotent?',
      prompt: 'A function is idempotent when applying it again changes nothing: `f(f(x))` equals `f(x)`.',
      options: [
        { code: 'const abs = (n) => Math.abs(n)', correct: true, why: 'The absolute value of an absolute value is the same number.' },
        {
          code: 'const inc = (n) => n + 1',
          correct: false,
          why: 'Every application moves further. f(f(0)) is 2, not 1.',
        },
        {
          code: 'const sort = (xs) => [...xs].sort()',
          correct: true,
          why: 'Sorting a sorted list gives the same list back.',
        },
        {
          code: 'const trim = (s) => s.trim()',
          correct: true,
          why: 'Once the whitespace is gone there is none left to remove.',
        },
        {
          code: 'const push = (xs) => [...xs, 0]',
          correct: false,
          why: 'Each application makes the list longer.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['make-it-so', 'the-law'],
      kind: 'code',
      role: 'implement',
      title: 'Make normalizeEmail idempotent',
      prompt:
        'Normalizing an already-normalized address has to leave it alone. Trim the whitespace, lower-case it, and drop any `+tag` from the local part.',
      hints: [
        'Split on `@`, work on the local part, and put it back together.',
        'A `+tag` is everything from the first plus to the at-sign. Removing it twice must be the same as removing it once.',
      ],
      exports: ['normalizeEmail'],
      starter: `// normalizeEmail :: String -> String
const normalizeEmail = (email) => {
  // trim, lower-case, and drop any +tag before the @
}
`,
      solution: `// normalizeEmail :: String -> String
const normalizeEmail = (email) => {
  const [local, domain] = email.trim().toLowerCase().split('@')
  if (domain === undefined) return local
  return \`\${local.split('+')[0]}@\${domain}\`
}
`,
      broken: [
        // Appends a marker every time, so a second pass keeps growing it.
        `const normalizeEmail = (email) => {
  const [local, domain] = email.trim().toLowerCase().split('@')
  if (domain === undefined) return local
  return \`\${local.split('+')[0]}@\${domain}+normalized\`
}
`,
        // Forgets to lower-case, so a second pass is the same but the first was wrong.
        `const normalizeEmail = (email) => {
  const [local, domain] = email.trim().split('@')
  if (domain === undefined) return local
  return \`\${local.split('+')[0]}@\${domain}\`
}
`,
        // Only strips one plus segment per pass, so two tags need two passes.
        `const normalizeEmail = (email) => {
  const [local, domain] = email.trim().toLowerCase().split('@')
  if (domain === undefined) return local
  const parts = local.split('+')
  return \`\${parts.slice(0, parts.length - 1).join('+') || parts[0]}@\${domain}\`
}
`,
      ],
      checks: (T, exp) => {
        const normalizeEmail = exp.normalizeEmail as (s: string) => string;

        T.check('Whitespace and case are cleaned up', () => {
          const r = normalizeEmail('  Ada@Example.COM ');
          return r === 'ada@example.com' || `Got ${T.fmt(r)}, expected "ada@example.com".`;
        });

        T.check('A +tag is dropped', () => {
          const r = normalizeEmail('ada+newsletter@example.com');
          return r === 'ada@example.com' || `Got ${T.fmt(r)}, expected "ada@example.com".`;
        });

        T.check('More than one +tag is dropped in a single pass', () => {
          const r = normalizeEmail('ada+a+b@example.com');
          return (
            r === 'ada@example.com' ||
            `Got ${T.fmt(r)}. Everything from the first plus onward goes, or a second pass would still have work to do.`
          );
        });

        T.check('An already-normal address is untouched', () => {
          const r = normalizeEmail('ada@example.com');
          return r === 'ada@example.com' || `Got ${T.fmt(r)}`;
        });

        idempotenceLaw(
          T,
          (s: string) => normalizeEmail(s),
          (G) => {
            const local = G.oneOf(['Ada', ' ada ', 'ada+tag', 'ADA+a+b', 'a.b']);
            const domain = G.oneOf(['Example.com', 'example.COM', 'mail.example.com']);
            return `${local}@${domain}`;
          },
          60,
        );
      },
    },

    {
      id: 'classify',
      kind: 'code',
      role: 'apply',
      covers: ['not-repetition', 'the-law'],
      title: "Tell idempotent apart from safe to repeat",
      prompt:
        "Write `isIdempotent`, which applies a function once and again and compares. Then classify `append`, which is perfectly safe to call as often as you like and is not idempotent. The two are not the same thing.",
      hints: [
        "The law is `f(f(x))` equals `f(x)`. Check it against every sample, not just one.",
        "Compare by contents, not by identity. `snapshot` is there for that.",
        "`append` never throws, never corrupts anything, and gives a longer list every time. Safe to retry is not the same as idempotent.",
      ],
      exports: ['isIdempotent', 'append', 'verdicts'],
      starter: `const snapshot = (v) => JSON.stringify(v)

// isIdempotent :: ((a -> a), [a]) -> Boolean
const isIdempotent = (f, samples) => true

// append :: [Number] -> [Number]   safe to call repeatedly, not idempotent
const append = (xs) => xs

// verdicts :: { [name]: Boolean }
const verdicts = {
  abs: true,
  append: true,
  trim: true,
  increment: true
}
`,
      solution: `const snapshot = (v) => JSON.stringify(v)

// isIdempotent :: ((a -> a), [a]) -> Boolean
const isIdempotent = (f, samples) =>
  samples.every((x) => snapshot(f(f(x))) === snapshot(f(x)))

// append :: [Number] -> [Number]   safe to call repeatedly, not idempotent
const append = (xs) => [...xs, 0]

// verdicts :: { [name]: Boolean }
const verdicts = {
  abs: true,
  append: false,
  trim: true,
  increment: false
}
`,
      broken: [
        `const snapshot = (v) => JSON.stringify(v)
const isIdempotent = (f, samples) => samples.every((x) => f(f(x)) === f(x))
const append = (xs) => [...xs, 0]
const verdicts = { abs: true, append: false, trim: true, increment: false }
`,
        `const snapshot = (v) => JSON.stringify(v)
const isIdempotent = (f, samples) =>
  samples.every((x) => snapshot(f(f(x))) === snapshot(f(x)))
const append = (xs) => xs
const verdicts = { abs: true, append: false, trim: true, increment: false }
`,
        `const snapshot = (v) => JSON.stringify(v)
const isIdempotent = (f, samples) =>
  samples.every((x) => snapshot(f(f(x))) === snapshot(f(x)))
const append = (xs) => [...xs, 0]
const verdicts = { abs: true, append: true, trim: true, increment: false }
`,
        `const snapshot = (v) => JSON.stringify(v)
const isIdempotent = (f, samples) =>
  samples.some((x) => snapshot(f(f(x))) === snapshot(f(x)))
const append = (xs) => [...xs, 0]
const verdicts = { abs: true, append: false, trim: true, increment: false }
`,
      ],
      checks: (T, exp) => {
        const { isIdempotent, append, verdicts } = exp;

        T.check('It says yes to absolute value', () => {
          const r = isIdempotent(Math.abs, [-3, 0, 5]);
          return r === true || `Math.abs was reported as ${T.fmt(r)}. Taking it twice is taking it once.`;
        });

        T.check('It says no to adding one', () => {
          const r = isIdempotent((n: number) => n + 1, [0, 1, 2]);
          return r === false || `Adding one was reported as ${T.fmt(r)}.`;
        });

        T.check('It compares contents, not identity', () => {
          const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
          const r = isIdempotent(sorted, [[3, 1, 2], [1]]);
          return (
            r === true ||
            `Sorting was reported as ${T.fmt(r)}. It gives a new array each time, so comparing with === would always say no even though the contents match.`
          );
        });

        T.check('One passing sample is not enough', () => {
          const halfBaked = (n: number) => (n === 0 ? 0 : n + 1);
          const r = isIdempotent(halfBaked, [0, 1, 2]);
          return (
            r === false ||
            `A function that holds only at zero was reported as ${T.fmt(r)}. The law has to hold for every sample.`
          );
        });

        T.check('append grows the list', () => {
          const r = append([1, 2]);
          return (
            Array.isArray(r) && r.length === 3 ||
            `append([1, 2]) gave ${T.fmt(r)}. It needs to actually add something, or there is nothing to classify.`
          );
        });

        T.check('append leaves its argument alone', () => {
          const xs = T.freeze([1, 2]);
          append(xs);
          return xs.length === 2 || `The original list is now ${T.fmt(xs)}.`;
        });

        T.check('append is safe to call as often as you like', () => {
          let threw = false;
          try {
            append(append(append([])));
          } catch {
            threw = true;
          }
          return !threw || 'append threw when called repeatedly. It is meant to be the harmless one.';
        });

        T.check('append is not idempotent, and the verdicts say so', () => {
          const measured = isIdempotent(append, [[], [1, 2]]);
          if (measured !== false) return `Your own isIdempotent reports append as ${T.fmt(measured)}, and it should be false.`;
          return (
            verdicts.append === false ||
            'The verdicts list append as idempotent. It is safe to retry and it changes the value every time, and those are two different properties.'
          );
        });

        T.check('The other three verdicts are right', () => {
          const want = { abs: true, trim: true, increment: false };
          for (const [k, v] of Object.entries(want)) {
            if (verdicts[k] !== v) return `verdicts.${k} is ${T.fmt(verdicts[k])}, and it should be ${v}.`;
          }
          return true;
        });
      },
    },
  ],
};
