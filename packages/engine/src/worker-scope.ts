import { evaluateRung } from './evaluate.js';
import type { CheckLookup, RunRequest, RunResult } from './types.js';

/**
 * Installs the message handler inside a worker.
 *
 * The concrete worker entry lives in the exercises package, because it is the thing that
 * knows the content. It calls this with a lookup, so no check function ever has to be
 * serialized across the message boundary.
 */
export function installWorker(lookup: CheckLookup, scope: DedicatedWorkerGlobalScope = self as any): void {
  // Nothing here should reach the network. Exercises that try are a bug, not a feature,
  // and a clear throw beats a mysterious pending promise.
  const refuse = (name: string) => () => {
    throw new Error(`${name} is not available inside an exercise.`);
  };
  try {
    (scope as any).fetch = refuse('fetch');
    (scope as any).importScripts = refuse('importScripts');
    (scope as any).XMLHttpRequest = refuse('XMLHttpRequest');
  } catch {
    // A locked-down scope that will not let us stub is already doing our job for us.
  }

  scope.onmessage = (event: MessageEvent<RunRequest>) => {
    const { seq, termId, rungId, code } = event.data;

    const rung = lookup(termId, rungId);
    if (!rung) {
      const missing: RunResult = {
        seq,
        results: [],
        logs: [],
        fatal: `No checks are registered for ${termId}/${rungId}.`,
      };
      scope.postMessage(missing);
      return;
    }

    // Every check runs in this one task. Nothing yields, so learner code cannot
    // interleave with the reply, and a hang is a hang the main thread can see.
    let result: RunResult;
    try {
      result = evaluateRung(rung, code, seq);
    } catch (e) {
      const err = e as Error;
      result = { seq, results: [], logs: [], fatal: `${err.name || 'Error'}: ${err.message}` };
    }
    scope.postMessage(result);
  };
}
