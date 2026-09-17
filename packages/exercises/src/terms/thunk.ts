import type { ExerciseSet } from '@fpx/engine/types';

export const thunk: ExerciseSet = {
  termId: 'thunk',
  rubric: [
    {
      id: 'what-it-is',
      statement: 'Knows a thunk is a zero-argument function standing in for a value that has not been computed yet.',
    },
    {
      id: 'defer',
      statement: 'Can wrap work so that nothing runs until the thunk is called, and can prove it by counting calls.',
    },
    {
      id: 'recompute-vs-cache',
      statement:
        'Knows a plain thunk recomputes on every call, and can add caching without breaking on a falsy or undefined result.',
    },
  ],
  notes: `A thunk is a function of no arguments standing in for a value you do not want computed yet.

\`\`\`js
const value = expensive()        // computed now
const thunk = () => expensive()  // computed if and when someone calls it
\`\`\`

The zero arguments are the point: a thunk already carries everything it needs, so passing one
around is passing the computation itself, and whoever ends up with it decides when.

**Deferral.** Building a thunk must run nothing. The usual mistake computes up front and wraps
the answer, which looks identical from outside and defers nothing:

\`\`\`js
const delay = (fn) => {
  const value = fn()             // already too late
  return () => value
}

const delay = (fn) => () => fn()
\`\`\`

**Recomputation.** A plain thunk runs its body every time, which is often what you want, because
it re-reads whatever it depends on:

\`\`\`js
let count = 0
const next = () => ++count
next()   // 1
next()   // 2
\`\`\`

When you want the opposite, cache it. The trap is deciding "have I run yet?" by looking at the
stored value:

\`\`\`js
const lazy = (fn) => {
  let value
  return () => {
    if (value === undefined) value = fn()   // a result of undefined recomputes forever
    return value
  }
}

const lazy = (fn) => {
  let forced = false
  let value
  return () => {
    if (!forced) {
      forced = true
      value = fn()
    }
    return value
  }
}
\`\`\`

The same idea appears as [lazy evaluation](#lazy-evaluation) over sequences, and as
[IO](#io), which is a thunk with a name and a \`map\`.`,
  rungs: [
    {
      id: 'implement',
      covers: ['what-it-is', 'defer'],
      kind: 'code',
      role: 'implement',
      title: 'Defer the work',
      prompt:
        'A thunk is a function of no arguments that stands in for a value not computed yet. Write `delay` so nothing runs until the thunk is called.',
      hints: [
        '`delay` should not call `fn` itself. It should hand back something that will.',
        'The returned function takes no arguments.',
      ],
      exports: ['delay'],
      starter: `// delay :: (() -> a) -> (() -> a)
const delay = (fn) => {
  // hand back a thunk that runs fn only when it is called
}
`,
      solution: `// delay :: (() -> a) -> (() -> a)
const delay = (fn) => () => fn()
`,
      broken: [
        // Runs immediately and wraps the answer, which defers nothing.
        `const delay = (fn) => {
  const value = fn()
  return () => value
}
`,
        // Returns the result, not a thunk at all.
        `const delay = (fn) => fn()
`,
      ],
      checks: (T, exp) => {
        const delay = exp.delay as <A>(fn: () => A) => () => A;

        T.check('delay gives back a thunk', () => {
          const t = delay(() => 1);
          return (
            typeof t === 'function' ||
            `Got ${T.fmt(t)}. delay should hand back something to call later, not the value itself.`
          );
        });

        T.check('Nothing runs until the thunk is called', () => {
          const spy = T.spyFn(() => 42);
          delay(spy);
          return spy.calls.length === 0 || 'The work ran while building the thunk. A thunk defers it until someone asks.';
        });

        T.check('Calling the thunk gives the value', () => {
          const r = delay(() => 42)();
          return r === 42 || `Got ${T.fmt(r)}`;
        });

        T.check('The thunk takes no arguments', () => {
          const t = delay(() => 1);
          return t.length === 0 || `The thunk declares ${t.length} argument(s). A thunk takes none.`;
        });

        T.check('Calling it twice runs the work twice', () => {
          const spy = T.spyFn(() => 1);
          const t = delay(spy);
          t();
          t();
          return (
            spy.calls.length === 2 ||
            `The work ran ${spy.calls.length} time(s). A plain thunk defers, it does not cache. Caching is the next rung.`
          );
        });
      },
    },

    {
      id: 'apply',
      covers: ['recompute-vs-cache', 'defer'],
      kind: 'code',
      role: 'apply',
      title: 'Compute it at most once',
      prompt:
        '`lazy` is a thunk that remembers. The work is skipped until the first call, and never repeated after it.',
      hints: [
        'Keep a flag for whether it has run, separate from the value.',
        'A value of undefined or 0 is still a computed value, so do not use the value itself as the flag.',
      ],
      exports: ['lazy'],
      starter: `// lazy :: (() -> a) -> (() -> a)
const lazy = (fn) => {
  // run fn at most once, then hand back the same value forever
}
`,
      solution: `// lazy :: (() -> a) -> (() -> a)
const lazy = (fn) => {
  let forced = false
  let value
  return () => {
    if (!forced) {
      forced = true
      value = fn()
    }
    return value
  }
}
`,
      broken: [
        // Uses the value as the flag, so a falsy result recomputes forever.
        `const lazy = (fn) => {
  let value
  return () => {
    if (value === undefined) value = fn()
    return value
  }
}
`,
        // Eager: computes up front, which is the thing lazy exists to avoid.
        `const lazy = (fn) => {
  const value = fn()
  return () => value
}
`,
      ],
      checks: (T, exp) => {
        const lazy = exp.lazy as <A>(fn: () => A) => () => A;

        T.check('lazy gives back a thunk', () => {
          const t = lazy(() => 1);
          return (
            typeof t === 'function' ||
            `Got ${T.fmt(t)}. lazy hands back something to call later, not the value itself.`
          );
        });

        T.check('Nothing runs while the thunk is being built', () => {
          const spy = T.spyFn(() => 1);
          lazy(spy);
          return spy.calls.length === 0 || 'The work ran up front. Lazy means the first call triggers it, not the setup.';
        });

        T.check('The first call gives the value', () => {
          const r = lazy(() => 'computed')();
          return r === 'computed' || `Got ${T.fmt(r)}`;
        });

        T.check('Three calls run the work once', () => {
          const spy = T.spyFn(() => 7);
          const t = lazy(spy);
          t();
          t();
          t();
          return spy.calls.length === 1 || `The work ran ${spy.calls.length} times.`;
        });

        T.check('Later calls give the same value back', () => {
          let n = 0;
          const t = lazy(() => ++n);
          return (t() === 1 && t() === 1) || `The second call gave ${T.fmt(t())} instead of the first value.`;
        });

        T.check('A computed undefined is still remembered', () => {
          const spy = T.spyFn(() => undefined);
          const t = lazy(spy);
          t();
          t();
          return (
            spy.calls.length === 1 ||
            'It recomputed because the value was undefined. Track whether it has run separately from what it returned.'
          );
        });
      },
    },

    {
      id: 'once',
      kind: 'code',
      role: 'apply',
      covers: ['what-it-is', 'recompute-vs-cache'],
      title: "A thunk recomputes, unless you make it not",
      prompt:
        "A thunk is a function of no arguments standing in for a value that has not been produced yet. Write `delay`, which makes one, and `once`, which makes one that only ever does the work a single time.",
      hints: [
        "`delay` wraps the work and does nothing until it is called.",
        "`once` has to remember whether it has run, not just whether the answer is truthy.",
        "A thunk that produced `undefined` has still run.",
      ],
      exports: ['delay', 'once'],
      starter: `// delay :: (() -> a) -> (() -> a)
const delay = (work) => work

// once :: (() -> a) -> (() -> a)
const once = (work) => work
`,
      solution: `// delay :: (() -> a) -> (() -> a)
const delay = (work) => () => work()

// once :: (() -> a) -> (() -> a)
const once = (work) => {
  let done = false
  let value
  return () => {
    if (!done) {
      value = work()
      done = true
    }
    return value
  }
}
`,
      broken: [
        `const delay = (work) => work()
const once = (work) => {
  let done = false
  let value
  return () => {
    if (!done) { value = work(); done = true }
    return value
  }
}
`,
        `const delay = (work) => () => work()
const once = (work) => {
  let value
  return () => {
    if (value === undefined) value = work()
    return value
  }
}
`,
        `const delay = (work) => () => work()
const once = (work) => () => work()
`,
      ],
      checks: (T, exp) => {
        const { delay, once } = exp;

        T.check('delay does nothing until it is called', () => {
          let ran = false;
          delay(() => {
            ran = true;
            return 1;
          });
          return !ran || 'The work ran while the thunk was being made. Standing in for a value means not being it yet.';
        });

        T.check('Calling it does the work', () => {
          const t = delay(() => 42);
          return t() === 42 || `The thunk gave ${T.fmt(t())}.`;
        });

        T.check('A plain thunk recomputes every time', () => {
          let calls = 0;
          const t = delay(() => {
            calls += 1;
            return calls;
          });
          t();
          t();
          return calls === 2 || `Two calls ran the work ${calls} time${calls === 1 ? '' : 's'}. A thunk is not a cache.`;
        });

        T.check('once does the work a single time', () => {
          let calls = 0;
          const t = once(() => {
            calls += 1;
            return calls;
          });
          const a = t();
          const b = t();
          const c = t();
          return (calls === 1 && a === 1 && b === 1 && c === 1) || `It ran ${calls} times and gave ${T.fmt([a, b, c])}.`;
        });

        T.check('once is still lazy', () => {
          let ran = false;
          once(() => {
            ran = true;
            return 1;
          });
          return !ran || 'once ran the work immediately. Caching the answer does not mean producing it early.';
        });

        T.check('A thunk that produced undefined has still run', () => {
          let calls = 0;
          const t = once(() => {
            calls += 1;
            return undefined;
          });
          t();
          t();
          return (
            calls === 1 ||
            `It ran ${calls} times for a thunk returning undefined. Remembering whether it has run is not the same as checking whether the answer looks empty.`
          );
        });

        T.check('once caches a falsy answer too', () => {
          let calls = 0;
          const t = once(() => {
            calls += 1;
            return 0;
          });
          t();
          t();
          return (calls === 1 && t() === 0) || `It ran ${calls} times and gave ${T.fmt(t())}.`;
        });

        T.check('Two thunks do not share a cache', () => {
          const a = once(() => 1);
          const b = once(() => 2);
          return (a() === 1 && b() === 2) || `They gave ${T.fmt(a())} and ${T.fmt(b())}.`;
        });
      },
    },
  ],
};
