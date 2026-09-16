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
    {
      id: 'typed-signature',
      statement:
        "Can read `equals` and see that both arguments name the same type variable, so comparing two different types is a compile error rather than a silent `false`.",
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
  typedNotes: `Same track, second lap. The signature is one line, and every part of it is load-bearing.

\`\`\`ts
interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}
\`\`\`

Both arguments are \`A\`. The same \`A\`, not two variables. That is the first thing the types buy
you, and it is something \`===\` will never do:

\`\`\`ts
'3' === 3            // false, and the compiler let you ask

const num: Setoid<number> = { equals: (a, b) => a === b }
num.equals(3, '3')   // error, string is not a number
\`\`\`

A comparison that can only ever be false is a bug, and with a Setoid it does not compile. You
find out while typing instead of while debugging.

The return type is \`boolean\`, singular. Not \`-1 | 0 | 1\`, not a number, not the object. Equality
answers one question and does not rank anything.

\`\`\`ts
interface Point { x: number, y: number }

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a.x === b.x && a.y === b.y
}

pointSetoid.equals({ x: 1, y: 2 }, { x: 1, y: 2 })   // true
{ x: 1, y: 2 } === { x: 1, y: 2 }                     // false, different objects
\`\`\`

That is the whole reason the concept exists. The built-in compares identity, the Setoid
compares contents, and \`A\` being a variable means each type gets to say what its own contents
are.

What the types cannot do is check the three laws. Reflexivity, symmetry and transitivity are
statements about every possible pair of values, and TypeScript has no way to say that. This
typechecks:

\`\`\`ts
const broken: Setoid<number> = { equals: (a, b) => a < b }
\`\`\`

It is a perfectly good function of the right type and a terrible equality. The compiler stops
you comparing a string to a number; it will not stop you calling \`<\` equality. That half is
still yours, which is why the laws get their own rung.`,
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

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['by-contents', 'boolean', 'typed-signature'],
      title: "Satisfy Setoid<Point>",
      prompt:
        "The interface is given. Write `pointSetoid` so two points count as equal when their contents match.",
      hints: [
        "Both arguments are `Point`, so both have an `x` and a `y` you can reach for.",
        "`===` on the objects themselves compares identity, which is the thing you are replacing.",
        "The return type is `boolean`. Return the comparison, not the values.",
      ],
      exports: ['pointSetoid'],
      starter: `interface Point { x: number; y: number }

interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a === b
}
`,
      solution: `interface Point { x: number; y: number }

interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a.x === b.x && a.y === b.y
}
`,
      broken: [
        `interface Point { x: number; y: number }

interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a === b
}
`,
        `interface Point { x: number; y: number }

interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a.x === b.x
}
`,
        `interface Point { x: number; y: number }

interface Setoid<A> {
  equals: (a: A, b: A) => boolean
}

const pointSetoid: Setoid<Point> = {
  equals: (a, b) => a.x < b.x
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
        T.check('The Setoid declaration is still there to satisfy', () => {
          return /interface\s+Setoid/.test(T.src) || 'The Setoid declaration has gone. It is the thing being satisfied.';
        });
        const s = exp.pointSetoid;

        T.check('Two separate points with the same contents are equal', () => {
          const r = s.equals({ x: 1, y: 2 }, { x: 1, y: 2 });
          return r === true || `Two distinct objects holding the same x and y gave ${T.fmt(r)}. Identity is what you are replacing.`;
        });

        T.check('Different contents are not equal', () => {
          const r = s.equals({ x: 1, y: 2 }, { x: 1, y: 3 });
          return r === false || `Points differing only in y gave ${T.fmt(r)}. Both fields count.`;
        });

        T.check('The x field counts too', () => {
          const r = s.equals({ x: 1, y: 2 }, { x: 9, y: 2 });
          return r === false || `Points differing only in x gave ${T.fmt(r)}.`;
        });

        T.check('The answer is a boolean, not something truthy', () => {
          const r = s.equals({ x: 1, y: 2 }, { x: 1, y: 2 });
          return typeof r === 'boolean' || `equals gave ${T.fmt(r)}, a ${typeof r}. The return type is boolean.`;
        });

        T.law('Reflexive: every point equals itself', 60, (G) => {
          const p = { x: G.int(), y: G.int() };
          return s.equals(p, p) === true || `${T.fmt(p)} did not equal itself.`;
        });

        T.law('Symmetric: order does not change the answer', 60, (G) => {
          const a = { x: G.oneOf([0, 1]), y: G.oneOf([0, 1]) };
          const b = { x: G.oneOf([0, 1]), y: G.oneOf([0, 1]) };
          return (
            s.equals(a, b) === s.equals(b, a) ||
            `${T.fmt(a)} against ${T.fmt(b)} gave ${T.fmt(s.equals(a, b))} one way and ${T.fmt(s.equals(b, a))} the other.`
          );
        });

        T.law('Transitive: equality carries across', 60, (G) => {
          const a = { x: G.oneOf([0, 1]), y: G.oneOf([0, 1]) };
          const b = { x: G.oneOf([0, 1]), y: G.oneOf([0, 1]) };
          const c = { x: G.oneOf([0, 1]), y: G.oneOf([0, 1]) };
          if (!(s.equals(a, b) && s.equals(b, c))) return true;
          return s.equals(a, c) === true || `${T.fmt(a)} equals ${T.fmt(b)} equals ${T.fmt(c)}, but the first and last did not.`;
        });
      },
    },
  ],
};
