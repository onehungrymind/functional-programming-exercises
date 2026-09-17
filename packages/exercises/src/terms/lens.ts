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
    {
      id: 'typed-signature',
      statement:
        "Can read a lens's type and see that the setter has to return a whole new structure, not a fragment of one.",
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
  typedNotes: `Same track, second lap. The pair you built is easier to get right once the types are written
down, because the setter's return type is the thing people get wrong.

\`\`\`ts
interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}
\`\`\`

Two type variables, and they are doing all the work. \`S\` is the whole structure, \`A\` is the
part in focus. Read the setter: it takes an \`A\` and an \`S\` and gives back an **\`S\`**, not an
\`A\` and not a fragment. That single letter is the whole "rebuild the record, do not return the
field" rule.

\`\`\`ts
const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const set = <S, A>(l: Lens<S, A>, value: A, s: S): S => l.setter(value, s)
const over = <S, A>(l: Lens<S, A>, f: (a: A) => A, s: S): S => set(l, f(view(l, s)), s)
\`\`\`

\`over\` is worth reading as a type: \`(a: A) => A\`, in and out the same, which is why it can
write the result back where it came from.

Composition shows up in the types too. Given a \`Lens<S, A>\` and a \`Lens<A, B>\`, the only thing
you could produce is a \`Lens<S, B>\`, and the middle \`A\` cancels exactly the way it does in
function composition.

\`\`\`ts
const composeLens = <S, A, B>(outer: Lens<S, A>, inner: Lens<A, B>): Lens<S, B> => ({
  getter: (s) => inner.getter(outer.getter(s)),
  setter: (value, s) => outer.setter(inner.setter(value, outer.getter(s)), s)
})
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['getter-and-setter', 'view-set-over'],
      kind: 'code',
      role: 'implement',
      title: 'lens, view, set, over',
      prompt:
        "A lens is a getter and a setter travelling together. Write `lens`, which just holds the pair, then the three functions that use one: `view` reads the focus, `set` replaces it, and `over` applies a function to it. Finally `lensProp`, which builds a lens for a property by name.",
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
        "Compose two lenses into one that reaches `user.address.city`, then use it to update a deeply nested record without touching anything else. Write `composeLens`, use it to build `cityLens`, and then `renameCity`.",
      hints: [
        'A composed lens views through both, and sets by setting the inner one inside the outer one.',
        'Work outside in. Read the outer part, set the inner one inside what you read, then write that whole thing back through the outer lens.',
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

    {
      id: 'deep-compose',
      kind: 'code',
      role: 'apply',
      covers: ['compose', 'view-set-over'],
      title: "Compose three lenses to reach three levels down",
      prompt:
        "Composing lenses is what makes them worth having: the composition is another lens, so it goes anywhere a lens goes. Write `composeLens`, then reach a field three levels down and change it without disturbing anything around it.",
      hints: [
        "The composed getter reads through the outer, then the inner.",
        "The composed setter writes the inner into what the outer read, and then writes that back through the outer.",
        "`deep` is `composeLens` applied twice. Do not write a three-level getter by hand.",
      ],
      exports: ['composeLens', 'deep'],
      starter: `const lensProp = (key) => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})

const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)

// composeLens :: (Lens s a, Lens a b) -> Lens s b
const composeLens = (outer, inner) => outer

// deep :: Lens   company -> address -> city
const deep = lensProp('company')
`,
      solution: `const lensProp = (key) => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})

const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)

// composeLens :: (Lens s a, Lens a b) -> Lens s b
const composeLens = (outer, inner) => ({
  getter: (s) => inner.getter(outer.getter(s)),
  setter: (value, s) => outer.setter(inner.setter(value, outer.getter(s)), s)
})

