import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const lens: ExerciseSet = {
  termId: 'lens',
  rubric: [
    {
      id: 'getter-and-setter',
      statement:
        "Knows a lens is a getter and setter travelling together, and that the setter must build a new structure.",
    },
    {
      id: 'view-set-over',
      statement:
        "Can write view, set and over, and knows over is set composed with view.",
    },
    {
      id: 'compose',
      statement:
        "Can compose two lenses to reach a nested field, updating it without disturbing anything around it.",
    },
  ],
  notes: `A lens is a getter and a setter travelling together, so the pair can be passed around and
composed as one value.

\`\`\`js
const lens = (getter, setter) => ({ getter, setter })

const view = (l, s) => l.getter(s)
const set  = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)   // read, apply, write back

const lensProp = (key) =>
  lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))
\`\`\`

The setter has to **build**, not edit, or the caller's record changes underneath them:

\`\`\`js
(value, s) => { s[key] = value; return s }    // mutates what you were given
(value, s) => ({ ...s, [key]: value })        // a new record, siblings intact
\`\`\`

Composing is where they earn their keep. A composed lens views through both and sets by setting
the inner one inside the outer one:

\`\`\`js
const composeLens = (outer, inner) =>
  lens(
    (s) => view(inner, view(outer, s)),
    (value, s) => set(outer, set(inner, value, view(outer, s)), s)
  )

const cityLens = composeLens(lensProp('address'), lensProp('city'))

const user = { name: 'ada', address: { city: 'London', postcode: 'N1' }, tags: ['a'] }
set(cityLens, 'Paris', user)
// { name: 'ada', address: { city: 'Paris', postcode: 'N1' }, tags: ['a'] }
\`\`\`

Note what survived: \`postcode\` beside the field you changed, and \`name\` and \`tags\` around
it. Replacing the whole nested object instead is the usual bug:

\`\`\`js
(value, s) => set(outer, value, s)    // address becomes the string 'Paris'
\`\`\`

The three laws are worth knowing because they are what make a lens trustworthy: setting what
you just got changes nothing, getting what you just set gives it back, and the last set wins.`,
  rungs: [
    {
      id: 'implement',
      covers: ['getter-and-setter', 'view-set-over'],
      kind: 'code',
      role: 'implement',
      title: 'lens, view, set, over',
      prompt:
        'A lens is a getter and a setter travelling together. Build one, and the three functions that use it.',
      hints: [
        '`lens(getter, setter)` just holds the pair.',
        '`over` is `set` composed with `view`: read it, apply the function, write it back.',
        'The setter must build a new object rather than writing into the old one.',
      ],
      exports: ['lens', 'view', 'set', 'over', 'lensProp'],
      starter: `// lens :: ((s -> a), (a -> s -> s)) -> Lens s a
const lens = (getter, setter) => {
}

// view :: (Lens s a, s) -> a
const view = (l, s) => {
}

// set :: (Lens s a, a, s) -> s
const set = (l, value, s) => {
}

// over :: (Lens s a, (a -> a), s) -> s
const over = (l, f, s) => {
}

// lensProp :: String -> Lens s a
const lensProp = (key) => {
}
`,
      solution: `// lens :: ((s -> a), (a -> s -> s)) -> Lens s a
const lens = (getter, setter) => ({ getter, setter })

// view :: (Lens s a, s) -> a
const view = (l, s) => l.getter(s)

// set :: (Lens s a, a, s) -> s
const set = (l, value, s) => l.setter(value, s)

// over :: (Lens s a, (a -> a), s) -> s
const over = (l, f, s) => set(l, f(view(l, s)), s)

// lensProp :: String -> Lens s a
const lensProp = (key) =>
  lens(
    (s) => s[key],
    (value, s) => ({ ...s, [key]: value })
  )
`,
      broken: [
        // The setter mutates instead of copying.
        `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const lensProp = (key) =>
  lens(
    (s) => s[key],
    (value, s) => {
      s[key] = value
      return s
    }
  )
`,
        // over writes the function itself rather than its result.
        `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f, s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))
`,
        // set drops the rest of the record.
        `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ [key]: value }))
`,
      ],
      checks: (T, exp) => {
        const view = exp.view as (l: any, s: any) => any;
        const set = exp.set as (l: any, v: any, s: any) => any;
        const over = exp.over as (l: any, f: (a: any) => any, s: any) => any;
        const lensProp = exp.lensProp as (k: string) => any;

        const name = lensProp('name');
        const user = () => ({ name: 'ada', age: 36 });

        T.check('view reads the focus', () => {
          const r = view(name, user());
          return r === 'ada' || `Got ${T.fmt(r)}`;
        });

        T.check('set replaces the focus', () => {
          const r = set(name, 'grace', user());
          return r.name === 'grace' || `Got ${T.fmt(r)}`;
        });

        T.check('set keeps the rest of the record', () => {
          const r = set(name, 'grace', user());
          return r.age === 36 || `Got ${T.fmt(r)}. A lens focuses on one field and leaves the others where they were.`;
        });

        T.check('set builds a new record rather than writing into the old one', () => {
          const original = T.freeze(user());
          const r = set(name, 'grace', original);
          if (r === original) return 'You returned the same object you were given.';
          return T.eq(original, { name: 'ada', age: 36 }) || 'The original record changed.';
        });

        T.check('over applies a function to the focus', () => {
          const r = over(name, (s: string) => s.toUpperCase(), user());
          return (
            r.name === 'ADA' ||
            `Got ${T.fmt(r)}. over reads the focus, applies the function, and writes the result back.`
          );
        });

        T.check('over leaves the rest alone too', () => {
          const r = over(name, (s: string) => s.toUpperCase(), user());
          return r.age === 36 || `Got ${T.fmt(r)}`;
        });

        laws.lens(T, {
          view: (s) => view(name, s),
          set: (v, s) => set(name, v, s),
          sample: (G) => ({ name: G.str(), age: G.nat() }),
          value: (G) => G.str(),
          runs: 50,
        });
      },
    },

    {
      id: 'apply',
      covers: ['compose', 'getter-and-setter'],
      kind: 'code',
      role: 'apply',
      title: 'Update something nested',
      prompt:
        'Compose two lenses into one that reaches `user.address.city`, then use it to update a deeply nested record without touching anything else.',
      hints: [
        'A composed lens views through both, and sets by setting the inner one inside the outer one.',
        '`set(outer, set(inner, value, view(outer, s)), s)` is the shape.',
      ],
      exports: ['composeLens', 'cityLens', 'renameCity'],
      starter: `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))

// composeLens :: (Lens s a, Lens a b) -> Lens s b
const composeLens = (outer, inner) => {
}

// cityLens :: Lens User String
const cityLens = null

// renameCity :: (String, User) -> User
const renameCity = (city, user) => {
}
`,
      solution: `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))

// composeLens :: (Lens s a, Lens a b) -> Lens s b
const composeLens = (outer, inner) =>
  lens(
    (s) => view(inner, view(outer, s)),
    (value, s) => set(outer, set(inner, value, view(outer, s)), s)
  )

// cityLens :: Lens User String
const cityLens = composeLens(lensProp('address'), lensProp('city'))

// renameCity :: (String, User) -> User
const renameCity = (city, user) => set(cityLens, city, user)
`,
      broken: [
        // Composed the wrong way round.
        `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))
const composeLens = (outer, inner) =>
  lens((s) => view(inner, view(outer, s)), (value, s) => set(outer, set(inner, value, view(outer, s)), s))
const cityLens = composeLens(lensProp('city'), lensProp('address'))
const renameCity = (city, user) => set(cityLens, city, user)
`,
        // The setter replaces the whole nested object instead of one field in it.
        `const lens = (getter, setter) => ({ getter, setter })
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const lensProp = (key) => lens((s) => s[key], (value, s) => ({ ...s, [key]: value }))
const composeLens = (outer, inner) =>
  lens((s) => view(inner, view(outer, s)), (value, s) => set(outer, value, s))
const cityLens = composeLens(lensProp('address'), lensProp('city'))
const renameCity = (city, user) => set(cityLens, city, user)
`,
      ],
      checks: (T, exp) => {
        const renameCity = exp.renameCity as (c: string, u: any) => any;
        const user = () => ({
          name: 'ada',
          address: { city: 'London', postcode: 'N1' },
          tags: ['a'],
        });

        T.check('The nested field is updated', () => {
          const r = renameCity('Paris', user());
          return r.address?.city === 'Paris' || `Got ${T.fmt(r)}`;
        });

        T.check('The sibling field inside address survives', () => {
          const r = renameCity('Paris', user());
          return (
            r.address?.postcode === 'N1' ||
            `Got ${T.fmt(r.address)}. Setting one field of the nested object should not replace the whole object.`
          );
        });

        T.check('The fields around address survive', () => {
          const r = renameCity('Paris', user());
          return (r.name === 'ada' && T.eq(r.tags, ['a'])) || `Got ${T.fmt(r)}`;
        });

        T.check('The original record is untouched', () => {
          const original = T.freeze(user());
          renameCity('Paris', original);
          return T.eq(original.address, { city: 'London', postcode: 'N1' }) || 'The original record changed.';
        });

        T.check('Setting the same city twice is the same as setting it once', () => {
          const once = renameCity('Paris', user());
          const twice = renameCity('Paris', renameCity('Paris', user()));
          return T.eq(once, twice) || `Once gave ${T.fmt(once)}, twice gave ${T.fmt(twice)}.`;
        });
      },
    },
  ],
};
