import type { CodeRung, ExerciseSet } from '@fpx/engine/types';

// Core Functions
import { arity } from './terms/arity.js';
import { closure } from './terms/closure.js';
import { functionTerm } from './terms/function.js';
import { higherOrderFunctions } from './terms/higher-order-functions-hof.js';
import { lambda } from './terms/lambda.js';
import { partialFunction } from './terms/partial-function.js';
import { predicate } from './terms/predicate.js';
import { pureFunction } from './terms/pure-function.js';
import { thunk } from './terms/thunk.js';
import { totalFunction } from './terms/total-function.js';
import { trampoline } from './terms/trampoline.js';

// Composition & Flow
import { algebraicEffects } from './terms/algebraic-effects.js';
import { autoCurrying } from './terms/auto-currying.js';
import { continuation } from './terms/continuation.js';
import { currying } from './terms/currying.js';
import { functionComposition } from './terms/function-composition.js';
import { functionalCombinator } from './terms/functional-combinator.js';
import { io } from './terms/io.js';
import { lazyEvaluation } from './terms/lazy-evaluation.js';
import { partialApplication } from './terms/partial-application.js';
import { pointFreeStyle } from './terms/point-free-style.js';

// Purity & Reasoning
import { constant } from './terms/constant.js';
import { constantFunction } from './terms/constant-function.js';
import { contracts } from './terms/contracts.js';
import { equationalReasoning } from './terms/equational-reasoning.js';
import { idempotence } from './terms/idempotence.js';
import { memoization } from './terms/memoization.js';
import { referentialTransparency } from './terms/referential-transparency.js';
import { sideEffects } from './terms/side-effects.js';
import { value } from './terms/value.js';

// Algebraic Structures
import { functor } from './terms/functor.js';

/** Every set, in curriculum order. The order drives the "next concept" suggestion. */
const ALL: ExerciseSet[] = [
  // Core Functions
  functionTerm,
  arity,
  lambda,
  higherOrderFunctions,
  closure,
  predicate,
  pureFunction,
  thunk,
  partialFunction,
  totalFunction,
  trampoline,
  // Composition & Flow
  partialApplication,
  currying,
  autoCurrying,
  functionComposition,
  pointFreeStyle,
  functionalCombinator,
  continuation,
  lazyEvaluation,
  io,
  algebraicEffects,
  // Purity & Reasoning
  sideEffects,
  value,
  constant,
  constantFunction,
  referentialTransparency,
  equationalReasoning,
  idempotence,
  memoization,
  contracts,
  // Algebraic Structures
  functor,
];

/**
 * Every exercise set, keyed by the exact term id from data/jargons.json.
 * `npm run verify` fails on an id that is not in the snapshot.
 */
export const exerciseSets: Record<string, ExerciseSet> = Object.fromEntries(
  ALL.map((set) => [set.termId, set]),
);

export const getExerciseSet = (termId: string): ExerciseSet | undefined => exerciseSets[termId];

export const hasExercises = (termId: string): boolean => termId in exerciseSets;

/** Term ids with exercises, in the order the graph should suggest them. */
export const exerciseTermIds: string[] = ALL.map((s) => s.termId);

/** The lookup the worker uses, so no check function ever crosses a message boundary. */
export const lookupCodeRung = (termId: string, rungId: string): CodeRung | undefined => {
  const rung = exerciseSets[termId]?.rungs.find((r) => r.id === rungId);
  return rung?.kind === 'code' ? rung : undefined;
};
