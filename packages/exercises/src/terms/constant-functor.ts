import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const constantFunctor: ExerciseSet = {
  termId: 'constant-functor',
  rubric: [
    {
      id: 'map-does-nothing',
      statement:
        "Can write a map that discards its function and keeps the carried value, still returning a mappable container.",
    },
    {
      id: 'lawful',
      statement:
        "Knows both functor laws hold precisely because nothing happens, and can say why.",
    },
    {
      id: 'what-it-is-for',
      statement:
        "Can say what Const buys you: accumulating a value while a generic traversal runs, which is how a lens getter is built.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can point at the type variable that has no value behind it, and say why that makes `map` doing nothing the only possible implementation.",
    },
  ],
  notes: `\`Const\` is a functor whose \`map\` throws the function away and keeps what it is carrying.

\`\`\`js
const Const = (value) => ({
  value,
  map: (f) => Const(value)      // f is never called
})

Const(5).map((n) => n * 100)    // Const(5)
Const('kept').map(() => 'replaced').map(() => 'again')   // Const('kept')
\`\`\`

Both functor laws hold, and they hold **because** nothing happens:

\`\`\`js
Const(5).map((x) => x)              // Const(5). Identity, trivially.
Const(5).map(f).map(g)              // Const(5)
Const(5).map((x) => g(f(x)))        // Const(5). Composition, trivially.
\`\`\`

That makes it sound useless, and its use is genuinely non-obvious: it is how you get a **getter
out of a setter**.

A van Laarhoven lens is one function parameterized by a functor. Run it with a functor that
applies its function and you get a setter. Run the very same code with \`Const\` and the
mapping does nothing while the payload travels back out:

\`\`\`js
// one definition
const nameLens = (F) => (f) => (s) => f(s.name).map((name) => ({ ...s, name }))

// with Identity: a setter
nameLens(Identity)((n) => Identity(n.toUpperCase()))({ name: 'ada', age: 36 })
// Identity({ name: 'ADA', age: 36 })

// with Const: a getter, because the rebuild is discarded
nameLens(Const)((n) => Const(n))({ name: 'ada', age: 36 })
// Const('ada')
\`\`\`

One traversal, two behaviours, decided entirely by which functor you hand it. That is the whole
trick behind optics libraries.`,
  typedNotes: `Same track, second lap. In JavaScript "map does nothing" looks like a decision somebody made.
In the types it stops being a decision.

\`\`\`ts
interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}
\`\`\`

Two type variables. Now go looking for a \`B\` in that structure. There is one field, \`value\`,
and it is an \`A\`. \`B\` appears in the type parameters and in \`f\`'s argument, and nowhere else.

So consider writing \`map\`. You are handed \`f: (b: B) => C\` and you owe a \`Const<A, C>\`. To
build one you need an \`A\`, which you have. To call \`f\` you would need a \`B\`, which does not
exist anywhere in scope and never did. There is no cheat available either: \`B\` is a variable,
so you cannot make one up.

\`\`\`ts
const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => constant(value)    // f is unused, and cannot be otherwise
})
\`\`\`

\`B\` is a phantom type: it exists in the signature to be tracked, with no runtime value behind
it. The parameter changes, the contents do not.

\`\`\`ts
const c = constant<string, number>('ada')

c.map((n: number) => n * 2)          // Const<string, number>
 .map((n: number) => String(n))      // Const<string, string>
 .value                              // 'ada', all the way through
\`\`\`

Both [functor](#functor) laws hold for free, which is worth checking against a definition
rather than trusting. Identity: mapping \`x => x\` returns the same \`value\`, which it does
because it returns the same \`value\` for every \`f\`. Composition: \`map(f).map(g)\` and
\`map(g . f)\` both return the \`value\` untouched, so they agree trivially.

This is what makes it useful rather than a curiosity. A [lens](#lens)'s \`view\` is \`over\` with
Const substituted in: run the update machinery, and because the functor refuses to write
anything back, what falls out at the end is the value it collected on the way past.`,
  rungs: [
    {
      id: 'implement',
      covers: ['map-does-nothing', 'lawful'],
      kind: 'code',
      role: 'implement',
      title: 'A functor whose map does nothing',
      prompt:
        '`Const` carries a value that `map` never touches. It still satisfies both functor laws, which is the surprising part.',
      hints: [
        '`map` has to give back a Const carrying the same value, ignoring the function entirely.',
        'Identity holds because nothing changed. Composition holds for the same reason.',
      ],
      exports: ['Const'],
      starter: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => {
    // f never runs
  },
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      solution: `// Const :: a -> Const a b
const Const = (value) => ({
  value,
  map: (f) => Const(value),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // Applies the function, which makes it an ordinary Identity functor.
        `const Const = (value) => ({
  value,
  map: (f) => Const(f(value)),
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
        // Gives back the bare value, so you cannot map again.
        `const Const = (value) => ({
  value,
  map: (f) => value,
  inspect: () => \`Const(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Const = exp.Const as (v: any) => any;

        T.check('map leaves the value alone', () => {
          const r = Const(5).map((n: number) => n * 100);
          return r?.value === 5 || `Got ${T.fmt(r)}, expected Const(5). The function is discarded.`;
        });

        T.check('The function is never called', () => {
          const spy = T.spyFn((n: number) => n);
          Const(5).map(spy);
          return spy.calls.length === 0 || `The function ran with ${T.fmt(spy.calls[0])}. Const drops it without looking.`;
        });

        T.check('map still gives back a Const', () => {
          const r = Const(5).map((n: number) => n);
          return typeof r?.map === 'function' || `Got ${T.fmt(r)}. You have to be able to go on mapping.`;
        });

        T.check('Mapping many times changes nothing', () => {
          const r = Const('kept').map((s: string) => s.toUpperCase()).map(() => 'replaced');
          return r?.value === 'kept' || `Got ${T.fmt(r)}`;
        });

        laws.functor(T, { of: Const, runs: 60 });
      },
    },

    {
      id: 'recognize',
      covers: ['what-it-is-for'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is Const good for?',
      prompt: 'A functor that ignores every function sounds useless. What does it actually buy you?',
      options: [
        {
          code: '// It collects a value while a generic traversal walks a structure,\n// which is how a lens getter is built',
          correct: true,
          why: 'Run a traversal with Const and the payload accumulates while the mapping does nothing. That is the trick behind van Laarhoven lenses.',
        },
        {
          code: '// It makes mapping faster',
          correct: false,
          why: 'It does skip the work, but nobody reaches for Const for speed.',
        },
        {
          code: '// It stops the value ever being read',
          correct: false,
          why: 'The value is perfectly readable. It is the mapping that is inert.',
        },
        {
          code: '// It is a placeholder with no real use',
          correct: false,
          why: 'It earns its place in optics, where the same traversal serves as both a getter and a setter depending which functor you hand it.',
        },
      ],
    },

    {
      id: 'build-view',
      kind: 'code',
      role: 'apply',
      covers: ['what-it-is-for', 'map-does-nothing'],
      title: "Build view out of over, using Const",
      prompt:
        "This is what Const is for. `over` walks a structure and writes the result back. Hand it `Const` instead of `Identity` and nothing gets written, so what falls out is the value it collected on the way past. Write both functors and derive `view` from `over`.",
      hints: [
        "`Identity` maps normally. `Const` holds a value and its map ignores the function entirely.",
        "`over` is written for you. It calls the functor's `of`, maps the focus, and reads `.value` off the end.",
        "`view` is `over` with `Const` as the functor and the identity as the function. Do not write a getter by hand.",
      ],
      exports: ['Identity', 'Const', 'view', 'set'],
      starter: `// over :: (Functor, Lens, (a -> a), s) -> s   written for you
const over = (F, lens, f, s) =>
  lens.modify((a) => F.of(f(a)), s).value

// a lens over one property, also written for you
const lensProp = (key) => ({
  modify: (toF, s) => {
    const wrapped = toF(s[key])
    return { value: wrapped.map((a) => ({ ...s, [key]: a })).value }
  }
})

// Identity :: a -> { value, map }
const Identity = { of: (a) => ({ value: a, map: (f) => Identity.of(a) }) }

// Const :: a -> { value, map }
const Const = { of: (a) => ({ value: a, map: (f) => Const.of(a) }) }

// view :: (Lens, s) -> a
const view = (lens, s) => s

// set :: (Lens, a, s) -> s
const set = (lens, value, s) => s
`,
      solution: `// over :: (Functor, Lens, (a -> a), s) -> s   written for you
const over = (F, lens, f, s) =>
  lens.modify((a) => F.of(f(a)), s).value

// a lens over one property, also written for you
const lensProp = (key) => ({
  modify: (toF, s) => {
    const wrapped = toF(s[key])
    return { value: wrapped.map((a) => ({ ...s, [key]: a })).value }
  }
})

// Identity :: a -> { value, map }
const Identity = { of: (a) => ({ value: a, map: (f) => Identity.of(f(a)) }) }

// Const :: a -> { value, map }
const Const = { of: (a) => ({ value: a, map: (f) => Const.of(a) }) }

// view :: (Lens, s) -> a
const view = (lens, s) => over(Const, lens, (a) => a, s)

// set :: (Lens, a, s) -> s
const set = (lens, value, s) => over(Identity, lens, () => value, s)
`,
      broken: [
        `const over = (F, lens, f, s) => lens.modify((a) => F.of(f(a)), s).value
const lensProp = (key) => ({
  modify: (toF, s) => {
    const wrapped = toF(s[key])
    return { value: wrapped.map((a) => ({ ...s, [key]: a })).value }
  }
})
const Identity = { of: (a) => ({ value: a, map: (f) => Identity.of(f(a)) }) }
const Const = { of: (a) => ({ value: a, map: (f) => Const.of(f(a)) }) }
const view = (lens, s) => over(Const, lens, (a) => a, s)
const set = (lens, value, s) => over(Identity, lens, () => value, s)
`,
        `const over = (F, lens, f, s) => lens.modify((a) => F.of(f(a)), s).value
const lensProp = (key) => ({
  modify: (toF, s) => {
    const wrapped = toF(s[key])
    return { value: wrapped.map((a) => ({ ...s, [key]: a })).value }
  }
})
const Identity = { of: (a) => ({ value: a, map: (f) => Identity.of(f(a)) }) }
const Const = { of: (a) => ({ value: a, map: (f) => Const.of(a) }) }
const view = (lens, s) => s.name
const set = (lens, value, s) => over(Identity, lens, () => value, s)
`,
        `const over = (F, lens, f, s) => lens.modify((a) => F.of(f(a)), s).value
const lensProp = (key) => ({
  modify: (toF, s) => {
    const wrapped = toF(s[key])
    return { value: wrapped.map((a) => ({ ...s, [key]: a })).value }
  }
})
const Identity = { of: (a) => ({ value: a, map: (f) => Identity.of(a) }) }
const Const = { of: (a) => ({ value: a, map: (f) => Const.of(a) }) }
const view = (lens, s) => over(Const, lens, (a) => a, s)
const set = (lens, value, s) => over(Identity, lens, () => value, s)
`,
      ],
      checks: (T, exp) => {
        const { Identity, Const, view, set } = exp;
        const lensProp = (key: string) => ({
          modify: (toF: (a: unknown) => { map: (f: (x: unknown) => unknown) => { value: unknown } }, s: Record<string, unknown>) => {
            const wrapped = toF(s[key]);
            return { value: wrapped.map((a: unknown) => ({ ...s, [key]: a })).value };
          },
        });
        const name = lensProp('name');
        const ada = () => ({ name: 'ada', age: 36 });

        T.check('Identity maps for real', () => {
          const r = Identity.of(3).map((n: number) => n * 2).value;
          return r === 6 || `Identity mapped 3 by doubling and gave ${T.fmt(r)}. This is the functor that does write the result back.`;
        });

        T.check('Const refuses to map', () => {
          const r = Const.of('kept').map(() => 'changed').value;
          return (
            r === 'kept' ||
            `Const gave ${T.fmt(r)} after mapping. There is no second value in there for the function to be applied to, which is the whole property.`
          );
        });

        T.check('Const never calls the function', () => {
          let ran = false;
          Const.of(1).map(() => {
            ran = true;
            return 2;
          });
          return !ran || 'The function ran. Const holds one value of a type the map has nothing to do with.';
        });

        T.check('view reads the focus back out', () => {
          const r = view(name, ada());
          return r === 'ada' || `view gave ${T.fmt(r)}, expected 'ada'.`;
        });

        T.check('view was built from over, not written as a getter', () => {
          const src = T.src.replace(/\/\/[^\n]*/g, '');
          const line = src.split('\n').find((l) => /const\s+view\s*=/.test(l)) ?? '';
          return (
            /over\s*\(/.test(line) && /Const/.test(line) ||
            'view should be over with Const substituted in. Writing a getter by hand works and demonstrates nothing, because the point is that the same machinery reads when the functor refuses to write.'
          );
        });

        T.check('set writes through the same machinery', () => {
          const r = set(name, 'grace', ada());
          return (
            r && r.name === 'grace' && r.age === 36 ||
            `set gave ${T.fmt(r)}. With Identity the mapped value does get written back, and the rest of the record comes along.`
          );
        });

        T.check('The original is left alone', () => {
          const a = ada();
          set(name, 'grace', a);
          return a.name === 'ada' || `The original now reads ${T.fmt(a.name)}.`;
        });

        T.check('The two differ only by which functor went in', () => {
          const read = view(name, ada());
          const written = set(name, 'grace', ada());
          return (
            read === 'ada' && written.name === 'grace' ||
            `Reading gave ${T.fmt(read)} and writing gave ${T.fmt(written)}. One function, two functors, two behaviours.`
          );
        });
      },
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['map-does-nothing', 'lawful', 'typed-signature'],
      title: "Satisfy Const<A, B>",
      prompt:
        "The interface is given. Write `constant`. Read the structure first and find where a `B` is meant to come from.",
      hints: [
        "There is only one field, and it holds an `A`.",
        "`map` owes a `Const<A, C>`. Building one needs an `A`, and you have one.",
        "If you are reaching for something to pass to `f`, that is the lesson. There is nothing to pass.",
      ],
      exports: ['constant'],
      starter: `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => constant(undefined as never)
})
`,
      solution: `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => constant(value)
})
`,
      broken: [
        `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => constant((f as (b: never) => never)(value as never))
})
`,
        `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => ({ value }) as never
})
`,
        `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => {
    ;(f as (b: never) => never)(value as never)
    return constant(value)
  }
})
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
        T.check('The Const interface is still there to satisfy', () => {
          return /interface\s+Const/.test(T.src) || 'The Const interface has gone. It is the thing being satisfied.';
        });
        const constant = exp.constant;

        T.check('The value is readable', () => {
          const c = constant('ada');
          return c.value === 'ada' || `A Const of 'ada' read back as ${T.fmt(c.value)}.`;
        });

        T.check('map never calls the function', () => {
          let ran = false;
          constant('ada').map(() => { ran = true; return 1; });
          return !ran || 'The function ran. There is no B anywhere in the structure, so there was nothing to hand it.';
        });

        T.check('The value survives a map', () => {
          const r = constant('ada').map((n: number) => n * 2);
          return r.value === 'ada' || `After mapping, the value read ${T.fmt(r.value)}.`;
        });

        T.check('map gives back something you can map again', () => {
          const r = constant('ada').map((n: number) => n * 2);
          return typeof r.map === 'function' || `Mapping gave ${T.fmt(r)}, which cannot be mapped again.`;
        });

        T.check('The value survives any number of maps', () => {
          const r = constant('ada')
            .map((n: number) => n * 2)
            .map((n: number) => String(n))
            .map((s: string) => s.length);
          return r.value === 'ada' || `After three maps the value read ${T.fmt(r.value)}.`;
        });

        T.law('Identity: mapping with x => x changes nothing', 60, (G) => {
          const v = G.int();
          const r = constant(v).map((x: number) => x).value;
          return r === v || `${v} came back as ${T.fmt(r)}.`;
        });

        T.law('Composition: two maps agree with one, trivially', 60, (G) => {
          const v = G.str();
          const f = G.fn();
          const g = G.fn();
          const twice = constant(v).map(f.f).map(g.f).value;
          const once = constant(v).map((x: number) => g.f(f.f(x))).value;
          return (
            twice === once && twice === v ||
            `With ${f.name} and ${g.name} over ${T.fmt(v)}: ${T.fmt(twice)} against ${T.fmt(once)}.`
          );
        });
      },
    },

    {
      id: 'typed-read',
      kind: 'expr',
      role: 'recognize',
      lang: 'ts',
      covers: ['typed-signature', 'lawful'],
      title: "There is no B to call the function on",
      prompt:
        "`B` appears in the type parameters and in `f`'s argument and nowhere in the structure. Type an array of the value after three maps and whether the function ever ran.",
      hints: [
        "Go looking for a `B` in the structure. There is one field and it holds an `A`.",
        "`map` owes a `Const<A, C>`, and building one needs an `A`, which you have.",
        "Both functor laws hold for free, because every map returns the same value.",
      ],
      context: `interface Const<A, B> {
  value: A
  map: <C>(f: (b: B) => C) => Const<A, C>
}

const constant = <A, B>(value: A): Const<A, B> => ({
  value,
  map: (f) => constant(value)
})
`,
      placeholder: "[..., ...]",
      expect: ["ada",false],
      solution: "(() => { let ran = false; const r = constant<string, number>('ada').map((n) => { ran = true; return n * 2 }).map((n) => String(n)).map((s) => s.length); return [r.value, ran] })()",
      broken: ["['ada', true]", "[3, false]", "[undefined, false]"],
    },
  ],
};
