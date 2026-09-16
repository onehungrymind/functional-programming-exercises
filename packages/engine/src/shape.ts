import { parse } from 'acorn';
import type { ShapeRules } from './types.js';

/**
 * Syntax-level rules, parsed with acorn.
 *
 * These exist to make a failure message precise, never to be a rung's only check.
 * A learner who satisfies every shape rule and gets the behavior wrong still fails.
 */

type Node = any;

const MUTATORS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
  'set',
  'delete',
  'add',
  'clear',
]);

function walk(node: Node, visit: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const child = node[key];
    if (Array.isArray(child)) for (const c of child) walk(c, visit);
    else walk(child, visit);
  }
}

/** The right-hand side of `const <binding> = ...`, or the function declaration itself. */
function findBinding(program: Node, name: string): { init: Node | null; node: Node } | null {
  let found: { init: Node | null; node: Node } | null = null;
  for (const stmt of program.body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id?.type === 'Identifier' && d.id.name === name) found = { init: d.init, node: d };
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id?.name === name) {
      found = { init: stmt, node: stmt };
    }
  }
  return found;
}

const isFn = (n: Node) =>
  n && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration');

export function createShapeRules(src: string): ShapeRules {
  let program: Node | null = null;
  let parseError: string | null = null;
  try {
    program = parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch (e) {
    parseError = (e as Error).message;
  }

  /** Resolves the binding, or returns the message explaining why we could not look at it. */
  const resolve = (name: string): { init: Node | null } | string => {
    if (parseError) return `Could not read your code: ${parseError}`;
    const b = findBinding(program, name);
    if (!b) return `Could not find a top-level definition of \`${name}\`.`;
    return b;
  };

  return {
    isPointFree(binding) {
      const b = resolve(binding);
      if (typeof b === 'string') return b;
      if (!b.init) return `\`${binding}\` has no initializer to look at.`;
      if (isFn(b.init)) {
        const params = b.init.params.map((p: Node) => (p.type === 'Identifier' ? p.name : '...')).join(', ');
        return `\`${binding}\` still names its argument${b.init.params.length === 1 ? '' : 's'} (${params}). Point-free means the definition is built from other functions without introducing a parameter.`;
      }
      return true;
    },

    isCurried(binding, depth = 2) {
      const b = resolve(binding);
      if (typeof b === 'string') return b;
      let node = b.init;
      for (let level = 1; level <= depth; level++) {
        if (!isFn(node)) {
          return `\`${binding}\` stops being a function after ${level - 1} argument${level - 1 === 1 ? '' : 's'}. A curried function returns a new function at every step until the last.`;
        }
        if (node.params.length !== 1) {
          return `Step ${level} of \`${binding}\` takes ${node.params.length} arguments. Each step of a curried function takes exactly one.`;
        }
        node = node.body;
        // An arrow with an expression body hands the next arrow back directly.
        if (node?.type === 'BlockStatement') {
          const ret = node.body.find((s: Node) => s.type === 'ReturnStatement');
          node = ret?.argument ?? null;
        }
      }
      return true;
    },

    noMutation(binding) {
      const b = resolve(binding);
      if (typeof b === 'string') return b;
      if (!b.init) return true;

      const params = new Set<string>();
      if (isFn(b.init)) for (const p of b.init.params) if (p.type === 'Identifier') params.add(p.name);

      // The root identifier of `a.b.c` or `a[0]`, which is what tells us a parameter was touched.
      const rootOf = (n: Node): string | null => {
        let cur = n;
        while (cur?.type === 'MemberExpression') cur = cur.object;
        return cur?.type === 'Identifier' ? cur.name : null;
      };

      let problem: string | null = null;
      walk(b.init, (n) => {
        if (problem) return;
        const target =
          n.type === 'AssignmentExpression' ? n.left : n.type === 'UpdateExpression' ? n.argument : null;
        if (target?.type === 'MemberExpression') {
          const root = rootOf(target);
          if (root && params.has(root)) {
            problem = `\`${binding}\` assigns to \`${root}\`, which was passed in. Build and return a new value instead of writing into the argument.`;
          }
        }
        if (n.type === 'CallExpression' && n.callee?.type === 'MemberExpression' && n.callee.property?.type === 'Identifier') {
          const method = n.callee.property.name;
          if (MUTATORS.has(method)) {
            const root = rootOf(n.callee.object);
            if (root && params.has(root)) {
              problem = `\`${binding}\` calls \`${root}.${method}()\`, which changes the argument in place. Return a new value instead.`;
            }
          }
        }
      });
      return problem ?? true;
    },

    usesOnly(binding, allowed) {
      const b = resolve(binding);
      if (typeof b === 'string') return b;
      if (!b.init) return true;

      const bound = new Set(allowed);
      // Anything the definition introduces itself is fair game.
      walk(b.init, (n) => {
        if (isFn(n)) for (const p of n.params) if (p.type === 'Identifier') bound.add(p.name);
        if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier') bound.add(n.id.name);
      });

      let offender: string | null = null;
      walk(b.init, (n) => {
        if (offender) return;
        if (n.type === 'MemberExpression' && !n.computed) return; // `.map` is a property, not a free name
        if (n.type === 'Identifier' && !bound.has(n.name)) offender = n.name;
      });
      return offender
        ? `\`${binding}\` uses \`${offender}\`. Build it from ${allowed.map((a) => `\`${a}\``).join(', ')} only.`
        : true;
    },

    noLoops(binding) {
      const b = resolve(binding);
      if (typeof b === 'string') return b;
      if (!b.init) return true;
      const LOOPS: Record<string, string> = {
        ForStatement: 'for',
        ForOfStatement: 'for...of',
        ForInStatement: 'for...in',
        WhileStatement: 'while',
        DoWhileStatement: 'do...while',
      };
      let found: string | null = null;
      walk(b.init, (n) => {
        if (!found && LOOPS[n.type]) found = LOOPS[n.type]!;
      });
      return found ? `\`${binding}\` uses a \`${found}\` loop. Express it with recursion instead.` : true;
    },
  };
}
