#!/usr/bin/env node
/**
 * Reports broken variants that fail by crashing rather than by failing a check.
 *
 * `npm run verify` only asks that a broken variant fail. A variant that throws satisfies that
 * while teaching nothing: the learner gets a stack trace where they should get a sentence
 * naming the misconception. This finds those. It is a report, not a gate, because a few
 * variants genuinely are about throwing.
 *
 * Usage: npx tsx scripts/probe-fatals.mjs [termId ...]
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { evaluateRung } = await import(new URL(`file://${join(ROOT, 'packages/engine/src/evaluate.ts')}`).href);
const { exerciseSets } = await import(new URL(`file://${join(ROOT, 'packages/exercises/src/index.ts')}`).href);

const only = process.argv.slice(2);
let fatals = 0;
let total = 0;

for (const set of Object.values(exerciseSets)) {
  if (only.length && !only.includes(set.termId)) continue;
  for (const rung of set.rungs) {
    if (rung.kind !== 'code') continue;
    rung.broken.forEach((code, i) => {
      total += 1;
      const r = evaluateRung(rung, code, 0);
      if (r.fatal) {
        fatals += 1;
        console.log(`  ${set.termId}/${rung.id} broken[${i}]  ${r.fatal.slice(0, 110)}`);
      }
    });
  }
}

console.log(`\n  ${fatals} of ${total} broken variants fail by crashing rather than by failing a check.`);
