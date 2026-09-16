import type { ExerciseSet } from '@fpx/engine/types';

export const constant: ExerciseSet = {
  termId: 'constant',
  rubric: [
    {
      id: 'binding-not-value',
      statement:
        "Knows `const` stops the binding being reassigned and says nothing about the value it points at.",
    },
    {
      id: 'freeze-is-shallow',
      statement:
        "Knows `Object.freeze` protects one level only, and can say what is still writable underneath.",
    },
    {
      id: 'deep-freeze',
      statement:
        "Can freeze a whole structure, including arrays and cycles, and return it for use inline.",
    },
  ],
  notes: `\`const\` is about the **binding**, not the value. It stops you pointing the name somewhere
else; it says nothing about what you point at.

\`\`\`js
const xs = [1, 2]
xs.push(3)      // fine. xs still points at the same array.
xs = [3]        // TypeError: Assignment to constant variable.
\`\`\`

\`Object.freeze\` protects the value, but only one level down:

\`\`\`js
const config = Object.freeze({ db: { host: 'localhost' } })
config.db = {}            // ignored, or throws in strict mode
config.db.host = 'evil'   // allowed. freeze did not reach here.
config.db.host            // 'evil'
\`\`\`

Worse, outside strict mode the failed write is **silent**, which is a good reason to be in
strict mode:

\`\`\`js
const o = Object.freeze({ a: 1 })
o.a = 2      // sloppy mode: does nothing at all, no error
o.a          // 1
\`\`\`

Going all the way down means recursing, and skipping anything already frozen, which also stops
a self-referencing object sending you round forever:

\`\`\`js
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const key of Object.keys(o)) deepFreeze(o[key])
  }
  return o                    // return it, so it can be used inline
}

const a = { name: 'a' }
a.self = a
deepFreeze(a)                 // terminates, because a is frozen before the recursion
\`\`\``,
  rungs: [
    {
      id: 'recognize',
      covers: ['binding-not-value', 'freeze-is-shallow'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'What does const actually promise?',
      prompt:
        '`const` stops the binding being reassigned. It says nothing about the value. Select every statement that is true.',
      options: [
        {
          code: 'const xs = [1, 2]\nxs.push(3)   // allowed',
          correct: true,
          why: 'The binding still points at the same array. Its contents were never protected.',
        },
        {
          code: 'const xs = [1, 2]\nxs = [3]     // throws',
          correct: true,
          why: 'Reassigning the binding is exactly what const prevents.',
        },
        {
          code: 'Object.freeze({ a: { b: 1 } })\n// makes the whole tree immutable',
          correct: false,
          why: 'freeze is shallow. The nested object is still writable.',
        },
        {
          code: 'A frozen object silently ignores writes outside strict mode',
          correct: true,
          why: 'In sloppy mode the assignment just does nothing, which is why strict mode is worth having.',
        },
      ],
    },

    {
      id: 'implement',
      covers: ['deep-freeze', 'freeze-is-shallow'],
      kind: 'code',
      role: 'implement',
      title: 'Freeze all the way down',
      prompt:
        '`Object.freeze` only protects the top level. Write `deepFreeze`, which walks the whole structure.',
      hints: [
        'Freeze the object, then recurse into each of its values.',
        'Only objects and arrays can be frozen. A number or a string needs nothing done to it.',
      ],
      exports: ['deepFreeze'],
      starter: `// deepFreeze :: a -> a
const deepFreeze = (o) => {
  // freeze o and everything inside it
}
`,
      solution: `// deepFreeze :: a -> a
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const key of Object.keys(o)) deepFreeze(o[key])
  }
  return o
}
`,
      broken: [
        // Shallow: the nested object is still writable.
        `const deepFreeze = (o) => Object.freeze(o)
`,
        // Freezes the children but not the object itself.
        `const deepFreeze = (o) => {
  if (o && typeof o === 'object') {
    for (const key of Object.keys(o)) Object.freeze(o[key])
  }
  return o
}
`,
        // Forgets to hand the value back.
        `const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const key of Object.keys(o)) deepFreeze(o[key])
  }
}
`,
      ],
      checks: (T, exp) => {
        const deepFreeze = exp.deepFreeze as <A>(o: A) => A;

        T.check('It gives the value back', () => {
          const o = { a: 1 };
          return deepFreeze(o) === o || 'deepFreeze should return the same object, so it can be used inline.';
        });

        T.check('The top level is frozen', () => {
          const o = deepFreeze({ a: 1 });
          return Object.isFrozen(o) || 'The object itself is still writable.';
        });

        T.check('A nested object is frozen too', () => {
          const o = deepFreeze({ a: { b: 1 } });
          return (
            Object.isFrozen((o as any).a) ||
            'The nested object is still writable. Object.freeze is shallow, which is the whole reason this function exists.'
          );
        });

        T.check('It reaches the bottom of a deep structure', () => {
          const o = deepFreeze({ a: { b: { c: { d: 1 } } } });
          return Object.isFrozen((o as any).a.b.c) || 'A structure three levels down was left writable.';
        });

        T.check('Arrays and the objects inside them are frozen', () => {
          const o = deepFreeze({ items: [{ sku: 'a' }] });
          const items = (o as any).items;
          if (!Object.isFrozen(items)) return 'The array is still writable.';
          return Object.isFrozen(items[0]) || 'The array is frozen but the objects in it are not.';
        });

        T.check('A write to a frozen value throws in strict mode', () => {
          const o = deepFreeze({ a: { b: 1 } }) as any;
          try {
            o.a.b = 2;
            return 'Writing to the nested value was allowed.';
          } catch {
            return true;
          }
        });

        T.check('Plain values pass through untouched', () => {
          return (
            deepFreeze(42) === 42 && deepFreeze(null) === null && deepFreeze('x') === 'x' ||
            'A number, null, or string should come straight back.'
          );
        });

        T.check('A cycle does not send it round forever', () => {
          const a: any = { name: 'a' };
          a.self = a;
          try {
            deepFreeze(a);
            return Object.isFrozen(a) || 'The object was not frozen.';
          } catch (e) {
            if (e instanceof RangeError) {
              return 'A self-referencing object sent it round forever. Skipping anything already frozen is enough to stop that.';
            }
            throw e;
          }
        });
      },
    },
  ],
};
