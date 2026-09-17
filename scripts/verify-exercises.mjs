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
const { conceptNotes } = await import(new URL(`file://${join(ROOT, 'packages/exercises/src/notes.ts')}`).href);

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

// The shell renders from the two generated files rather than from the sets, so that the
// checks and variants stay out of the initial bundle and the prose stays out of the first
// paint. If either drifts, a learner sees a stale count or stale teaching.
{
  const fromSets = exerciseTermIds.map((termId) => ({
    termId,
    rungs: exerciseSets[termId].rungs.map((r) => ({
      id: r.id,
      role: r.role,
      title: r.title,
      kind: r.kind,
      lang: r.lang ?? 'js',
    })),
  }));
  if (JSON.stringify(fromSets) !== JSON.stringify(manifest)) {
    note('packages/exercises/src/manifest.ts has drifted from the exercise sets. Run `npm run build:manifest`.');
  }

  const notesFromSets = Object.fromEntries(
    exerciseTermIds
      .filter((termId) => exerciseSets[termId].notes || exerciseSets[termId].typedNotes)
      .map((termId) => [
        termId,
        {
          notes: exerciseSets[termId].notes ?? null,
          typedNotes: exerciseSets[termId].typedNotes ?? null,
        },
      ]),
  );
  if (JSON.stringify(notesFromSets) !== JSON.stringify(conceptNotes)) {
    note('packages/exercises/src/notes.ts has drifted from the exercise sets. Run `npm run build:manifest`.');
  }

  // Verify cannot read prose and decide whether it teaches something. What it can do is
  // notice that the words are not there at all, which is the failure that actually happened:
  // a rung asking about something Learn never covered.
  {
    const STOP = new Set(
      ('can could knows say says said able the a an and or of to in for with that this those these it its ' +
        'is are was be been being on at from by as not no any all every each some one two three what which ' +
        'when where why how than then so if but do does did doing done has have had hand hands handed name ' +
        'names named given give gives take takes taken write writes written build builds built read reads ' +
        'reading tell tells told make makes made use uses used work works working thing things something ' +
        'anything nothing you your they their them we us our also just only even still yet much many few ' +
        'several own such too very without within across along around because while until since although ' +
        'though unless whether both either neither').split(' '),
    );
    const stem = (w) => w.replace(/ies$/, 'y').replace(/(es|s)$/, '');
    const derive = (statement) => {
      const code = [...statement.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      const words = (statement.replace(/`[^`]+`/g, ' ').toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter(
        (w) => !STOP.has(w),
      );
      return [...new Set([...code, ...words])];
    };
    const appears = (prose, t) => prose.includes(t.toLowerCase()) || prose.includes(stem(t.toLowerCase()));

    for (const set of Object.values(exerciseSets)) {
      const prose = `${set.notes ?? ''}\n${set.typedNotes ?? ''}`.toLowerCase();
      if (!prose.trim()) continue;
      for (const item of set.rubric) {
        if (item.teaches?.length) {
          const missing = item.teaches.filter((t) => !appears(prose, t));
          if (missing.length) {
            note(
              `${set.termId}: the notes never mention ${missing.map((t) => `"${t}"`).join(', ')}, ` +
                `which "${item.id}" says the teaching has to cover.`,
            );
          }
          continue;
        }
        const terms = derive(item.statement);
        const hits = terms.filter((t) => appears(prose, t));
        if (hits.length < 2) {
          note(
            `${set.termId}: nothing in the notes reads like "${item.id}". ` +
              `Looked for ${terms.slice(0, 6).map((t) => `"${t}"`).join(', ')} and found ` +
              `${hits.length === 0 ? 'none of them' : `only "${hits[0]}"`}. ` +
              `Either the teaching is missing, or the statement is worded so abstractly that this ` +
              `cannot tell, in which case set \`teaches\` on the item.`,
          );
        }
      }
    }
  }

  // The prompt has to name everything the learner is being asked to write. A starter comment
  // is not enough on its own: the prompt is what they read first, and "write it and the other
  // one" is how a rung ends up unreadable. Scaffolding handed over finished is exempt, since
  // there is nothing to say about it.
  {
    /** True when the starter leaves this binding unwritten rather than handing it over done. */
    const isStub = (starter, name) => {
      const lines = starter.split('\n');
      const at = lines.findIndex((l) => new RegExp(`^\\s*(const|function\\*?)\\s+${name}\\b`).test(l));
      if (at === -1) return false;
      const rest = lines.slice(at).join('\n');
      const open = rest.indexOf('{', rest.indexOf('='));
      if (open === -1) {
        return /=\s*(false|true|0|1|-1|''|""|\[\]|\{\}|null|undefined)\s*[;,]?\s*$/.test(lines[at]);
      }
      let depth = 0;
      let end = -1;
      for (let i = open; i < rest.length; i += 1) {
        if (rest[i] === '{') depth += 1;
        else if (rest[i] === '}' && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) return false;
      const body = rest.slice(open + 1, end);
      // Nothing but comments means it is theirs to fill in. So does an empty method body.
      return (
        body.replace(/\/\/[^\n]*/g, '').trim() === '' ||
        /[:=]\s*(\([^)]*\)|\w+)\s*=>\s*\{\s*(\/\/[^\n]*\s*)*\}/.test(body)
      );
    };

    for (const set of Object.values(exerciseSets)) {
      for (const rung of set.rungs) {
        if (rung.kind !== 'code') continue;
        const unnamed = rung.exports.filter((n) => isStub(rung.starter, n) && !rung.prompt.includes(n));
        if (unnamed.length) {
          note(
            `${set.termId}/${rung.id}: the prompt never names ${unnamed.map((n) => `\`${n}\``).join(', ')}, ` +
              `which the learner has to write. Name every one and say what it returns.`,
          );
        }
      }
    }
  }

  // A hint names the shape or the stuck point. Quoting the answer turns the hint ladder into
  // a slower way of pressing the solution button, and somebody who reads every hint should
  // still have to write the line. Text already visible in the starter is fair game.
  {
    const flat = (t) => String(t).replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim();
    for (const set of Object.values(exerciseSets)) {
      for (const rung of set.rungs) {
        if (rung.kind !== 'code' || !rung.hints?.length) continue;
        const solution = flat(rung.solution);
        const starter = flat(rung.starter);
        for (const hint of rung.hints) {
          for (const m of hint.matchAll(/`([^`]+)`/g)) {
            const snippet = flat(m[1]);
            if (snippet.length > 18 && solution.includes(snippet) && !starter.includes(snippet)) {
              note(
                `${set.termId}/${rung.id}: a hint quotes \`${snippet}\` straight out of the solution. ` +
                  `Describe the shape instead; the solution button is what exists for giving up.`,
              );
            }
          }
        }
      }
    }
  }

  // The teaching plan names specific rungs to demo. A renamed rung turns those into dead
  // ends, and the place you find out is in front of a room.
  const PLAN = join(ROOT, 'docs/teaching-day.md');
  if (existsSync(PLAN)) {
    const plan = readFileSync(PLAN, 'utf8');
    for (const [, termId, rungId] of plan.matchAll(/#\/term\/([a-z0-9-]+)\/practice\/([a-z0-9-]+)/g)) {
      const set = exerciseSets[termId];
      if (!set) note(`docs/teaching-day.md points at "${termId}", which is not a concept.`);
      else if (!set.rungs.some((r) => r.id === rungId)) {
        note(
          `docs/teaching-day.md points at ${termId}/${rungId}, which is not a rung. ` +
            `That set has: ${set.rungs.map((r) => r.id).join(', ')}.`,
        );
      }
    }
    for (const [, termId] of plan.matchAll(/#\/term\/([a-z0-9-]+)(?![a-z0-9-/])/g)) {
      if (!exerciseSets[termId]) note(`docs/teaching-day.md points at "${termId}", which is not a concept.`);
    }
  }

  // solutions.html is committed, so a stale copy is a wrong answer shipped to a learner.
  const SOLUTIONS = join(ROOT, 'solutions.html');
  const { solutionsHtml } = await import(new URL(`file://${join(ROOT, 'scripts/build-solutions.mjs')}`).href);
  const onDisk = existsSync(SOLUTIONS) ? readFileSync(SOLUTIONS, 'utf8') : null;
  if (onDisk !== solutionsHtml) {
    note(
      onDisk === null
        ? 'solutions.html is missing. Run `npm run build:solutions`.'
        : 'solutions.html has drifted from the exercise sets. Run `npm run build:solutions`.',
    );
  }
}

let codeRungs = 0;
let exprRungs = 0;
let variants = 0;
const notedConcepts = [];
const MIN_CODE_BLOCKS = 3;
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
  if (rubric.length === 0) {
    note(`${termId}: no rubric. Say what competency looks like before saying how it is tested.`);
  }
  const rubricIds = new Set(rubric.map((r) => r.id));
  if (rubricIds.size !== rubric.length) note(`${termId}: duplicate rubric item id.`);
  for (const item of rubric) {
    if (!item.statement?.trim()) note(`${termId}/${item.id}: rubric item has no statement.`);
  }

  const covered = new Set();
  const graded = new Set();
  const timesCovered = new Map();
  for (const rung of set.rungs) {
    const covers = rung.covers ?? [];
    if (covers.length === 0) {
      note(`${termId}/${rung.id}: covers no rubric item. Either it is off-syllabus, or the rubric is missing something.`);
    }
    for (const id of covers) {
      if (!rubricIds.has(id)) note(`${termId}/${rung.id}: covers "${id}", which is not in the rubric.`);
      covered.add(id);
      timesCovered.set(id, (timesCovered.get(id) ?? 0) + 1);
      if (rung.kind === 'code' || rung.kind === 'expr') graded.add(id);
    }
  }
  const untested = [...rubricIds].filter((id) => !covered.has(id));
  if (untested.length) {
    note(
      `${termId}: nothing demonstrates ${untested.map((id) => `"${id}"`).join(', ')}. ` +
        `A rubric item with no rung is a claim the app never checks.`,
    );
  }

  // An item demonstrated only by a choice rung can be cleared by ruling out three wrong
  // answers, which is not the same as being able to do the thing.
  const recognitionOnly = [...rubricIds].filter((id) => covered.has(id) && !graded.has(id));
  if (recognitionOnly.length) {
    note(
      `${termId}: ${recognitionOnly.map((id) => `"${id}"`).join(', ')} ` +
        `${recognitionOnly.length === 1 ? 'is' : 'are'} graded only by a choice rung, so ${recognitionOnly.length === 1 ? 'it' : 'they'} can be cleared by elimination. ` +
        `Add a rung that runs code.`,
    );
  }

  // One rung behind a claim is a single point of failure: if that rung is soft, the item is
  // unverified and nothing says so.
  const onlyOnce = [...rubricIds].filter((id) => (timesCovered.get(id) ?? 0) === 1);
  if (onlyOnce.length) {
    note(
      `${termId}: ${onlyOnce.map((id) => `"${id}"`).join(', ')} ` +
        `${onlyOnce.length === 1 ? 'rests' : 'rest'} on a single rung. Demonstrate ${onlyOnce.length === 1 ? 'it' : 'them'} twice, ` +
        `or say on an existing rung that it already does.`,
    );
  }

  // A rung may only ask about something Learn has covered. Upstream is a glossary, so for
  // most concepts that means this repo supplies the teaching itself. Every set has to declare
  // which case it is, so a new one cannot land without someone deciding.
  if (!set.notes && !set.upstreamIsEnough) {
    note(
      `${termId}: no \`notes\`, and \`upstreamIsEnough\` is not set. ` +
        `A rung may only ask about something the Learn tab has covered.`,
    );
  }

  // A typed rung asks the learner to read a signature, so the typed lap has to have been
  // written. Prose cannot be checked mechanically; this much can.
  const hasTypedRung = set.rungs.some((r) => r.lang === 'ts');
  if (hasTypedRung && !set.typedNotes) {
    note(
      `${termId}: has a typed rung but no \`typedNotes\`. ` +
        `Lap two has to be taught before it is tested.`,
    );
  }
  if (set.typedNotes && !/```ts/.test(set.typedNotes)) {
    note(`${termId}: \`typedNotes\` never shows a type.`);
  }
  if (set.typedNotes && !hasTypedRung) {
    note(`${termId}: has \`typedNotes\` but no typed rung, so lap two is taught and never tested.`);
  }

  // Code carries more than prose does. Notes that explain a concept without showing it are
  // the thing this catches.
  if (set.notes) {
    const blocks = (set.notes.match(/```/g) ?? []).length / 2;
    if (blocks < MIN_CODE_BLOCKS) {
      note(
        `${termId}: notes have ${blocks} code block${blocks === 1 ? '' : 's'}, want at least ${MIN_CODE_BLOCKS}. ` +
          `Show the concept, do not only describe it.`,
      );
    }
    notedConcepts.push({ termId, blocks, code: [...set.notes.matchAll(/```[\s\S]*?```/g)].reduce((a, m) => a + m[0].length, 0), prose: set.notes.replace(/```[\s\S]*?```/g, '').length });
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

    if (rung.kind === 'expr') {
      exprRungs++;
      if (!rung.solution?.trim()) note(`${termId}/${rung.id}: no solution expression.`);
      if (!rung.broken?.length) note(`${termId}/${rung.id}: no broken variant.`);

      variants++;
      const solved = await gradeInWorker(termId, rung.id, rung.solution ?? '');
      if (!solved.passed) note(`${termId}/${rung.id}: the SOLUTION does not pass.\n         ${describe(solved)}`);

      for (const [i, src] of (rung.broken ?? []).entries()) {
        variants++;
        const out = await gradeInWorker(termId, rung.id, src);
        if (out.passed) note(`${termId}/${rung.id}: broken expression ${i + 1} evaluates to the expected value.`);
      }
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
  `\n  verify passed\n  ${termCount} concepts, ${codeRungs} code rungs, ${exprRungs} expression rungs, ${variants} variants graded through the real harness`,
);
console.log(`  ${termCount}/${termCount} written to a competency rubric`);
if (notedConcepts.length) {
  const blocks = notedConcepts.reduce((a, n) => a + n.blocks, 0);
  const code = notedConcepts.reduce((a, n) => a + n.code, 0);
  const prose = notedConcepts.reduce((a, n) => a + n.prose, 0);
  console.log(
    `  ${blocks} code examples across ${notedConcepts.length} sets of notes, ${Math.round((code / (code + prose)) * 100)}% of them by volume`,
  );
}
console.log('');
