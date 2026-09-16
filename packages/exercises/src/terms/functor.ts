import * as laws from '@fpx/engine/laws';
import type { ExerciseSet } from '@fpx/engine/types';

export const functor: ExerciseSet = {
  termId: 'functor',
  rubric: [
    {
      id: 'map-rewraps',
      statement:
        "Knows map applies a function inside and hands back the same kind of container, so mapping can continue.",
    },
    {
      id: 'two-laws',
      statement:
        "Can state the identity and composition laws and say what each one rules out.",
    },
    {
      id: 'skipping-is-lawful',
      statement:
        "Knows a functor may decline to apply the function, as Maybe does on nothing, and still obey both laws.",
    },
    {
      id: 'break-a-law',
      statement:
        "Can construct something that looks like a functor and quietly fails a law, and know which one it failed.",
    },
  ],
  notes: `A functor is a container with a \`map\` that obeys two laws. The shape requirement comes first:
map has to hand back **the same kind of container**, or you cannot map again.

\`\`\`js
const Box = (value) => ({
  value,
  map: (f) => Box(f(value))
})

Box(2).map((x) => x + 1).map((x) => x * 10)   // Box(30)

map: (f) => f(value)          // unwraps instead
Box(2).map(inc).map(dbl)      // TypeError: .map is not a function
\`\`\`

**Identity**: mapping the identity function changes nothing.

\`\`\`js
Box(3).map((x) => x)   // has to equal Box(3)
\`\`\`

That rules out a map which sneaks in extra work. **Composition**: mapping twice equals mapping
the composition.

\`\`\`js
Box(3).map(f).map(g)              // has to equal
Box(3).map((x) => g(f(x)))
\`\`\`

That rules out a map whose behaviour depends on anything but its argument and the value inside.

A functor is allowed to **not run the function**, which surprises people. Maybe declines on
nothing and both laws still hold, because they hold on the Nothing case vacuously:

\`\`\`js
const Maybe = (value) => ({
  value,
  map: (f) => (value == null ? Maybe(value) : Maybe(f(value)))
})

Maybe(null).map((x) => x.name)   // Maybe(null), no crash
\`\`\`

Breaking a law while keeping the shape takes a little care, and that is the useful exercise:

\`\`\`js
let calls = 0
const BadBox = (value) => ({
  value,
  map: (f) => BadBox(f(value) + calls++)   // depends on history, so it cannot compose
})
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['map-rewraps', 'two-laws'],
      kind: 'code',
      role: 'implement',
      title: 'Give Box a lawful map',
      prompt:
        'A functor is a container with a map that obeys two laws: mapping identity changes nothing, and mapping f then g equals mapping their composition.',
      hints: [
        'map has to hand back a container, not the bare value inside it.',
        '`Box(f(value))` applies the function and wraps the result again.',
      ],
      exports: ['Box'],
      starter: `// map :: Box a ~> (a -> b) -> Box b
const Box = (value) => ({
  value,
  map: (f) => {
    // return a new Box
  },
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
`,
      solution: `// map :: Box a ~> (a -> b) -> Box b
const Box = (value) => ({
  value,
  map: (f) => Box(f(value)),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // The classic: map unwraps instead of rewrapping, so you cannot chain.
        `const Box = (value) => ({
  value,
  map: (f) => f(value),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
`,
        // Wraps, but never applies the function. Identity passes, composition does not.
        `const Box = (value) => ({
  value,
  map: (f) => Box(value),
  inspect: () => \`Box(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Box = exp.Box as (v: any) => any;
        const isBox = (b: any) => b && typeof b.map === 'function' && 'value' in b;

        T.check('map returns a Box, not a raw value', () => {
          const r = Box(2).map((x: number) => x + 1);
          return isBox(r) || `Got ${T.fmt(r)}. map has to give back something you can map again.`;
        });

        T.check('Box(2).map(x => x + 1) holds 3', () => {
          const r = Box(2).map((x: number) => x + 1);
          return (isBox(r) && r.value === 3) || `Got ${T.fmt(r)}`;
        });

        laws.functor(T, { of: Box, runs: 60 });
      },
    },

    {
      id: 'apply',
      covers: ['skipping-is-lawful', 'two-laws'],
      kind: 'code',
      role: 'apply',
      title: 'A Maybe that skips missing values',
      prompt:
        'Maybe is a functor whose map does nothing when the value is null or undefined. Use it to read a nested property without crashing.',
      hints: ['Check `isNothing()` first, and hand back a Maybe of the same empty value when it is true.'],
      exports: ['Maybe'],
      starter: `const Maybe = (value) => ({
  value,
  isNothing: () => value === null || value === undefined,
  map: (f) => {
    // skip f when there is nothing inside
  },
  inspect: () => \`Maybe(\${JSON.stringify(value)})\`
})
`,
      solution: `const Maybe = (value) => ({
  value,
  isNothing: () => value === null || value === undefined,
  map: (f) =>
    value === null || value === undefined ? Maybe(value) : Maybe(f(value)),
  inspect: () => \`Maybe(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // Maps unconditionally, so a null value blows up on the next property access.
        `const Maybe = (value) => ({
  value,
  isNothing: () => value === null || value === undefined,
  map: (f) => Maybe(f(value)),
  inspect: () => \`Maybe(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const Maybe = exp.Maybe as (v: any) => any;
        const isM = (m: any) => m && typeof m.map === 'function' && 'value' in m;

        T.check('Maybe(3).map(x => x + 1) holds 4', () => {
          const r = Maybe(3).map((x: number) => x + 1);
          return (isM(r) && r.value === 4) || `Got ${T.fmt(r)}`;
        });

        T.check('Maybe(null).map(f) never calls f', () => {
          const spy = T.spyFn((x: unknown) => x);
          const r = Maybe(null).map(spy);
          if (spy.calls.length > 0) return 'f ran on null. Maybe exists so that it does not.';
          return isM(r) || `Got ${T.fmt(r)}. Skipping f still has to give back a Maybe.`;
        });

        T.check('Reads user.address.street safely', () => {
          const street = (u: any) => Maybe(u).map((x: any) => x.address).map((a: any) => a.street).value;
          const found = street({ address: { street: 'Main' } });
          const missing = street({});
          if (found !== 'Main') return `On a user with an address, got ${T.fmt(found)} instead of "Main".`;
          return (
            missing === undefined || missing === null || `On a user with no address, got ${T.fmt(missing)} instead of nothing.`
          );
        });

        laws.functor(T, { of: Maybe, runs: 40 });
      },
    },

    {
      id: 'break',
      covers: ['break-a-law'],
      kind: 'code',
      role: 'break',
      inverted: true,
      title: 'Break a law on purpose',
      prompt:
        'Write BadBox whose map still returns a BadBox but quietly breaks a functor law. You pass when the law checker catches it.',
      hints: [
        'Keeping the shape right is easy. The interesting failures are the ones that still look like a functor.',
        'A map that depends on anything other than its argument and the value inside will not compose.',
      ],
      exports: ['BadBox'],
      starter: `const BadBox = (value) => ({
  value,
  map: (f) => BadBox(f(value)),
  inspect: () => \`BadBox(\${JSON.stringify(value)})\`
})
`,
      solution: `let calls = 0
const BadBox = (value) => ({
  value,
  // Depends on how many times map has ever run, so mapping twice is not
  // the same as mapping the composition.
  map: (f) => BadBox(f(value) + calls++),
  inspect: () => \`BadBox(\${JSON.stringify(value)})\`
})
`,
      broken: [
        // A perfectly lawful functor: nothing for the checker to catch.
        `const BadBox = (value) => ({
  value,
  map: (f) => BadBox(f(value)),
  inspect: () => \`BadBox(\${JSON.stringify(value)})\`
})
`,
        // Breaks the shape instead of a law, which the first check rejects.
        `const BadBox = (value) => ({
  value,
  map: (f) => f(value),
  inspect: () => \`BadBox(\${JSON.stringify(value)})\`
})
`,
      ],
      checks: (T, exp) => {
        const BadBox = exp.BadBox as (v: any) => any;
        const isB = (b: any) => b && typeof b.map === 'function' && 'value' in b;

        T.check('map still returns a BadBox', () => {
          const r = BadBox(1).map((x: number) => x + 1);
          return (
            isB(r) ||
            `Got ${T.fmt(r)}. Breaking the shape is too easy: keep it looking like a functor and break a law instead.`
          );
        });

        T.check('The law checker finds a counterexample', () => {
          for (let i = 0; i < 80; i++) {
            const n = T.G.int();

            const id = BadBox(n).map((x: unknown) => x);
            if (!isB(id) || !T.eq(id.value, n)) return true;

            const f = T.G.fn();
            const g = T.G.fn();
            const once = BadBox(n).map(f.f);
            const left = isB(once) ? once.map(g.f) : once;
            const right = BadBox(n).map((x: number) => g.f(f.f(x)));
            if (!isB(left) || !T.eq(left.value, right.value)) return true;
          }
          return 'Both laws held across 80 random cases. Your BadBox is still a lawful functor.';
        });
      },
    },
  ],
};
