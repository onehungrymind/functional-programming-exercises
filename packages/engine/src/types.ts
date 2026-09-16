/** The shapes an exercise is written in, and the shapes a run reports back. */

export type RungKind = 'choice' | 'expr' | 'code' | 'reveal';
export type RungRole = 'recognize' | 'guided' | 'implement' | 'break' | 'apply' | 'articulate';

export interface BaseRung {
  /** Stable, url-safe, unique within the set. It ends up in the hash route. */
  id: string;
  role: RungRole;
  /** Sentence case, imperative or a question. */
  title: string;
  /** Markdown. Internal `#term` links are routed in-app. */
  prompt: string;
  /** Revealed one at a time, before the solution. */
  hints?: string[];
}

export interface ChoiceOption {
  code: string;
  correct: boolean;
  /** Shown after answering, whether or not it was picked. */
  why: string;
}

export interface ChoiceRung extends BaseRung {
  kind: 'choice';
  multi: boolean;
  options: ChoiceOption[];
}

export interface ExprRung extends BaseRung {
  kind: 'expr';
  /** Read-only code shown above the input. */
  context?: string;
  /** Deep-compared against the evaluated expression. */
  expect: unknown;
}

export interface CodeRung extends BaseRung {
  kind: 'code';
  starter: string;
  /** Must pass. Enforced by `npm run verify`. */
  solution: string;
  /** Each must fail. Each should encode a real misconception. */
  broken: string[];
  /** Top-level bindings the checks need out of the learner's code. */
  exports: string[];
  checks: (api: Harness, exp: Record<string, any>) => void;
  /**
   * UI framing for a "break it" rung. The checks themselves express the inversion
   * (a check passes when it catches a law failing), so the engine does not flip results.
   */
  inverted?: boolean;
  timeoutMs?: number;
}

export interface RevealRung extends BaseRung {
  kind: 'reveal';
  reference: string;
}

export type Rung = ChoiceRung | ExprRung | CodeRung | RevealRung;

export interface ExerciseSet {
  /** Must exist in data/jargons.json. Enforced by `npm run verify`. */
  termId: string;
  rungs: Rung[];
}

// ---------------------------------------------------------------- results

export interface CheckResult {
  name: string;
  ok: boolean;
  /** On failure, what went wrong and the counterexample. On a passing law, the case count. */
  detail?: string;
  /** Law checks only. */
  runs?: number;
}

export interface RunResult {
  seq: number;
  results: CheckResult[];
  logs: string[];
  /** Set when nothing could be graded at all: a syntax error, a missing export, a timeout. */
  fatal?: string;
  /** Wall-clock milliseconds from request to reply, filled in by the runner. */
  elapsedMs?: number;
}

// ---------------------------------------------------------------- generators

/** A generated function carries its source text so counterexamples read as `x => x * 2`. */
export interface LabelledFn<A = number, B = number> {
  name: string;
  f: (a: A) => B;
}

export interface Gen {
  int(): number;
  /** Small non-negative, for sizes and indices. */
  nat(): number;
  str(): string;
  bool(): boolean;
  /** An array of ints, length 0 to 6. */
  ints(): number[];
  /** A labelled number -> number function. */
  fn(): LabelledFn;
  /** A labelled number -> boolean predicate. */
  pred(): LabelledFn<number, boolean>;
  /** Pick one of the given values. */
  oneOf<T>(xs: readonly T[]): T;
}

// ---------------------------------------------------------------- harness

export interface ShapeRules {
  /** The initializer is not a function and introduces no parameters at its top level. */
  isPointFree(binding: string): true | string;
  /** The initializer is a chain of single-parameter arrows at the syntax level. */
  isCurried(binding: string, depth?: number): true | string;
  /** No assignment to member expressions, no calls to known mutators on parameters. */
  noMutation(binding: string): true | string;
  /** For "compose it from these pieces" rungs. */
  usesOnly(binding: string, allowed: string[]): true | string;
  /** For recursion-scheme rungs. */
  noLoops(binding: string): true | string;
}

export interface Harness {
  /** Example-based. Return `true`/`undefined` to pass, or a string explaining the failure. */
  check(name: string, fn: () => true | string | void): void;
  /** Property-based. `prop` gets the generators and returns `true` or a failure string. */
  law(name: string, runs: number, prop: (g: Gen) => true | string): boolean;
  /** Structural equality. Ignores function-valued keys so containers compare by contents. */
  eq(a: unknown, b: unknown): boolean;
  /** Renders a value for a failure message. Uses `inspect()` when the value has one. */
  fmt(v: unknown): string;
  freeze<T>(v: T): T;
  clone<T>(v: T): T;
  /** Impure calls spied since the last reset: `Date.now()`, `Math.random()`, `performance.now()`. */
  effects: string[];
  spyFn<F extends (...args: any[]) => any>(f: F): F & { calls: unknown[][] };
  G: Gen;
  /** The learner's source, for shape rules. */
  src: string;
  shape: ShapeRules;
}

// ---------------------------------------------------------------- protocol

export interface RunRequest {
  seq: number;
  termId: string;
  rungId: string;
  code: string;
}

export type RunResponse = RunResult;

/** How the worker finds a rung's checks without any function crossing the message boundary. */
export type CheckLookup = (termId: string, rungId: string) => CodeRung | undefined;
