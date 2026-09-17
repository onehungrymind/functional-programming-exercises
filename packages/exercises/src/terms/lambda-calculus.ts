import type { ExerciseSet } from '@fpx/engine/types';

export const lambdaCalculus: ExerciseSet = {
  termId: 'lambda-calculus',
  rubric: [
    {
      id: 'three-rules',
      statement:
        "Knows the whole system is variables, abstraction and application, and that numbers and conditionals are encoded rather than built in.",
    },
    {
      id: 'church-numerals',
      statement:
        "Can read a Church numeral as \"apply f this many times\" and build succ and add from that reading.",
    },
    {
      id: 'escape-hatch',
      statement:
        "Knows where the encoding meets real values, and that only the conversion back needs a real number.",
    },
  ],
  notes: `The untyped lambda calculus has three things and no more: **variables**, **abstraction**
(making a function), and **application** (calling one). No numbers, no booleans, no conditionals,
no recursion. Everything else is encoded.

A Church numeral encodes **n** as "apply f n times":

\`\`\`js
const zero  = (f) => (x) => x            // not at all
const one   = (f) => (x) => f(x)         // once
const two   = (f) => (x) => f(f(x))      // twice
\`\`\`

Once you read it that way, the rest follows. \`succ\` applies f one more time than n does:

\`\`\`js
const succ = (n) => (f) => (x) => f(n(f)(x))
\`\`\`

And \`add\` applies m's worth on top of n's worth:

\`\`\`js
const add = (m) => (n) => (f) => (x) => m(f)(n(f)(x))
\`\`\`

Notice what is absent: no \`+\`, no digit, nothing but functions calling functions. The only
place a real number appears is the escape hatch back to JavaScript:

\`\`\`js
const toInt = (n) => n((k) => k + 1)(0)   // run the numeral with "add one", starting at 0

toInt(zero)                    // 0
toInt(succ(succ(zero)))        // 2
toInt(add(two)(two))           // 4
\`\`\`

You can watch the encoding work by giving it a function that is not arithmetic at all:

\`\`\`js
add(two)(one)((s) => s + '!')('')   // '!!!'   applied three times
\`\`\`

Booleans, pairs, lists and recursion all encode the same way, which is the point: three rules
are enough to express any computation at all.`,
  rungs: [
    {
      id: 'guided',
      covers: ['church-numerals', 'escape-hatch'],
      kind: 'code',
      role: 'guided',
      title: 'Numbers made only of functions',
      prompt:
        'A Church numeral is a number encoded as "apply this function n times". Build `zero`, `succ`, `add`, and `toInt` with nothing but functions.',
      hints: [
        '`zero` applies f no times: `(f) => (x) => x`. `one` applies it once.',
        '`succ(n)` applies f once more than n does: `(f) => (x) => f(n(f)(x))`.',
        '`toInt` is the escape hatch: run the numeral with "add one" and a starting point of 0.',
      ],
      exports: ['zero', 'succ', 'add', 'toInt'],
      starter: `// zero :: Church  applies f zero times
const zero = (f) => (x) => {
}

// succ :: Church -> Church  applies f once more
const succ = (n) => (f) => (x) => {
}

// add :: Church -> Church -> Church
const add = (m) => (n) => (f) => (x) => {
}

// toInt :: Church -> Number
const toInt = (n) => {
}
`,
      solution: `// zero :: Church  applies f zero times
const zero = (f) => (x) => x

// succ :: Church -> Church  applies f once more
const succ = (n) => (f) => (x) => f(n(f)(x))

// add :: Church -> Church -> Church
const add = (m) => (n) => (f) => (x) => m(f)(n(f)(x))

// toInt :: Church -> Number
const toInt = (n) => n((k) => k + 1)(0)
`,
      broken: [
        // zero applies f once, so every numeral is off by one.
        `const zero = (f) => (x) => f(x)
const succ = (n) => (f) => (x) => f(n(f)(x))
const add = (m) => (n) => (f) => (x) => m(f)(n(f)(x))
const toInt = (n) => n((k) => k + 1)(0)
`,
        // add applies only one of the two numerals.
        `const zero = (f) => (x) => x
const succ = (n) => (f) => (x) => f(n(f)(x))
const add = (m) => (n) => (f) => (x) => m(f)(x)
const toInt = (n) => n((k) => k + 1)(0)
`,
        // succ applies f before the numeral rather than composing properly.
        `const zero = (f) => (x) => x
const succ = (n) => (f) => (x) => n(f)(x) + 1
const add = (m) => (n) => (f) => (x) => m(f)(n(f)(x))
const toInt = (n) => n((k) => k + 1)(0)
`,
      ],
      checks: (T, exp) => {
        type Church = (f: (x: any) => any) => (x: any) => any;
        const zero = exp.zero as Church;
        const succ = exp.succ as (n: Church) => Church;
        const add = exp.add as (m: Church) => (n: Church) => Church;
        const toInt = exp.toInt as (n: Church) => number;

        const church = (k: number): Church => {
          let c = zero;
          for (let i = 0; i < k; i++) c = succ(c);
          return c;
        };

        T.check('zero applies the function no times', () => {
          const spy = T.spyFn((x: number) => x + 1);
          const r = zero(spy)('start');
          if (spy.calls.length !== 0) return `zero applied the function ${spy.calls.length} time(s). Zero means not at all.`;
          return r === 'start' || `zero gave back ${T.fmt(r)} instead of the starting value.`;
        });

        T.check('toInt(zero) is 0', () => {
          const r = toInt(zero);
          return r === 0 || `Got ${T.fmt(r)}`;
        });

        T.check('succ counts up', () => {
          const got = [0, 1, 2, 3].map((k) => toInt(church(k)));
          return T.eq(got, [0, 1, 2, 3]) || `The first four numerals came out as ${T.fmt(got)}.`;
        });

        T.check('A numeral applies its function exactly that many times', () => {
          const spy = T.spyFn((x: number) => x + 1);
          church(3)(spy)(0);
          return spy.calls.length === 3 || `The numeral for 3 applied the function ${spy.calls.length} times.`;
        });

        T.check('add combines two numerals', () => {
          const r = toInt(add(church(2))(church(3)));
          return r === 5 || `add(2)(3) came to ${T.fmt(r)}. Both numerals have to apply their function.`;
        });

        T.check('Adding zero changes nothing', () => {
          const left = toInt(add(zero)(church(4)));
          const right = toInt(add(church(4))(zero));
          return (
            left === 4 && right === 4 ||
            `Adding zero on the left gave ${T.fmt(left)} and on the right gave ${T.fmt(right)}, expected 4 for both.`
          );
        });

        T.law('add agrees with ordinary addition', 40, (G) => {
          const a = G.nat() % 6;
          const b = G.nat() % 6;
          const r = toInt(add(church(a))(church(b)));
          return r === a + b || `add(${a})(${b}) came to ${T.fmt(r)}, expected ${a + b}.`;
        });

        T.check('Everything is built from functions alone', () => {
          const numbers = T.src.match(/=>\s*[\s\S]{0,40}?[^\w.]\d+/g) ?? [];
          // toInt is allowed its 0 and its + 1: that is the boundary back to real numbers.
          const outsideToInt = T.src.split('const toInt')[0] ?? '';
          const stray = outsideToInt.match(/[^\w.'"]\d+/g) ?? [];
          void numbers;
          return (
            stray.length === 0 ||
            `zero, succ, and add mention the numbers ${stray.map((s) => s.trim()).join(', ')}. A Church numeral is made of functions; only toInt should touch a real number.`
          );
        });
      },
    },

    {
      id: 'recognize',
      covers: ['three-rules'],
      kind: 'choice',
      role: 'recognize',
      multi: false,
      title: 'What is the lambda calculus made of?',
      prompt: 'Pick the complete list of what the untyped lambda calculus has.',
      options: [
        {
          code: '// Variables, abstraction (\\x. body), and application (f x)',
          correct: true,
          why: 'Three rules, and everything else, numbers included, is built out of them.',
        },
        {
          code: '// Variables, numbers, and arithmetic',
          correct: false,
          why: 'Numbers are not primitive. Church numerals encode them out of functions.',
        },
        {
          code: '// Functions, conditionals, and recursion',
          correct: false,
          why: 'Conditionals and recursion are both encodable, not built in. The Y combinator gives you recursion.',
        },
        {
          code: '// Variables, abstraction, application, and types',
          correct: false,
          why: 'The untyped version has no types at all. Types come with the typed variants.',
        },
      ],
    },

    {
      id: 'three-rules',
      kind: 'code',
      role: 'implement',
      covers: ['three-rules', 'escape-hatch'],
      title: "Name the three forms, then find the free variables",
      prompt:
        "Everything in the lambda calculus is a variable, an abstraction, or an application. Write `kindOf`, which says which, and `freeVars`, which collects the variables nothing has bound. There is no fourth case to fall back on.",
      hints: [
        "A variable is `{ v: 'x' }`. An abstraction is `{ param, body }`. An application is `{ fn, arg }`.",
        "`freeVars` on a variable is just that name. On an application it is both sides together.",
        "An abstraction binds its parameter, so remove that name from whatever its body reported.",
      ],
      exports: ['kindOf', 'freeVars'],
      starter: `// Term :: { v } | { param, body } | { fn, arg }

// kindOf :: Term -> String   'variable' | 'abstraction' | 'application'
const kindOf = (t) => 'variable'

// freeVars :: Term -> [String]   sorted, no duplicates
const freeVars = (t) => []
`,
      solution: `// Term :: { v } | { param, body } | { fn, arg }

// kindOf :: Term -> String   'variable' | 'abstraction' | 'application'
const kindOf = (t) =>
  t.v !== undefined ? 'variable' : t.param !== undefined ? 'abstraction' : 'application'

// freeVars :: Term -> [String]   sorted, no duplicates
const freeVars = (t) => {
  const walk = (node) => {
    const kind = kindOf(node)
    if (kind === 'variable') return [node.v]
    if (kind === 'abstraction') return walk(node.body).filter((n) => n !== node.param)
    return [...walk(node.fn), ...walk(node.arg)]
  }
  return [...new Set(walk(t))].sort()
}
`,
      broken: [
        `const kindOf = (t) =>
  t.v !== undefined ? 'variable' : t.param !== undefined ? 'abstraction' : 'application'
const freeVars = (t) => {
  const walk = (node) => {
    const kind = kindOf(node)
    if (kind === 'variable') return [node.v]
    if (kind === 'abstraction') return walk(node.body)
    return [...walk(node.fn), ...walk(node.arg)]
  }
  return [...new Set(walk(t))].sort()
}
`,
        `const kindOf = (t) =>
  t.v !== undefined ? 'variable' : t.fn !== undefined ? 'abstraction' : 'application'
const freeVars = (t) => {
  const walk = (node) => {
    if (node.v !== undefined) return [node.v]
    if (node.param !== undefined) return walk(node.body).filter((n) => n !== node.param)
    return [...walk(node.fn), ...walk(node.arg)]
  }
  return [...new Set(walk(t))].sort()
}
`,
        `const kindOf = (t) =>
  t.v !== undefined ? 'variable' : t.param !== undefined ? 'abstraction' : 'application'
const freeVars = (t) => {
  const walk = (node) => {
    const kind = kindOf(node)
    if (kind === 'variable') return [node.v]
    if (kind === 'abstraction') return walk(node.body).filter((n) => n !== node.param)
    return walk(node.fn)
  }
  return [...new Set(walk(t))].sort()
}
`,
      ],
      checks: (T, exp) => {
        const { kindOf, freeVars } = exp;
        const v = (name: string) => ({ v: name });
        const lam = (param: string, body: unknown) => ({ param, body });
        const app = (fn: unknown, arg: unknown) => ({ fn, arg });

        T.check('It names all three forms', () => {
          const got = [kindOf(v('x')), kindOf(lam('x', v('x'))), kindOf(app(v('f'), v('x')))];
          return (
            T.eq(got, ['variable', 'abstraction', 'application']) ||
            `It gave ${T.fmt(got)}. Those three are everything there is, which is the point of the rung.`
          );
        });

        T.check('An abstraction is not mistaken for an application', () => {
          return (
            kindOf(lam('x', v('y'))) === 'abstraction' ||
            `A lambda came back as ${T.fmt(kindOf(lam('x', v('y'))))}. It has a body, not an argument.`
          );
        });

        T.check('A lone variable is free', () => {
          return T.eq(freeVars(v('x')), ['x']) || `freeVars of a bare x gave ${T.fmt(freeVars(v('x')))}.`;
        });

        T.check('A parameter binds its own name', () => {
          const r = freeVars(lam('x', v('x')));
          return T.eq(r, []) || `The identity function reported ${T.fmt(r)} free. Its x is bound by its own parameter.`;
        });

        T.check('A name the lambda does not bind is still free', () => {
          const r = freeVars(lam('x', v('y')));
          return T.eq(r, ['y']) || `\`λx. y\` reported ${T.fmt(r)}, expected ['y'].`;
        });

        T.check('Both sides of an application are looked at', () => {
          const r = freeVars(app(v('f'), v('x')));
          return T.eq(r, ['f', 'x']) || `\`f x\` reported ${T.fmt(r)}. The function side counts too.`;
        });

        T.check('Binding reaches all the way down', () => {
          const r = freeVars(lam('x', app(v('x'), lam('y', app(v('x'), v('z'))))));
          return (
            T.eq(r, ['z']) ||
            `A nested term reported ${T.fmt(r)}, expected ['z']. Both of the inner x uses are under the outer parameter.`
          );
        });

        T.check('A name is reported once, however often it appears', () => {
          const r = freeVars(app(v('x'), app(v('x'), v('x'))));
          return T.eq(r, ['x']) || `Three uses of x reported ${T.fmt(r)}.`;
        });
      },
    },
  ],
};
