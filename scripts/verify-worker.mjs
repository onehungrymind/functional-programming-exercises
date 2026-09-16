/**
 * Grades variants, in a worker the parent can kill.
 *
 * Exercise content is learner-facing code that is *supposed* to include broken variants, and
 * a broken variant can loop forever or spread an infinite generator into an array. In the
 * browser that is the runner's timeout; here it is the parent's, so CI can never hang.
 *
 * It stays alive across variants so the module graph is compiled once, and the parent
 * replaces it after a timeout. That is the same arrangement the browser runner uses.
 */
import { register } from 'tsx/esm/api';
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

// The loader is registered per thread, so the parent having tsx active does not help here.
register();

const { enginePath, exercisesPath } = workerData;
const { evaluateRung, didPass } = await import(pathToFileURL(enginePath).href);
const { exerciseSets } = await import(pathToFileURL(exercisesPath).href);

parentPort.postMessage({ ready: true });

parentPort.on('message', ({ seq, termId, rungId, code }) => {
  const rung = exerciseSets[termId]?.rungs.find((r) => r.id === rungId);
  if (!rung) {
    parentPort.postMessage({ seq, passed: false, fatal: `No rung ${termId}/${rungId}`, failures: [] });
    return;
  }
  const result = evaluateRung(rung, code);
  parentPort.postMessage({
    seq,
    passed: didPass(result),
    fatal: result.fatal ?? null,
    failures: result.results.filter((r) => !r.ok).map((r) => ({ name: r.name, detail: r.detail ?? null })),
  });
});
