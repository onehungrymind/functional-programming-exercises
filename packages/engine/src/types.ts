/** The shapes an exercise is written in, and the shapes a run reports back. */

export type RungKind = 'choice' | 'expr' | 'code' | 'reveal';
export type RungRole = 'recognize' | 'guided' | 'implement' | 'break' | 'apply' | 'articulate';

/**
 * One thing a competent person can do with this concept.
 *
 * The rubric is the specification, the rungs are the tests, and the notes are the
 * implementation. A rubric item nobody is asked to demonstrate is a claim the app does not
 * check; a rung covering no rubric item is asking about something we never said mattered.
 * `npm run verify` rejects both.
 */
export interface RubricItem {
  /** Stable, referenced by the rungs that exercise it. */
  id: string;
  /**
   * What the learner can do, in their words, not the implementation's.
   * "Can predict what `fn.length` reports for any definition", not "knows about defaults".
   */
  statement: string;
}

export interface BaseRung {
  /** Stable, url-safe, unique within the set. It ends up in the hash route. */
  id: string;
  /**
   * The rubric items this rung demonstrates. At least one, and every id must exist in the
   * set's rubric. `npm run verify` checks both directions.
   */
  covers: string[];
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

/**
 * A one-line fill-in, graded by evaluating what the learner typed.
 *
 * Use it where the skill is producing a value rather than recognizing one: predicting what
 * `fn.length` reports, what folding the empty list gives, how many times something ran. A
 * multiple-choice rung can be cleared by elimination; this one cannot.
 */
export interface ExprRung extends BaseRung {
  kind: 'expr';
  /** Read-only code shown above the input, so the expression has something to refer to. */
  context?: string;
  /** Shown in the empty input. A shape, not the answer. */
  placeholder?: string;
  /** Deep-compared against the evaluated expression. */
  expect: unknown;
  /** An expression that evaluates to `expect`. Must pass. Enforced by `npm run verify`. */
  solution: string;
  /** Each must evaluate to something else. Cover the plausible wrong answers. */
  broken: string[];
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
  /**
   * What solid competency in this concept looks like, written before the rungs.
   *
   * This is the unit of success: a learner who clears every rung has demonstrated every
   * item. Upstream's glossary entry is a reference, not a syllabus, so the rubric is free
   * to go well past it.
   */
  rubric: RubricItem[];
  rungs: Rung[];
  /**
   * Teaching this repo owns, shown in Learn after the upstream entry.
   *
   * Upstream is a glossary: most entries are one sentence written for someone who already
   * knows the word. A rung may only ask about something the upstream body or these notes
   * have actually covered, so anything a rung assumes beyond the glossary goes here.
   *
   * Markdown. Internal `#term` links are routed in-app.
   */
  notes?: string;
  /**
   * Set when the upstream entry genuinely covers everything the rungs ask about, so no
   * notes are needed.
   */
  upstreamIsEnough?: true;
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
  /**
   * Console output the learner's code has produced, in order.
   *
   * Learner code is handed a fake console, so a check cannot observe printing by swapping
   * the global. Exercises about effects need to see it, so it is shared here. Empty it
   * before the call you want to measure, the way `effects` is used.
   */
  logs: string[];
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

/** How the worker finds a rung without any check function crossing the message boundary. */
export type CheckLookup = (termId: string, rungId: string) => CodeRung | ExprRung | undefined;
