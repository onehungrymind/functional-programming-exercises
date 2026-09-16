import type { ExerciseSet } from '@fpx/engine/types';

export const sumType: ExerciseSet = {
  termId: 'sum-type',
  rubric: [
    {
      id: 'one-of-several',
      statement:
        "Can build a tagged union where a value is exactly one case and carries that case's payload.",
    },
    {
      id: 'exhaustive-match',
      statement:
        "Can write a match that refuses to run unless every case is handled, and knows why a silent undefined is the failure to prevent.",
    },
    {
      id: 'recognize',
      statement:
        "Can identify a sum type in the wild, including recursive ones like a list.",
    },
    {
      id: 'typed-signature',
      statement:
        "Can say how a discriminated union turns a forgotten case into a compile error, and what the `never` parameter has to do with it.",
    },
  ],
  notes: `A sum type is a value that is **exactly one** of several shapes. Each case carries a tag and
whatever that case needs.

\`\`\`js
const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })
\`\`\`

That replaces a record where most combinations are meaningless. \`{ loading, data, error }\`
has eight states and three make sense; this has three.

The value of the tag is that a single function can dispatch on it, and **refuse** to run when a
case is unhandled:

\`\`\`js
const CASES = ['loading', 'ok', 'failed']

const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) throw new TypeError(\`match is missing a handler for: \${missing.join(', ')}\`)
  return handlers[state.type](state)
}
\`\`\`

Without that check a forgotten case is silent, which is the exact failure exhaustiveness exists
to prevent:

\`\`\`js
const match = (state, handlers) => handlers[state.type](state)

match(Failed('boom'), { loading: () => '...', ok: (s) => s.data })
// TypeError: handlers[state.type] is not a function, somewhere far from the cause
\`\`\`

More things are sum types than you would think. A list is one, and a recursive one:

\`\`\`js
// [a] is either empty, or a head followed by a tail
Boolean          // true | false, the smallest interesting sum
Option a         // Some a | None
Either e a       // Left e | Right a
\`\`\``,
  typedNotes: `Same track, second lap. This is the concept TypeScript is best at, and the payoff is not
subtle.

\`\`\`ts
type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }
\`\`\`

One of several, spelled out. \`ok\` carries data, \`failed\` carries a reason, \`loading\` carries
nothing, and no value is ever more than one of them. Compare what you would otherwise write:

\`\`\`ts
interface Status {
  loading: boolean
  data?: string
  reason?: string
}
\`\`\`

That type permits \`{ loading: true, data: 'x', reason: 'y' }\`, which is nonsense you now have
to defend against at every call site. The union permits exactly three shapes.

Testing the tag narrows the union, so the compiler knows which fields exist in each branch:

\`\`\`ts
const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    case 'ok':      return s.data      // \`reason\` is not in scope here
    case 'failed':  return s.reason    // and \`data\` is not in scope here
  }
}
\`\`\`

Now the part worth learning properly. Exhaustiveness:

\`\`\`ts
const assertNever = (x: never): never => {
  throw new Error('unhandled case: ' + JSON.stringify(x))
}

const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    case 'ok':      return s.data
    case 'failed':  return s.reason
    default:        return assertNever(s)
  }
}
\`\`\`

By the \`default\` branch every case has been handled, so \`s\` has been narrowed to \`never\`, and
\`assertNever\` accepts it. Add a fourth member to \`Status\` and that narrowing no longer reaches
\`never\`, so the call stops compiling and it points at every \`switch\` that has not been
updated.

That is the thing to take away. A sum type does not just describe your states, it makes the
compiler find the places you forgot when the states change. Without \`assertNever\` the
\`switch\` just falls through and returns \`undefined\`, and you find out in production.`,
  rungs: [
    {
      id: 'implement',
      covers: ['one-of-several', 'exhaustive-match'],
      kind: 'code',
      role: 'implement',
      title: 'A tagged union with an exhaustive match',
      prompt:
        'A sum type is a value that is one of several shapes. Build the three constructors and a `match` that refuses to run unless every case is handled.',
      hints: [
        'Each constructor tags its value: `{ type: "loading" }`, `{ type: "ok", data }`, `{ type: "failed", error }`.',
        '`match` looks the handler up by tag. Missing handlers should throw, not silently return undefined.',
      ],
      exports: ['Loading', 'Ok', 'Failed', 'match'],
      starter: `const Loading = () => {
}
const Ok = (data) => {
}
const Failed = (error) => {
}

// match :: (State, { loading, ok, failed }) -> a
const match = (state, handlers) => {
}
`,
      solution: `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })

const CASES = ['loading', 'ok', 'failed']

// match :: (State, { loading, ok, failed }) -> a
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) {
    throw new TypeError(\`match is missing a handler for: \${missing.join(', ')}\`)
  }
  return handlers[state.type](state)
}
`,
      broken: [
        // No exhaustiveness check, so a forgotten case silently returns undefined.
        `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })
const match = (state, handlers) => handlers[state.type](state)
`,
        // Checks that handlers exist, but then always runs the first one.
        `const Loading = () => ({ type: 'loading' })
const Ok = (data) => ({ type: 'ok', data })
const Failed = (error) => ({ type: 'failed', error })
const CASES = ['loading', 'ok', 'failed']
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) throw new TypeError('missing handler')
  return handlers.loading(state)
}
`,
        // Constructors do not carry their payload.
        `const Loading = () => ({ type: 'loading' })
const Ok = () => ({ type: 'ok' })
const Failed = () => ({ type: 'failed' })
const CASES = ['loading', 'ok', 'failed']
const match = (state, handlers) => {
  const missing = CASES.filter((c) => typeof handlers[c] !== 'function')
  if (missing.length) throw new TypeError('missing handler')
  return handlers[state.type](state)
}
`,
      ],
      checks: (T, exp) => {
        const Loading = exp.Loading as () => any;
        const Ok = exp.Ok as (d: any) => any;
        const Failed = exp.Failed as (e: any) => any;
        const match = exp.match as (s: any, h: Record<string, (s: any) => any>) => any;

        const handlers = {
          loading: () => 'still loading',
          ok: (s: any) => `got ${s.data}`,
          failed: (s: any) => `failed: ${s.error}`,
        };

        T.check('Each constructor tags its value', () => {
          const tags = [Loading().type, Ok(1).type, Failed('e').type];
          return (
            T.eq(tags, ['loading', 'ok', 'failed']) ||
            `The tags were ${T.fmt(tags)}. Each case needs a tag so match can tell them apart.`
          );
        });

        T.check('Ok and Failed carry their payload', () => {
          const ok = Ok('data');
          const failed = Failed('boom');
          if (ok.data !== 'data') return `Ok("data") lost its payload: ${T.fmt(ok)}`;
          return failed.error === 'boom' || `Failed("boom") lost its payload: ${T.fmt(failed)}`;
        });

        T.check('match runs the branch that matches', () => {
          const results = [match(Loading(), handlers), match(Ok(42), handlers), match(Failed('x'), handlers)];
          return (
            T.eq(results, ['still loading', 'got 42', 'failed: x']) ||
            `Got ${T.fmt(results)}. Each state should reach its own branch.`
          );
        });

        T.check('A missing handler throws rather than returning nothing', () => {
          try {
            match(Ok(1), { loading: () => 'l', ok: (s: any) => s.data } as any);
            return 'A match with no handler for "failed" was allowed. A silent undefined is exactly what exhaustiveness is meant to prevent.';
          } catch {
            return true;
          }
        });

        T.check('The error names the case that was forgotten', () => {
          try {
            match(Loading(), { loading: () => 'l', ok: () => 'o' } as any);
            return 'No error was thrown.';
          } catch (e) {
            const message = (e as Error).message ?? '';
            return /failed/.test(message) || `The message was ${T.fmt(message)}. Name the missing case.`;
          }
        });

        T.check('A complete match never throws', () => {
          try {
            match(Failed('e'), handlers);
            return true;
          } catch (e) {
            return `A match with all three handlers threw: ${(e as Error).message}`;
          }
        });
      },
    },

    {
      id: 'recognize',
      covers: ['recognize', 'one-of-several'],
      kind: 'choice',
      role: 'recognize',
      multi: true,
      title: 'Which of these are sum types?',
      prompt: 'A sum type is "one of these". Select every example.',
      options: [
        {
          code: '// Either e a  is Left e or Right a',
          correct: true,
          why: 'Exactly two shapes, and a value is one of them.',
        },
        {
          code: '// { x :: Number, y :: Number }',
          correct: false,
          why: 'A point has an x AND a y. That is a product.',
        },
        {
          code: '// Option a  is Some a or None',
          correct: true,
          why: 'One of two shapes again.',
        },
        {
          code: '// Boolean  is true or false',
          correct: true,
          why: 'The smallest interesting sum type: two shapes, neither carrying anything.',
        },
        {
          code: '// [a]  a list of values',
          correct: true,
          why: 'Empty or a head followed by a tail. A list is a sum type that happens to be recursive.',
        },
      ],
    },

    {
      id: 'typed',
      kind: 'code',
      role: 'implement',
      lang: 'ts',
      covers: ['one-of-several', 'exhaustive-match', 'typed-signature'],
      title: "Match on Status exhaustively",
      prompt:
        "The union is given. Write `assertNever` and `render` so every case is handled and an unexpected tag is loud rather than silent.",
      hints: [
        "`assertNever` takes a `never` and throws. Its whole job is to be uncallable once every case is handled.",
        "Handle all three tags, then call `assertNever` in the default branch with the value itself.",
        "Reaching the default branch at runtime means something got past the type, so it should throw, not return.",
      ],
      exports: ['render', 'assertNever'],
      starter: `type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }

const assertNever = (x: never): never => {
  return undefined as never
}

const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    default: return ''
  }
}
`,
      solution: `type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }

const assertNever = (x: never): never => {
  throw new Error('unhandled case: ' + JSON.stringify(x))
}

const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    case 'ok': return s.data
    case 'failed': return s.reason
    default: return assertNever(s)
  }
}
`,
      broken: [
        `type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }

const assertNever = (x: never): never => {
  return undefined as never
}

const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    case 'ok': return s.data
    case 'failed': return s.reason
    default: return assertNever(s)
  }
}
`,
        `type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }

const assertNever = (x: never): never => {
  throw new Error('unhandled case: ' + JSON.stringify(x))
}

const render = (s: Status): string => {
  switch (s.tag) {
    case 'loading': return 'spinner'
    case 'ok': return s.data
    default: return ''
  }
}
`,
        `type Status =
  | { tag: 'loading' }
  | { tag: 'ok', data: string }
  | { tag: 'failed', reason: string }

const assertNever = (x: never): never => {
  throw new Error('unhandled case: ' + JSON.stringify(x))
}

const render = (s: Status): string => {
  const o = s as { tag: string, data?: string, reason?: string }
  return o.data || o.reason || 'spinner'
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
        const { render, assertNever } = exp;

        T.check('The loading case renders', () => {
          const r = render({ tag: 'loading' });
          return r === 'spinner' || `The loading case gave ${T.fmt(r)}.`;
        });

        T.check('The ok case reads its own field', () => {
          const r = render({ tag: 'ok', data: 'payload' });
          return r === 'payload' || `The ok case gave ${T.fmt(r)}. Only that branch has a \`data\` field.`;
        });

        T.check('The failed case reads its own field', () => {
          const r = render({ tag: 'failed', reason: 'timeout' });
          return r === 'timeout' || `The failed case gave ${T.fmt(r)}.`;
        });

        T.check('The three cases are told apart by the tag, not by which fields are set', () => {
          const r = render({ tag: 'ok', data: '' });
          return (
            r === '' ||
            `An ok carrying an empty string gave ${T.fmt(r)}. Falling through on a falsy field means the tag is not what decided.`
          );
        });

        T.check('assertNever throws rather than returning', () => {
          let threw = false;
          try {
            assertNever({ tag: 'surprise' } as never);
          } catch {
            threw = true;
          }
          return (
            threw ||
            'assertNever returned instead of throwing. Reaching it means a value got past the type, and silence is the outcome the whole pattern exists to avoid.'
          );
        });

        T.check('A tag that should not exist is loud, not silent', () => {
          let threw = false;
          let got: unknown;
          try {
            got = render({ tag: 'cancelled' } as never);
          } catch {
            threw = true;
          }
          return (
            threw ||
            `An unknown tag rendered as ${T.fmt(got)} instead of throwing. The default branch is the one that catches a case nobody handled.`
          );
        });

        T.check('The default branch goes through assertNever', () => {
          return (
            /default\s*:[\s\S]{0,60}assertNever/.test(T.src) ||
            'The default branch does not call assertNever. That call is what makes the compiler point at this switch when a fourth case is added to Status.'
          );
        });

        T.check('Every case is spelled out rather than lumped together', () => {
          for (const tag of ['loading', 'ok', 'failed']) {
            if (!new RegExp("case\\s*'" + tag + "'").test(T.src)) {
              return `There is no \`case '${tag}'\` in the switch. Exhaustiveness only means something when each case is written down.`;
            }
          }
          return true;
        });
      },
    },
  ],
};
