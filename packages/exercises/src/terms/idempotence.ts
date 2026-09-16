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
  ],
};
