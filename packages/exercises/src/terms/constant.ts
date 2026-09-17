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

    {
      id: 'prove-it',
      kind: 'code',
      role: 'break',
      covers: ['binding-not-value', 'freeze-is-shallow'],
      title: "Prove that const promises nothing about the value",
      prompt:
        "`const` stops the binding being reassigned and says nothing at all about what it points at. Demonstrate that: write `mutateThrough`, which changes a const-bound object without reassigning anything, and `reassign`, which reports what happens when you do try.",
      hints: [
        "`const config = {...}` then `config.retries = 9` is legal. The binding did not move; the object did.",
        "`reassign` should try the assignment inside a try/catch and report the error's name, because that is the thing `const` actually prevents.",
        "`shallowGap` is about `Object.freeze` stopping at one level. Write to something one level down.",
      ],
      exports: ['mutateThrough', 'reassign', 'shallowGap'],
      starter: `// mutateThrough :: () -> Object   change a const-bound object in place
const mutateThrough = () => {
  const config = { retries: 3 }
  return config
}

// reassign :: () -> String   the name of the error you get for reassigning
const reassign = () => 'none'

// shallowGap :: () -> Boolean   did the nested write get through a freeze?
const shallowGap = () => false
`,
      solution: `// mutateThrough :: () -> Object   change a const-bound object in place
const mutateThrough = () => {
  const config = { retries: 3 }
  config.retries = 9
  return config
}

// reassign :: () -> String   the name of the error you get for reassigning
const reassign = () => {
  const config = { retries: 3 }
  try {
    // eslint-disable-next-line no-const-assign
    eval('config = { retries: 9 }')
    return 'none'
  } catch (e) {
    return e.name
  }
}

// shallowGap :: () -> Boolean   did the nested write get through a freeze?
const shallowGap = () => {
  const config = Object.freeze({ limits: { retries: 3 } })
  config.limits.retries = 9
  return config.limits.retries === 9
}
`,
      broken: [
        `const mutateThrough = () => {
  const config = { retries: 3 }
  return config
}
const reassign = () => {
  const config = { retries: 3 }
  try {
    eval('config = { retries: 9 }')
    return 'none'
  } catch (e) {
    return e.name
  }
}
const shallowGap = () => {
  const config = Object.freeze({ limits: { retries: 3 } })
  config.limits.retries = 9
  return config.limits.retries === 9
}
`,
        `const mutateThrough = () => {
  const config = { retries: 3 }
  config.retries = 9
  return config
}
const reassign = () => 'none'
const shallowGap = () => {
  const config = Object.freeze({ limits: { retries: 3 } })
  config.limits.retries = 9
  return config.limits.retries === 9
}
`,
        `const mutateThrough = () => {
  const config = { retries: 3 }
  config.retries = 9
  return config
}
const reassign = () => {
  const config = { retries: 3 }
  try {
    eval('config = { retries: 9 }')
    return 'none'
  } catch (e) {
    return e.name
  }
}
const shallowGap = () => false
`,
      ],
      checks: (T, exp) => {
        const { mutateThrough, reassign, shallowGap } = exp;

        T.check('The const-bound object really did change', () => {
          const r = mutateThrough();
          return (
            r && r.retries === 9 ||
            `It came back as ${T.fmt(r)}. \`const\` did not stop this, and the rung wants to see that it did not.`
          );
        });

        T.check('Nothing was reassigned to get there', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const mutateThrough'), src.indexOf('const reassign'));
          return (
            !/^\s*config\s*=/m.test(body) ||
            'The binding itself was reassigned, which is the one thing const does prevent. Reach through it instead.'
          );
        });

        T.check('Reassigning the binding is what throws', () => {
          const r = reassign();
          return (
            r === 'TypeError' ||
            `Reassigning reported ${T.fmt(r)}, expected 'TypeError'. That is the entire promise: the name keeps pointing at the same thing.`
          );
        });

        T.check('The two halves disagree, which is the lesson', () => {
          const mutated = mutateThrough().retries === 9;
          const threw = reassign() !== 'none';
          return (
            (mutated && threw) ||
            `Writing through gave ${mutated ? 'a change' : 'no change'} and reassigning ${threw ? 'threw' : 'did not throw'}. One is allowed and one is not, and that gap is what const actually means.`
          );
        });

        T.check('A freeze does not reach the second level', () => {
          const r = shallowGap();
          return (
            r === true ||
            `shallowGap reported ${T.fmt(r)}. Object.freeze protects the object you hand it and nothing it points at, so the nested write goes through.`
          );
        });

        T.check('The freeze is actually applied', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const shallowGap'));
          return (
            /Object\.freeze\s*\(/.test(body) ||
            'Nothing was frozen, so the write going through proves nothing. Freeze the outer object, then write one level down.'
          );
        });
      },
    },

    {
      id: 'use-frozen',
      kind: 'code',
      role: 'apply',
      covers: ['deep-freeze', 'freeze-is-shallow'],
      title: "Freeze a whole config and use it inline",
      prompt:
        "A deep freeze has to reach arrays, nested objects, and structures that point back at themselves, and it has to return the thing so it can be used where it was written. Write it, then `config`, frozen inline.",
      hints: [
        "Freeze the object, then walk its values and freeze those too.",
        "A cycle will send a naive walk round forever. `Object.isFrozen` is the cheapest way to know you have been here.",
        "Return the object you were given, not a copy, or `const config = deepFreeze({...})` would not read right.",
      ],
      exports: ['deepFreeze', 'config'],
      starter: `// deepFreeze :: a -> a   returns the same object, frozen all the way down
const deepFreeze = (o) => o

// config :: Object   frozen inline
const config = {
  retries: 3,
  limits: { cpu: 2, tags: ['a', 'b'] }
}
`,
      solution: `// deepFreeze :: a -> a   returns the same object, frozen all the way down
const deepFreeze = (o) => {
  if (o === null || typeof o !== 'object' || Object.isFrozen(o)) return o
  Object.freeze(o)
  for (const key of Object.keys(o)) deepFreeze(o[key])
  return o
}

// config :: Object   frozen inline
const config = deepFreeze({
  retries: 3,
  limits: { cpu: 2, tags: ['a', 'b'] }
})
`,
      broken: [
        `const deepFreeze = (o) => {
  if (o === null || typeof o !== 'object') return o
  Object.freeze(o)
  for (const key of Object.keys(o)) deepFreeze(o[key])
  return o
}
const config = deepFreeze({ retries: 3, limits: { cpu: 2, tags: ['a', 'b'] } })
`,
        `const deepFreeze = (o) => Object.freeze(o)
const config = deepFreeze({ retries: 3, limits: { cpu: 2, tags: ['a', 'b'] } })
`,
        `const deepFreeze = (o) => {
  if (o === null || typeof o !== 'object' || Object.isFrozen(o)) return o
  const copy = Array.isArray(o) ? [...o] : { ...o }
  Object.freeze(copy)
  for (const key of Object.keys(copy)) deepFreeze(copy[key])
  return copy
}
const config = deepFreeze({ retries: 3, limits: { cpu: 2, tags: ['a', 'b'] } })
`,
      ],
      checks: (T, exp) => {
        const { deepFreeze, config } = exp;

        T.check('The top level is frozen', () => {
          return Object.isFrozen(config) || 'The config itself is writable.';
        });

        T.check('One level down is frozen', () => {
          return Object.isFrozen(config.limits) || 'config.limits is still writable. Object.freeze stops at the object you hand it.';
        });

        T.check('An array inside is frozen too', () => {
          return Object.isFrozen(config.limits.tags) || 'The tags array is still writable, so anything holding the config can push to it.';
        });

        T.check('A nested write actually throws', () => {
          let threw = false;
          try {
            'use strict';
            (config.limits as { cpu: number }).cpu = 99;
          } catch {
            threw = true;
          }
          return (
            (threw || config.limits.cpu === 2) ||
            `config.limits.cpu is now ${T.fmt(config.limits.cpu)}. The write went through.`
          );
        });

        T.check('It hands back the same object, not a copy', () => {
          const o = { a: { b: 1 } };
          return deepFreeze(o) === o || 'It returned a copy. Returning the same object is what lets it be used inline where the value is written.';
        });

        T.check('config was frozen inline', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const config'));
          return (
            /deepFreeze\s*\(/.test(body) ||
            'config was not passed through deepFreeze. Being usable at the point of definition is the reason it returns its argument.'
          );
        });

        T.check('A structure that points at itself does not hang it', () => {
          const a: Record<string, unknown> = { name: 'a' };
          const b: Record<string, unknown> = { name: 'b', a };
          a.b = b;
          let ok = false;
          try {
            deepFreeze(a);
            ok = true;
          } catch {
            ok = false;
          }
          if (!ok) return 'It threw on a structure that points back at itself.';
          return (Object.isFrozen(a) && Object.isFrozen(b)) || 'It survived the cycle but did not freeze both sides.';
        });

        T.check('Primitives and null pass straight through', () => {
          const got = [deepFreeze(1), deepFreeze('x'), deepFreeze(null), deepFreeze(undefined)];
          return T.eq(got, [1, 'x', null, undefined]) || `It gave ${T.fmt(got)}.`;
        });

        T.check('Three levels down is frozen', () => {
          const o = deepFreeze({ a: { b: { c: [1, 2] } } });
          return Object.isFrozen(o.a.b.c) || 'The walk stopped before reaching the third level.';
        });
      },
    },
  ],
};
