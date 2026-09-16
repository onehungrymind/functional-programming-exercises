import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const setoid: ExerciseSet = {
  termId: 'setoid',
  rubric: [
    {
      id: 'by-contents',
      statement:
        "Can give a type an equals that compares contents rather than identity.",
    },
    {
      id: 'three-laws',
      statement:
        "Can state reflexivity, symmetry and transitivity, and say which one a given definition breaks.",
    },
    {
      id: 'boolean',
      statement:
        "Knows equals answers true or false, and that an ordering dressed as an equality fails symmetry.",
    },
  ],
  notes: `A Setoid is a type that knows how to compare itself. The interesting part is not \`equals\`, it
is the three laws it has to satisfy.

\`\`\`js
const Point = (x, y) => ({
  x, y,
  equals: (other) => other.x === x && other.y === y
})

Point(1, 2).equals(Point(1, 2))   // true
{ x: 1 } === { x: 1 }              // false. === asks whether it is the same object.
\`\`\`

**Reflexive**: everything equals itself. **Symmetric**: the order does not matter.
**Transitive**: equality chains.

The one people break is symmetry, usually by writing an ordering and calling it an equality:

\`\`\`js
const Score = (n) => ({ n, equals: (other) => other.n >= n })

Score(1).equals(Score(2))   // true
Score(2).equals(Score(1))   // false   not symmetric
\`\`\`

Reflexivity and transitivity both survive that, which is why checking one law is not enough.

Also worth guarding: comparing only part of the value passes the laws and is still wrong, and
it is the kind of thing a quick test misses:

\`\`\`js
const Point = (x, y) => ({ x, y, equals: (other) => other.x === x })
Point(1, 2).equals(Point(1, 99))   // true, and reflexive, symmetric and transitive
\`\`\`

The laws tell you the relation is well-behaved, not that it means what you intended.`,
  rungs: [
    {
      id: 'implement',
      covers: ['by-contents', 'three-laws', 'boolean'],
      kind: 'code',
      role: 'implement',
      title: 'Equality you can rely on',
      prompt:
        'A Setoid has an `equals` that is reflexive, symmetric, and transitive. Give Point one that compares by contents rather than by identity.',
      hints: [
        '`===` on two objects asks whether they are the same object, which is not what you want here.',
        'Compare the coordinates.',
      ],
      exports: ['Point'],
      starter: `// Point :: (Number, Number) -> Setoid
const Point = (x, y) => ({
  x,
  y,
  equals: (other) => {
  },
  inspect: () => \`Point(\${x}, \${y})\`
})
`,
      solution: `// Point :: (Number, Number) -> Setoid
const Point = (x, y) => ({
  x,
  y,
  equals: (other) => other.x === x && other.y === y,
  inspect: () => \`Point(\${x}, \${y})\`
})
`,
      broken: [
        // Identity comparison: no two separately built points are ever equal.
        `const Point = (x, y) => ({
  x, y,
  equals: (other) => other === Point(x, y),
  inspect: () => \`Point(\${x}, \${y})\`
})
`,
        // Only compares one coordinate.
        `const Point = (x, y) => ({
  x, y,
  equals: (other) => other.x === x,
  inspect: () => \`Point(\${x}, \${y})\`
})
`,
        // Not symmetric: an ordering pretending to be an equality.
        `const Point = (x, y) => ({
  x, y,
  equals: (other) => other.x >= x && other.y >= y,
  inspect: () => \`Point(\${x}, \${y})\`
})
`,
      ],
      checks: (T, exp) => {
        const Point = exp.Point as (x: number, y: number) => any;

        T.check('Two points with the same coordinates are equal', () => {
          const r = Point(1, 2).equals(Point(1, 2));
          return r === true || `Got ${T.fmt(r)}. Two separately built points with the same contents have to compare equal.`;
        });

        T.check('Different coordinates are not equal', () => {
          const r = Point(1, 2).equals(Point(1, 3));
          return r === false || `Got ${T.fmt(r)}. Both coordinates count.`;
        });

        T.check('equals answers with a boolean', () => {
          const r = Point(1, 2).equals(Point(1, 2));
          return typeof r === 'boolean' || `Got ${T.fmt(r)}`;
        });

        laws.setoid(T, { of: (n: number) => Point(n, n * 2), runs: 60 });
      },
    },

    {
      id: 'recognize',
      covers: ['three-laws'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'Which law does this break?',
      prompt: 'A team defines `equals: (other) => other.score >= this.score`. Which Setoid law fails first?',
      options: [
        {
          code: '// Symmetry: a.equals(b) must match b.equals(a)',
          correct: true,
          why: 'With scores 1 and 2, the first says yes and the second says no. Reflexivity and transitivity both survive.',
        },
        {
          code: '// Reflexivity: a.equals(a) must be true',
          correct: false,
          why: 'A score is always at least itself, so this one holds.',
        },
        {
          code: '// Transitivity',
          correct: false,
          why: 'It holds too, since the comparison chains. Symmetry is the one that goes.',
        },
        { code: '// None of them', correct: false, why: 'Symmetry fails as soon as the two scores differ.' },
      ],
    },
  ],
};
