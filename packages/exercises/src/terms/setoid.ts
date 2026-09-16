import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const setoid: ExerciseSet = {
  termId: 'setoid',
  // TODO: predates the rubric. Needs a competency rubric, notes that teach to it, and
  // rungs mapped onto it.
  rubricTodo: true,
  rungs: [
    {
      id: 'implement',
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
