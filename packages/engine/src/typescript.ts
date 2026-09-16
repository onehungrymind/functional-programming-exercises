import { transform } from 'sucrase';

/**
 * Erases TypeScript types so the learner's code can run.
 *
 * A typed rung gives the learner an interface and asks them to satisfy it. Checking that
 * their *annotations* are correct would mean shipping the TypeScript compiler, which is
 * around 1.5MB gzip once the lib files are counted. Erasure plus the existing runtime checks
 * costs 61KB, and for these exercises the interface is supplied anyway, so the knowledge
 * being tested is reading a signature and building something that satisfies it.
 *
 * Erasure keeps line and column positions, so a syntax error still points where the learner
 * is looking.
 */
export function stripTypes(source: string): { code: string } | { error: string } {
  try {
    return { code: transform(source, { transforms: ['typescript'] }).code };
  } catch (e) {
    const err = e as Error;
    // Sucrase reports the position the way a parser does; keep its wording, drop its prefix.
    return { error: err.message.replace(/^Error: /, '') };
  }
}

/**
 * A crude guard against answering a typed rung with `any` everywhere.
 *
 * It is a heuristic, not a type checker: it looks for `any` in annotation position in the
 * source text. That is the right weight for what it defends against, which is gaming rather
 * than genuine error.
 */
export function usesAny(source: string): boolean {
  const withoutStrings = source
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  return /(:\s*any\b)|(\bas\s+any\b)|(<\s*any\s*>)/.test(withoutStrings);
}
