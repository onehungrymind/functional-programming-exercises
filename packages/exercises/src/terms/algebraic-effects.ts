import type { ExerciseSet } from '@fpx/engine/types';

export const algebraicEffects: ExerciseSet = {
  termId: 'algebraic-effects',
  rubric: [
    {
      id: 'ask-do-not-do',
      statement:
        "Knows the program states what it needs rather than how to get it, and carries no knowledge of the handler.",
    },
    {
      id: 'drive-it',
      statement:
        "Can write the interpreter that answers each request and feeds the answer back so the program can continue.",
    },
    {
      id: 'swap-handlers',
      statement:
        "Can run one program under two handlers and get different behaviour without touching the program.",
    },
  ],
  notes: `A program written with algebraic effects **asks** rather than **does**. It yields a request and
waits; something else decides how to answer.

\`\`\`js
function* greeting() {
  const name = yield { type: 'ask_config', key: 'name' }
  yield { type: 'log', message: \`greeting \${name}\` }
  return \`Hello, \${name}\`
}
\`\`\`

Nothing in there says where the name comes from or what logging means. The interpreter drives
it, answering each request and **feeding the answer back**:

\`\`\`js
const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    const request = step.value
    step = it.next(handlers[request.type](request))
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ without this the program sees undefined
  }
  return step.value
}
\`\`\`

The payoff is that one program runs two ways, with no change to the program:

\`\`\`js
run(greeting, {
  ask_config: (r) => config[r.key],
  log: (r) => console.log(r.message)
})   // 'Hello, ada'

run(greeting, {
  ask_config: () => 'test',
  log: () => {}
})   // 'Hi, test'   no config, no console, no mocking
\`\`\`

It works because a generator hands you the [continuation](#continuation) as a value. Once the
rest of the program is a thing you hold, you can resume it with whatever you like, or not at
all.`,
  rungs: [
    {
      id: 'implement',
      covers: ['drive-it', 'swap-handlers'],
      kind: 'code',
      role: 'implement',
      title: 'Write the handler',
      prompt:
        'A program written with algebraic effects asks for what it needs and lets someone else decide how to provide it. Write `run`, which drives a generator by answering each request it yields.',
      hints: [
        'The generator yields a request like `{ type: "ask", key: "url" }` and waits for an answer.',
        'Look the request type up in `handlers`, call it, and feed the answer back in with `it.next(answer)`.',
        'Stop when the generator reports it is done, and hand back its return value.',
      ],
      exports: ['run'],
      starter: `// run :: (Generator, { [String]: (payload -> a) }) -> b
const run = (gen, handlers) => {
  // drive the generator, answering each request from handlers
}
`,
      solution: `// run :: (Generator, { [String]: (payload -> a) }) -> b
const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    const request = step.value
    const handler = handlers[request.type]
    if (!handler) throw new Error(\`No handler for \${request.type}\`)
    step = it.next(handler(request))
  }
  return step.value
}
`,
      broken: [
        // Never feeds the answer back, so the program sees undefined at every step.
        `const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  while (!step.done) {
    handlers[step.value.type](step.value)
    step = it.next()
  }
  return step.value
}
`,
        // Handles one request and gives up.
        `const run = (gen, handlers) => {
  const it = gen()
  const step = it.next()
  if (step.done) return step.value
  return it.next(handlers[step.value.type](step.value)).value
}
`,
        // Returns the last answer instead of what the program returned.
        `const run = (gen, handlers) => {
  const it = gen()
  let step = it.next()
  let last
  while (!step.done) {
    last = handlers[step.value.type](step.value)
    step = it.next(last)
  }
  return last
}
`,
      ],
      checks: (T, exp) => {
        const run = exp.run as (gen: () => Generator<any, any, any>, handlers: Record<string, (r: any) => any>) => any;

        const ask = (key: string) => ({ type: 'ask_config', key });
        const log = (message: string) => ({ type: 'log', message });

        function* greeting(): Generator<any, string, any> {
          const name = yield ask('name');
          yield log(`greeting ${name}`);
          const greeting = yield ask('greeting');
          return `${greeting}, ${name}`;
        }

        const config: Record<string, string> = { name: 'ada', greeting: 'Hello' };
        const baseHandlers = () => {
          const logged: string[] = [];
          return {
            logged,
            handlers: {
              ask_config: (r: any) => config[r.key],
              log: (r: any) => {
                logged.push(r.message);
              },
            },
          };
        };

        T.check('The answers reach the program', () => {
          const { handlers } = baseHandlers();
          const r = run(greeting, handlers);
          return (
            r === 'Hello, ada' ||
            `Got ${T.fmt(r)}, expected "Hello, ada". Each answer has to be fed back in with it.next(answer), or the program sees undefined.`
          );
        });

        T.check('Every request is handled, not just the first', () => {
          const { logged, handlers } = baseHandlers();
          run(greeting, handlers);
          return (
            T.eq(logged, ['greeting ada']) ||
            `The log handler saw ${T.fmt(logged)}. Keep driving until the generator reports done.`
          );
        });

        T.check('The program’s return value comes back, not the last answer', () => {
          function* answersThenReturns(): Generator<any, string, any> {
            yield ask('name');
            return 'the return value';
          }
          const { handlers } = baseHandlers();
          const r = run(answersThenReturns, handlers);
          return r === 'the return value' || `Got ${T.fmt(r)}. Hand back what the program returned.`;
        });

        T.check('A program that asks for nothing still works', () => {
          function* pure(): Generator<any, number, any> {
            return 7;
          }
          const { handlers } = baseHandlers();
          const r = run(pure, handlers);
          return r === 7 || `Got ${T.fmt(r)}`;
        });

        T.check('Swapping the handlers changes the result without touching the program', () => {
          const { handlers } = baseHandlers();
          const real = run(greeting, handlers);

          const testConfig: Record<string, string> = { name: 'test', greeting: 'Hi' };
          const testHandlers = {
            ask_config: (r: any) => testConfig[r.key],
            log: () => {},
          };
          const fake = run(greeting, testHandlers);

          return (
            (real === 'Hello, ada' && fake === 'Hi, test') ||
            `The same program gave ${T.fmt(real)} under one set of handlers and ${T.fmt(fake)} under another. Expected "Hello, ada" and "Hi, test".`
          );
        });

        T.check('Effects happen in the order the program asks for them', () => {
          const seen: string[] = [];
          function* ordered(): Generator<any, void, any> {
            yield log('first');
            yield log('second');
            yield log('third');
          }
          run(ordered, { log: (r: any) => seen.push(r.message) });
          return T.eq(seen, ['first', 'second', 'third']) || `The handler saw ${T.fmt(seen)}.`;
        });
      },
    },

    {
      id: 'recognize',
      covers: ['ask-do-not-do'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does the program know?',
      prompt:
        'A program written with algebraic effects yields `{ type: "ask_config", key: "url" }`. What does it know about where the answer comes from?',
      options: [
        {
          code: '// Nothing. It states what it needs and something else decides how to supply it',
          correct: true,
          why: 'Separating the request from the interpretation is the whole idea. The same program runs against a real config or a fake one.',
        },
        {
          code: '// That the answer comes from a file on disk',
          correct: false,
          why: 'If the program knew that, swapping in a test handler would mean rewriting it.',
        },
        {
          code: '// That the handler is asynchronous',
          correct: false,
          why: 'Also a handler concern. The program just asks and waits to be resumed.',
        },
        {
          code: '// That there is exactly one handler for it',
          correct: false,
          why: 'Any number of handlers can interpret the same request differently.',
        },
      ],
    },
  ],
};
