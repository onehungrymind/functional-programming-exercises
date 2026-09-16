import type { CodeRung, ExerciseSet } from '@fpx/engine/types';
import { currying } from './terms/currying.js';
import { functor } from './terms/functor.js';
import { pureFunction } from './terms/pure-function.js';

/**
 * Every exercise set, keyed by the exact term id from data/jargons.json.
 * `npm run verify` fails on an id that is not in the snapshot.
 */
export const exerciseSets: Record<string, ExerciseSet> = Object.fromEntries(
  [currying, pureFunction, functor].map((set) => [set.termId, set]),
);

export const getExerciseSet = (termId: string): ExerciseSet | undefined => exerciseSets[termId];

export const hasExercises = (termId: string): boolean => termId in exerciseSets;

/** Term ids with exercises, in the order the graph should suggest them. */
export const exerciseTermIds: string[] = Object.keys(exerciseSets);

/** The lookup the worker uses, so no check function ever crosses a message boundary. */
export const lookupCodeRung = (termId: string, rungId: string): CodeRung | undefined => {
  const rung = exerciseSets[termId]?.rungs.find((r) => r.id === rungId);
  return rung?.kind === 'code' ? rung : undefined;
};

export { currying, pureFunction, functor };
