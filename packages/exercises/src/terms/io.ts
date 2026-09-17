import type { ExerciseSet } from '@fpx/engine/types';

export const io: ExerciseSet = {
  termId: 'io',
  rubric: [
    {
      id: 'description-not-action',
      statement:
        "Knows an IO is a description of an effect, and that building or mapping one performs nothing.",
    },
    {
      id: 'map-and-chain',
      statement:
        "Can give IO a map and a chain, and knows chain must run the inner IO rather than wrapping it again.",
    },
    {
      id: 'reusable',
      statement:
        "Knows running the same IO twice performs the effect twice, and can say why that is the point.",
    },
  ],
  notes: `IO wraps an effect as a **value**. The effect is a function sitting inside, waiting, and
nothing happens until you ask.

\`\`\`js
const IO = (effect) => ({
  run: effect,
  map: (f) => IO(() => f(effect())),
  chain: (f) => IO(() => f(effect()).run())
})

const readName = IO(() => window.localStorage.getItem('name'))
// nothing has been read yet
readName.run()   // now it has
\`\`\`

Building and mapping must perform nothing. Assembling a whole program is still just assembling:

\`\`\`js
let reads = 0
const program = IO(() => { reads++; return 'ada' })
  .map((n) => n.toUpperCase())
  .map((n) => \`Hello, \${n}\`)

reads              // 0, the program is only described
program.run()      // 'Hello, ADA'
reads              // 1
\`\`\`

The common mistake is performing the effect while building:

\`\`\`js
map: (f) => {
  const value = effect()      // ran at build time
  return IO(() => f(value))
}
\`\`\`

And \`chain\` has to **run** the inner IO, or you end up holding an IO of an IO:

\`\`\`js
chain: (f) => IO(() => f(effect()))          // gives IO(IO(6))
chain: (f) => IO(() => f(effect()).run())    // gives IO(6)
\`\`\`

Because it is a description rather than a result, running it twice performs it twice. That is
the feature: the value is reusable, and the caller decides when and how often.

\`\`\`js
program.run()   // reads storage
program.run()   // reads it again, freshly
\`\`\``,
  rungs: [
    {
      id: 'implement',
      covers: ['description-not-action', 'map-and-chain', 'reusable'],
      kind: 'code',
      role: 'implement',
      title: 'An IO that does nothing until you run it',
      prompt:
        'IO wraps an effect as a value. Building and mapping over one must not perform the effect; only `.run()` does.',
      hints: [
        'The whole IO is a function waiting to be called. `map` returns a new IO that wraps the old one.',
        '`chain` is like map, except the function already returns an IO, so run that one rather than wrapping it again.',
      ],
      sidequests: [
        { termId: 'monad', why: "IO's `chain` is one instance of a general pattern. The pattern itself, and why chaining does not stack layers, is there." },
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
      covers: ['description-not-action'],
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

    {
      id: 'reuse',
      kind: 'code',
      role: 'apply',
      covers: ['map-and-chain', 'reusable'],
      title: "Build the effect once, run it as often as you like",
      prompt:
        "An IO is a description, so making one does nothing and it can be run again. Write `io`, with `map` and `chain`, and confirm that building a pipeline performs none of it until `run` is called.",
      hints: [
        "`io(effect)` just holds the function. Nothing happens until `run`.",
        "`map` wraps a new description that runs this one and applies `f` to the answer.",
        "`chain`'s function returns another IO, so `run` it rather than wrapping it again.",
      ],
      sidequests: [
        { termId: 'monad', why: "The reason `chain` unwraps what its function returned instead of wrapping it again." },
      ],
      exports: ['io'],
      starter: `// io :: (() -> a) -> IO a
const io = (effect) => ({
  run: effect,
  map: (f) => io(effect),
  chain: (f) => io(effect)
})
`,
      solution: `// io :: (() -> a) -> IO a
const io = (effect) => ({
  run: effect,
  map: (f) => io(() => f(effect())),
  chain: (f) => io(() => f(effect()).run())
})
`,
      broken: [
        `const io = (effect) => ({
  run: effect,
  map: (f) => io(f(effect())),
  chain: (f) => io(() => f(effect()).run())
})
`,
        `const io = (effect) => ({
  run: effect,
  map: (f) => io(() => f(effect())),
  chain: (f) => io(() => f(effect()))
})
`,
        `const io = (effect) => ({
  run: effect,
  map: (f) => io(() => effect()),
  chain: (f) => io(() => f(effect()).run())
})
`,
      ],
      checks: (T, exp) => {
        const io = exp.io;

        T.check('Making an IO performs nothing', () => {
          let ran = false;
          io(() => {
            ran = true;
            return 1;
          });
          return !ran || 'The effect ran while the IO was being built. A description is not a performance.';
        });

        T.check('Running it performs the effect', () => {
          const r = io(() => 42).run();
          return r === 42 || `Running it gave ${T.fmt(r)}.`;
        });

        T.check('Mapping performs nothing either', () => {
          let ran = false;
          io(() => {
            ran = true;
            return 1;
          }).map((n: number) => n + 1);
          return !ran || 'The effect ran while a map was being attached. Building the pipeline is still just describing it.';
        });

        T.check('map transforms the answer when it finally runs', () => {
          const r = io(() => 21).map((n: number) => n * 2).run();
          return r === 42 || `Doubling a described 21 gave ${T.fmt(r)}.`;
        });

        T.check('Chaining performs nothing either', () => {
          let ran = false;
          io(() => {
            ran = true;
            return 1;
          }).chain((n: number) => io(() => n + 1));
          return !ran || 'The effect ran while a chain was being attached.';
        });

        T.check('chain does not leave an IO inside an IO', () => {
          const r = io(() => 21).chain((n: number) => io(() => n * 2)).run();
          return (
            r === 42 ||
            `Running the chain gave ${T.fmt(r)}. If it came back as an object, the inner description was wrapped again instead of being run.`
          );
        });

        T.check('The same IO can be run more than once', () => {
          let calls = 0;
          const effect = io(() => {
            calls += 1;
            return calls;
          });
          const a = effect.run();
          const b = effect.run();
          return (a === 1 && b === 2 && calls === 2) || `Two runs gave ${T.fmt(a)} and ${T.fmt(b)} after ${calls} calls.`;
        });

        T.check('A built pipeline is reusable too', () => {
          let calls = 0;
          const pipeline = io(() => {
            calls += 1;
            return calls;
          }).map((n: number) => n * 10);
          const a = pipeline.run();
          const b = pipeline.run();
          return (a === 10 && b === 20) || `Two runs of the pipeline gave ${T.fmt(a)} and ${T.fmt(b)}.`;
        });

        T.check('Running it twice really performs it twice', () => {
          const seen: number[] = [];
          const effect = io(() => seen.push(1));
          effect.run();
          effect.run();
          return seen.length === 2 || `The effect happened ${seen.length} times across two runs.`;
        });
      },
    },
  ],
};
