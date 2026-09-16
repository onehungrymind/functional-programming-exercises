import type { ExerciseSet } from '@fpx/engine/types';

export const freeMonad: ExerciseSet = {
  termId: 'free-monad',
  rungs: [
    {
      id: 'apply',
      kind: 'code',
      role: 'apply',
      title: 'Add an instruction to the program',
      prompt:
        'A Free Monad turns a program into data, so the same program can be interpreted in more than one way. Add a `Read` instruction and teach both interpreters about it.',
      hints: [
        'An instruction is a plain object with a tag and a payload.',
        'The interpreter is a lookup from tag to behavior. Each one answers Read differently.',
      ],
      exports: ['Read', 'runReal', 'runTest'],
      starter: `// The program is a list of instructions, built by the constructors below.
const Write = (text) => ({ type: 'write', text })

// Read :: String -> Instruction
const Read = (key) => {
}

// runReal :: ([Instruction], Object) -> [String]
// write appends to the output; read looks the key up in store
const runReal = (program, store) => {
}

// runTest :: [Instruction] -> [String]
// write appends "WROTE: text"; read always answers "stub"
const runTest = (program) => {
}
`,
      solution: `const Write = (text) => ({ type: 'write', text })

// Read :: String -> Instruction
const Read = (key) => ({ type: 'read', key })

const interpret = (program, handlers) =>
  program.map((instruction) => handlers[instruction.type](instruction))

// runReal :: ([Instruction], Object) -> [String]
const runReal = (program, store) =>
  interpret(program, {
    write: (i) => i.text,
    read: (i) => String(store[i.key])
  })

// runTest :: [Instruction] -> [String]
const runTest = (program) =>
  interpret(program, {
    write: (i) => \`WROTE: \${i.text}\`,
    read: () => 'stub'
  })
`,
      broken: [
        // The two interpreters behave identically, so there is no point separating them.
        `const Write = (text) => ({ type: 'write', text })
const Read = (key) => ({ type: 'read', key })
const interpret = (program, handlers) => program.map((i) => handlers[i.type](i))
const runReal = (program, store) => interpret(program, { write: (i) => i.text, read: (i) => String(store[i.key]) })
const runTest = (program) => interpret(program, { write: (i) => i.text, read: (i) => 'stub' })
`,
        // Read carries no key, so the real interpreter has nothing to look up.
        `const Write = (text) => ({ type: 'write', text })
const Read = () => ({ type: 'read' })
const interpret = (program, handlers) => program.map((i) => handlers[i.type](i))
const runReal = (program, store) => interpret(program, { write: (i) => i.text, read: () => 'unknown' })
const runTest = (program) => interpret(program, { write: (i) => \`WROTE: \${i.text}\`, read: () => 'stub' })
`,
        // The interpreters drop instructions they do not recognize instead of handling them.
        `const Write = (text) => ({ type: 'write', text })
const Read = (key) => ({ type: 'read', key })
const runReal = (program, store) => program.filter((i) => i.type === 'write').map((i) => i.text)
const runTest = (program) => program.filter((i) => i.type === 'write').map((i) => \`WROTE: \${i.text}\`)
`,
      ],
      checks: (T, exp) => {
        const Read = exp.Read as (k: string) => any;
        const runReal = exp.runReal as (p: any[], s: Record<string, any>) => string[];
        const runTest = exp.runTest as (p: any[]) => string[];
        const Write = (text: string) => ({ type: 'write', text });

        const program = [Write('start'), Read('name'), Write('done')];

        T.check('Read is data, carrying the key it wants', () => {
          const r = Read('name');
          return (
            r && r.type === 'read' && r.key === 'name' ||
            `Got ${T.fmt(r)}. An instruction is a description, so it has to carry enough for an interpreter to act on it.`
          );
        });

        T.check('The real interpreter reads from the store', () => {
          const r = runReal(program, { name: 'ada' });
          return T.eq(r, ['start', 'ada', 'done']) || `Got ${T.fmt(r)}, expected ["start", "ada", "done"].`;
        });

        T.check('The test interpreter answers without a store', () => {
          const r = runTest(program);
          return (
            T.eq(r, ['WROTE: start', 'stub', 'WROTE: done']) ||
            `Got ${T.fmt(r)}, expected ["WROTE: start", "stub", "WROTE: done"].`
          );
        });

        T.check('Every instruction is handled, none dropped', () => {
          const r = runTest(program);
          return (
            r.length === program.length ||
            `Three instructions produced ${r.length} results. Filtering out the ones an interpreter does not know about hides the gap rather than closing it.`
          );
        });

        T.check('The two interpreters really do differ', () => {
          const real = runReal(program, { name: 'ada' });
          const test = runTest(program);
          return (
            !T.eq(real, test) ||
            `Both gave ${T.fmt(real)}. If the interpreters agree on everything there is no reason to have two.`
          );
        });

        T.check('The program itself is untouched by running it', () => {
          const frozen = T.freeze([Write('a'), Read('k')]);
          runTest(frozen as any[]);
          runReal(frozen as any[], { k: 'v' });
          return (
            T.eq(frozen, [
              { type: 'write', text: 'a' },
              { type: 'read', key: 'k' },
            ]) || 'Running the program changed it. A description should be reusable.'
          );
        });

        T.check('The same program runs under both without being rewritten', () => {
          // This is the whole point: one description, many interpretations.
          const p = [Read('a'), Write('x')];
          const real = runReal(p, { a: '1' });
          const test = runTest(p);
          return (
            real.length === 2 && test.length === 2 ||
            `The same program gave ${T.fmt(real)} and ${T.fmt(test)}. Both interpreters have to accept it as it is.`
          );
        });
      },
    },

    {
      id: 'recognize',
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What does "free" buy you?',
      prompt: 'Why build a program as data rather than just calling the functions?',
      options: [
        {
          code: '// The same program can be interpreted more than one way:\n// really, in a test, or logged without running at all',
          correct: true,
          why: 'Separating the description from the interpretation is the whole trade. A test interpreter needs no mocking.',
        },
        {
          code: '// It runs faster',
          correct: false,
          why: 'It runs slower. You are paying for flexibility.',
        },
        {
          code: '// It makes the instructions pure',
          correct: false,
          why: 'Building the description is pure, but the real interpreter still performs the effects. They have just moved.',
        },
        {
          code: '// It removes the need for a monad',
          correct: false,
          why: 'The opposite. It gives you a monad for free from any functor, which is where the name comes from.',
        },
      ],
    },
  ],
};
