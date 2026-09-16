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

const { exerciseSets, exerciseTermIds } = await import(new URL(`file://${EXERCISES}`).href);
const { manifest } = await import(new URL(`file://${join(ROOT, 'packages/exercises/src/manifest.ts')}`).href);

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

// The shell renders the Practice tab from the generated manifest rather than from the sets,
// so that the checks and variants stay out of the initial bundle. If the two drift, the tab
// shows a count that does not match what the learner gets.
{
  const fromSets = exerciseTermIds.map((termId) => ({
    termId,
    notes: exerciseSets[termId].notes ?? null,
    rungs: exerciseSets[termId].rungs.map((r) => ({ id: r.id, role: r.role, title: r.title, kind: r.kind })),
  }));
  if (JSON.stringify(fromSets) !== JSON.stringify(manifest)) {
    note('packages/exercises/src/manifest.ts has drifted from the exercise sets. Run `npm run build:manifest`.');
  }
}

let codeRungs = 0;
let variants = 0;
const migrationOutstanding = [];
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

  // The Phase 7 exit criterion: every concept gets at least two rungs, one code-graded.
  if (set.rungs.length < 2) {
    note(`${termId}: only ${set.rungs.length} rung. Every concept needs at least two.`);
  }
  if (!set.rungs.some((r) => r.kind === 'code')) {
    note(`${termId}: no code-graded rung. Recognizing is not the same as writing it.`);
  }

  // The rubric is the specification and the rungs are its tests, so the two have to line up
  // in both directions or the traceability is decorative.
  const rubric = set.rubric ?? [];
  if (set.rubricTodo) {
    // Not yet written to the rubric model. Counted below rather than failing the run.
    migrationOutstanding.push(termId);
    if (rubric.length) note(`${termId}: has a rubric and is still marked \`rubricTodo\`.`);
  } else if (rubric.length === 0) {
    note(`${termId}: no rubric. Say what competency looks like before saying how it is tested.`);
  }
  const rubricIds = new Set(rubric.map((r) => r.id));
  if (rubricIds.size !== rubric.length) note(`${termId}: duplicate rubric item id.`);
  for (const item of rubric) {
    if (!item.statement?.trim()) note(`${termId}/${item.id}: rubric item has no statement.`);
  }

  const covered = new Set();
  for (const rung of set.rungs) {
    const covers = rung.covers ?? [];
    if (set.rubricTodo) continue;
    if (covers.length === 0) {
      note(`${termId}/${rung.id}: covers no rubric item. Either it is off-syllabus, or the rubric is missing something.`);
    }
    for (const id of covers) {
      if (!rubricIds.has(id)) note(`${termId}/${rung.id}: covers "${id}", which is not in the rubric.`);
      covered.add(id);
    }
  }
  const untested = [...rubricIds].filter((id) => !covered.has(id));
  if (untested.length) {
    note(
      `${termId}: nothing demonstrates ${untested.map((id) => `"${id}"`).join(', ')}. ` +
        `A rubric item with no rung is a claim the app never checks.`,
    );
  }

  // A rung may only ask about something Learn has covered. Upstream is a glossary, so for
  // most concepts that means this repo supplies the teaching itself. Every set has to declare
  // which case it is, so a new one cannot land without someone deciding.
  const declared = [set.notes, set.upstreamIsEnough, set.rubricTodo].filter(Boolean).length;
  if (declared === 0) {
    note(
      `${termId}: declares none of \`notes\`, \`upstreamIsEnough\`, or \`rubricTodo\`. ` +
        `A rung may only ask about something the Learn tab has covered, so say which applies.`,
    );
  } else if (declared > 1) {
    note(`${termId}: declares more than one of \`notes\`, \`upstreamIsEnough\`, and \`rubricTodo\`.`);
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
  `\n  verify passed\n  ${termCount} concepts, ${codeRungs} code rungs, ${variants} variants graded through the real harness`,
);
if (migrationOutstanding.length) {
  const done = termCount - migrationOutstanding.length;
  console.log(
    `  ${done}/${termCount} written to a competency rubric; ${migrationOutstanding.length} still marked \`rubricTodo\``,
  );
}
console.log('');