// deep :: Lens   company -> address -> city
const deep = composeLens(composeLens(lensProp('company'), lensProp('address')), lensProp('city'))
`,
      broken: [
        `const lensProp = (key) => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const composeLens = (outer, inner) => ({
  getter: (s) => inner.getter(outer.getter(s)),
  setter: (value, s) => inner.setter(value, outer.getter(s))
})
const deep = composeLens(composeLens(lensProp('company'), lensProp('address')), lensProp('city'))
`,
        `const lensProp = (key) => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const composeLens = (outer, inner) => ({
  getter: (s) => outer.getter(inner.getter(s)),
  setter: (value, s) => outer.setter(inner.setter(value, outer.getter(s)), s)
})
const deep = composeLens(composeLens(lensProp('company'), lensProp('address')), lensProp('city'))
`,
        `const lensProp = (key) => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})
const view = (l, s) => l.getter(s)
const set = (l, value, s) => l.setter(value, s)
const over = (l, f, s) => set(l, f(view(l, s)), s)
const composeLens = (outer, inner) => ({
  getter: (s) => inner.getter(outer.getter(s)),
  setter: (value, s) => outer.setter(inner.setter(value, outer.getter(s)), s)
})
const deep = { getter: (s) => s.company.address.city, setter: (v, s) => ({ ...s, company: { ...s.company, address: { ...s.company.address, city: v } } }) }
`,
      ],
      checks: (T, exp) => {
        const { composeLens, deep } = exp;
        const ada = () => ({
          name: 'ada',
          company: { name: 'acme', address: { city: 'london', zip: 'E1' }, size: 10 },
        });

        T.check('The composition reads three levels down', () => {
          const r = deep.getter(ada());
          return r === 'london' || `Reading through gave ${T.fmt(r)}.`;
        });

        T.check('It writes three levels down', () => {
          const r = deep.setter('paris', ada());
          return r.company.address.city === 'paris' || `Writing gave ${T.fmt(r.company.address.city)}.`;
        });

        T.check('Everything beside it survives', () => {
          const r = deep.setter('paris', ada());
          return (
            (r.name === 'ada' && r.company.name === 'acme' && r.company.size === 10 && r.company.address.zip === 'E1') ||
            `The result lost something: ${T.fmt(r)}. Each level has to be rebuilt around the change, not replaced by it.`
          );
        });

        T.check('The original is untouched', () => {
          const a = ada();
          deep.setter('paris', a);
          return a.company.address.city === 'london' || `The original now reads ${T.fmt(a.company.address.city)}.`;
        });

        T.check('A new object comes back at every level', () => {
          const a = ada();
          const r = deep.setter('paris', a);
          return (
            r !== a && r.company !== a.company && r.company.address !== a.company.address ||
            'Some level is shared with the original, so writing to the result would write to both.'
          );
        });

        T.check('The composition is itself a lens', () => {
          const two = composeLens({ getter: (s: { a: { b: number } }) => s.a, setter: (v: { b: number }, s: { a: { b: number } }) => ({ ...s, a: v }) }, { getter: (s: { b: number }) => s.b, setter: (v: number, s: { b: number }) => ({ ...s, b: v }) });
          return (
            typeof two.getter === 'function' && typeof two.setter === 'function' ||
            `composeLens gave ${T.fmt(two)}, which is not a lens, so it could not be composed again.`
          );
        });

        T.check('deep was built by composing, not written out', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const body = src.slice(src.indexOf('const deep'));
          return (
            /composeLens\s*\(/.test(body) ||
            'deep was written as a hand-rolled getter and setter. It works and it demonstrates nothing, because the point is that composing two lenses gives you a third for free.'
          );
        });

        T.law('Setting then getting gives back what you set', 60, (G) => {
          const v = G.str();
          const r = deep.getter(deep.setter(v, ada()));
          return r === v || `Set ${T.fmt(v)} and read back ${T.fmt(r)}.`;
        });

        T.law('Setting what is already there changes nothing', 60, (G) => {
          const a = ada();
          const r = deep.setter(deep.getter(a), a);
          return T.eq(r, a) || `It came back as ${T.fmt(r)}.`;
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['typed-signature', 'getter-and-setter'],
      title: "A lens with its types written down",
      prompt:
        "Build `lensProp` against this interface. The setter's return type is the part to read carefully.",
      hints: [
        "`Lens<S, A>` means: the whole is `S`, the part is `A`. The setter gives back an `S`.",
        "`K extends keyof S` is how you say \"a key this object actually has\", and `S[K]` is the type of what lives there.",
      ],
      exports: ['lensProp', 'view', 'set'],
      starter: `interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}

