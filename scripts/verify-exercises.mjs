#!/usr/bin/env node
/**
 * The quality gate.
 *
 * For every code rung: the solution must pass, every broken variant must fail, and the
 * starter must fail. Every termId must exist in the snapshot. Every rung id must be unique.
 *
 * Each variant is graded in a worker with a timeout and a heap cap, because a broken variant
 * is *meant* to be wrong and a wrong one can loop forever or build an endless array. CI must
 * not be able to hang on content that is doing its job.
 *
 * It grades with the same `evaluateRung` the browser runs, so a rung that passes here passes
 * there. It never reads the sibling clone: a fresh checkout of this repo alone is enough.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SNAPSHOT = join(ROOT, 'data/jargons.json');
if (!existsSync(SNAPSHOT)) {
  console.error('\n  data/jargons.json is missing. Run `npm run sync:jargons` first.\n');
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const termsById = new Map(snapshot.terms.map((t) => [t.id, t]));

const ENGINE = join(ROOT, 'packages/engine/src/index.ts');
const EXERCISES = join(ROOT, 'packages/exercises/src/index.ts');
const WORKER = join(ROOT, 'scripts/verify-worker.mjs');

const { exerciseSets } = await import(new URL(`file://${EXERCISES}`).href);

const TIMEOUT_MS = 10_000;
const MAX_HEAP_MB = 512;

/**
 * One worker, kept alive across variants so the TypeScript module graph compiles once,
 * and replaced whenever a variant hangs or exhausts its heap.
 */
let worker = null;
let seq = 0;
let pending = null;

function spawn() {
  const w = new Worker(WORKER, {
    workerData: { enginePath: ENGINE, exercisesPath: EXERCISES },
    resourceLimits: { maxOldGenerationSizeMb: MAX_HEAP_MB },
  });

  w.on('message', (msg) => {
    if (msg.ready) return;
    if (pending && msg.seq === pending.seq) pending.settle(msg);
  });

  const die = (fatal) => {
    // An out-of-memory kill lands here. For a broken variant that is a legitimate failure,
    // so report it and start a fresh worker for whatever comes next.
    if (worker === w) worker = null;
    if (pending) pending.settle({ passed: false, crashed: true, failures: [], fatal });
  };
  w.on('error', (err) => die(`${err.name}: ${err.message}`));
  w.on('exit', (code) => {
    if (code !== 0) die(`the sandbox stopped (exit code ${code})`);
  });

  return w;
}

/** Grades one variant. Never rejects: a hang comes back as a result with `timedOut`. */
function gradeInWorker(termId, rungId, code) {
  return new Promise((resolveResult) => {
    if (!worker) worker = spawn();
    const current = worker;
    const mySeq = ++seq;

    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pending = null;
      resolveResult(value);
    };

    const timer = setTimeout(() => {
      // The worker is stuck inside learner code and will never answer. Replace it.
      void current.terminate();
      if (worker === current) worker = null;
      settle({ passed: false, timedOut: true, failures: [], fatal: `did not finish in ${TIMEOUT_MS}ms` });
    }, TIMEOUT_MS);

    pending = { seq: mySeq, settle };
    current.postMessage({ seq: mySeq, termId, rungId, code });
  });
}

const problems = [];
const note = (msg) => problems.push(msg);

let codeRungs = 0;
let variants = 0;
let timeouts = 0;

const describe = (out) => {
  if (out.fatal) return out.fatal;
  if (!out.failures.length) return 'every check passed';
  return out.failures.map((f) => `${f.name}${f.detail ? ` -- ${f.detail}` : ''}`).join('\n         ');
};

for (const [termId, set] of Object.entries(exerciseSets)) {
  if (set.termId !== termId) note(`${termId}: the set's termId is "${set.termId}", which does not match its key.`);
  if (!termsById.has(termId)) {
    note(`${termId}: no term with this id exists in data/jargons.json. Upstream may have renamed it.`);
    continue;
  }
  if (termsById.get(termId).isConcept === false) {
    note(`${termId}: this is a structural section upstream, not a concept. It should not have exercises.`);
  }

  const seen = new Set();
  for (const rung of set.rungs) {
    if (seen.has(rung.id)) note(`${termId}/${rung.id}: duplicate rung id.`);
    seen.add(rung.id);

    if (rung.kind === 'choice') {
      if (!rung.options.some((o) => o.correct)) note(`${termId}/${rung.id}: no option is marked correct.`);
      if (!rung.multi && rung.options.filter((o) => o.correct).length > 1) {
        note(`${termId}/${rung.id}: single-select, but more than one option is correct.`);
      }
      if (rung.options.some((o) => !o.why?.trim())) note(`${termId}/${rung.id}: an option has no "why".`);
      continue;
    }

    if (rung.kind !== 'code') continue;
    codeRungs++;

    if (!rung.broken?.length) note(`${termId}/${rung.id}: no broken variant. Every code rung needs at least one.`);
    if (!rung.exports?.length) note(`${termId}/${rung.id}: no exports listed.`);

    // 1. The solution must pass, and must not be the thing that is slow.
    variants++;
    const solved = await gradeInWorker(termId, rung.id, rung.solution);
    if (solved.timedOut) {
      timeouts++;
      note(`${termId}/${rung.id}: the SOLUTION did not finish in ${TIMEOUT_MS}ms.`);
    } else if (!solved.passed) {
      note(`${termId}/${rung.id}: the SOLUTION does not pass.\n         ${describe(solved)}`);
    }

    // 2. The starter must fail, or the rung asks nothing.
    variants++;
    const started = await gradeInWorker(termId, rung.id, rung.starter);
    if (started.passed) {
      note(`${termId}/${rung.id}: the STARTER already passes, so the rung asks the learner for nothing.`);
    }

    // 3. Every broken variant must fail, and fail for a reason worth reading.
    for (const [i, src] of (rung.broken ?? []).entries()) {
      variants++;
      const out = await gradeInWorker(termId, rung.id, src);
      if (out.timedOut) {
        // A broken variant that loops forever does fail, but it fails the slow way. In the
        // browser the learner waits out the timeout for it, which is a poor lesson.
        timeouts++;
        note(
          `${termId}/${rung.id}: broken variant ${i + 1} never finishes. It does fail, but only by timing out. Give the checks something that catches it quickly.`,
        );
      } else if (out.passed) {
        note(`${termId}/${rung.id}: broken variant ${i + 1} PASSES, so the checks do not catch that mistake.`);
      } else if (!out.fatal && out.failures.length && out.failures.every((f) => !f.detail)) {
        note(`${termId}/${rung.id}: broken variant ${i + 1} fails with no explanation. Give the check a detail message.`);
      }
    }
  }
}

// ---------------------------------------------------------------- report

const termCount = Object.keys(exerciseSets).length;

if (problems.length) {
  await worker?.terminate();
  console.error(`\n  verify failed: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
  for (const p of problems) console.error(`   x ${p}`);
  console.error('');
  process.exit(1);
}

await worker?.terminate();

console.log(
  `\n  verify passed\n  ${termCount} concepts, ${codeRungs} code rungs, ${variants} variants graded through the real harness\n`,
);
