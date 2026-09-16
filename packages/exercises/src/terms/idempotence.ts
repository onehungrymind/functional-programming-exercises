import { idempotence as idempotenceLaw } from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const idempotence: ExerciseSet = {
  termId: 'idempotence',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'recognize',
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
