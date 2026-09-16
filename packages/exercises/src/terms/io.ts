import type { ExerciseSet } from '@fpx/engine/types';

export const io: ExerciseSet = {
  termId: 'io',
  rungs: [
    {
      id: 'implement',
      kind: 'code',
      role: 'implement',
      title: 'An IO that does nothing until you run it',
      prompt:
        'IO wraps an effect as a value. Building and mapping over one must not perform the effect; only `.run()` does.',
      hints: [
        'The whole IO is a function waiting to be called. `map` returns a new IO that wraps the old one.',
        '`chain` is like map, except the function already returns an IO, so run that one rather than wrapping it again.',
      ],
      exports: ['IO'],
      starter: `// IO :: (() -> a) -> IO a
const IO = (effect) => ({
  run: effect,
  map: (f) => {
    // a new IO that runs this one and then applies f
  },
  chain: (f) => {
    // f already gives back an IO, so do not wrap it twice
  },
  inspect: () => 'IO(?)'
})
`,
      solution: `// IO :: (() -> a) -> IO a
const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run()),
  inspect: () => 'IO(?)'
})
`,
      broken: [
        // map runs the effect straight away, which defeats the whole point.
        `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => f(effect()),
  inspect: () => 'IO(?)'
})
`,
        // map performs the effect while building.
        `const IO = (effect) => ({
  run: effect,
  map: (f) => {
    const value = effect()
    return IO(() => f(value))
  },
  chain: (f) => IO(() => f(effect()).run()),
  inspect: () => 'IO(?)'
})
`,
        // chain forgets to run the inner IO, so you get an IO of an IO.
        `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect())),
  inspect: () => 'IO(?)'
})
`,
      ],
      checks: (T, exp) => {
        const IO = exp.IO as (e: () => any) => any;

        T.check('run performs the effect', () => {
          const r = IO(() => 42).run();
          return r === 42 || `Got ${T.fmt(r)}`;
        });

        T.check('Building an IO performs nothing', () => {
          const spy = T.spyFn(() => 1);
          IO(spy);
          return spy.calls.length === 0 || 'The effect ran while the IO was being built. An IO is a description, not a performance.';
        });

        T.check('map performs nothing either', () => {
          const spy = T.spyFn(() => 1);
          IO(spy).map((n: number) => n + 1);
          return (
            spy.calls.length === 0 ||
            'The effect ran during map. Mapping should build a bigger description and still not run anything.'
          );
        });

        T.check('A whole chain of maps stays inert until run', () => {
          const spy = T.spyFn(() => 1);
          const program = IO(spy)
            .map((n: number) => n + 1)
            .map((n: number) => n * 10);
          if (spy.calls.length !== 0) return 'Something ran while the program was being assembled.';
          const out = program.run();
          return out === 20 || `Running it gave ${T.fmt(out)}, expected 20.`;
        });

        T.check('map gives back an IO, not a bare value', () => {
          const r = IO(() => 1).map((n: number) => n + 1);
          return (
            r && typeof r.run === 'function' ||
            `Got ${T.fmt(r)}. map has to hand back something you can go on mapping and eventually run.`
          );
        });

        T.check('chain does not leave you with an IO inside an IO', () => {
          const r = IO(() => 2)
            .chain((n: number) => IO(() => n * 3))
            .run();
          return (
            r === 6 ||
            `Running it gave ${T.fmt(r)}, expected 6. If you got an object back, chain wrapped the inner IO instead of running it.`
          );
        });

        T.check('chain is still lazy', () => {
          const spy = T.spyFn(() => 2);
          IO(spy).chain((n: number) => IO(() => n * 3));
          return spy.calls.length === 0 || 'chain performed the effect while building.';
        });

        T.check('Running the same program twice performs the effect twice', () => {
          const spy = T.spyFn(() => 1);
          const program = IO(spy).map((n: number) => n);
          program.run();
          program.run();
          return (
            spy.calls.length === 2 ||
            `The effect ran ${spy.calls.length} time(s). An IO is a reusable description, so each run performs it again.`
          );
        });
      },
    },

    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Describe a program without running it',
      prompt:
        'Using the IO given, build `program`: read the name from the fake environment, upper-case it, and greet. Nothing may happen until it is run.',
      hints: ['`readName` is already an IO. Map over it rather than calling `.run()` yourself.'],
      exports: ['program'],
      starter: `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run())
})

const env = { name: 'ada' }
const readName = IO(() => env.name)

// program :: IO String   should run to "Hello, ADA"
const program = null
`,
      solution: `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run())
})

const env = { name: 'ada' }
const readName = IO(() => env.name)

// program :: IO String
const program = readName.map((n) => n.toUpperCase()).map((n) => \`Hello, \${n}\`)
`,
      broken: [
        // Runs the pipeline eagerly and hands back the finished string, not a description.
        `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run())
})
const env = { name: 'ada' }
const readName = IO(() => env.name)

const program = \`Hello, \${readName.run().toUpperCase()}\`
`,
        // Forgets to upper-case.
        `const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run())
})
const env = { name: 'ada' }
const readName = IO(() => env.name)

const program = readName.map((n) => \`Hello, \${n}\`)
`,
      ],
      checks: (T, exp) => {
        const program = exp.program as any;

        T.check('program is an IO, not a finished string', () => {
          return (
            program && typeof program.run === 'function' ||
            `Got ${T.fmt(program)}. The point is to describe the work and hand the description back.`
          );
        });

        T.check('Running it greets the upper-cased name', () => {
          const r = program.run();
          return r === 'Hello, ADA' || `Running it gave ${T.fmt(r)}, expected "Hello, ADA".`;
        });

        T.check('It reads the environment each time it runs', () => {
          // A description re-reads its source; a value captured at build time does not.
          const first = program.run();
          const second = program.run();
          return first === second || `Two runs gave ${T.fmt(first)} and ${T.fmt(second)}.`;
        });
      },
    },
  ],
};