const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => {
    // the return type says S. Not S[K], not a fragment.
  }
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const set = <S, A>(l: Lens<S, A>, value: A, s: S): S => l.setter(value, s)
`,
      solution: `interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}

const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const set = <S, A>(l: Lens<S, A>, value: A, s: S): S => l.setter(value, s)
`,
      broken: [
        `interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}

const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ [key]: value } as unknown as S)
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const set = <S, A>(l: Lens<S, A>, value: A, s: S): S => l.setter(value, s)
`,
        `interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}

const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => {
    s[key] = value
    return s
  }
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const set = <S, A>(l: Lens<S, A>, value: A, s: S): S => l.setter(value, s)
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

        const lensProp = exp.lensProp as (k: string) => any;
        const view = exp.view as (l: any, s: any) => any;
        const set = exp.set as (l: any, v: any, s: any) => any;
        const name = lensProp('name');
        const user = () => ({ name: 'ada', age: 36 });

        T.check('view reads the focus', () => {
          const r = view(name, user());
          return r === 'ada' || `Got ${T.fmt(r)}`;
        });

        T.check('set gives back the whole structure, not the part', () => {
          const r = set(name, 'grace', user());
          if (typeof r !== 'object' || r === null) return `Got ${T.fmt(r)}. The setter returns an S.`;
          return (
            'age' in r ||
            `Got ${T.fmt(r)}. The signature says the setter returns an S, and an S has every field, not just the one you set.`
          );
        });

        T.check('set replaces the focus', () => {
          const r = set(name, 'grace', user());
          return r.name === 'grace' || `Got ${T.fmt(r)}`;
        });

        T.check('set builds rather than writes into what it was given', () => {
          const original = T.freeze(user());
          const r = set(name, 'grace', original);
          if (r === original) return 'You returned the same object. The setter builds a new S.';
          return T.eq(original, { name: 'ada', age: 36 }) || 'The original record changed.';
        });

        T.check('The interface is still there to implement against', () => {
          return /interface\s+Lens/.test(T.src) || 'The Lens interface has gone. It is the thing you are satisfying.';
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'view-set-over'],
      title: "Read over's return type",
      prompt:
        "`view` returns `A` and `over` returns `S`. One of those lets you keep reaching for a field afterwards and the other does not. Type the expression's value.",
      hints: [
        "`over` is typed `(l, f, s) => S`, so what comes back is the whole record.",
        "That means `.city` is still there to read off the result.",
        "`f` is `(a: A) => A`, so the name goes in as a string and comes back as one.",
      ],
      context: `interface Lens<S, A> {
  getter: (s: S) => A
  setter: (value: A, s: S) => S
}

const lensProp = <S, K extends keyof S>(key: K): Lens<S, S[K]> => ({
  getter: (s) => s[key],
  setter: (value, s) => ({ ...s, [key]: value })
})

const view = <S, A>(l: Lens<S, A>, s: S): A => l.getter(s)
const over = <S, A>(l: Lens<S, A>, f: (a: A) => A, s: S): S => l.setter(f(l.getter(s)), s)

const ada = { name: 'ada', city: 'london' }
`,
      placeholder: "'...'",
      expect: "LONDON",
      solution: "over(lensProp('name'), (s) => s.toUpperCase(), ada).city.toUpperCase()",
      broken: [
        "'ADA'",
        "'london'",
        "over(lensProp('city'), (s) => s.toUpperCase(), ada).name.toUpperCase()",
      ],
    },
  ],
};
