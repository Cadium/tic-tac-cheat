#!/usr/bin/env node
// QA gate — adapted from clone-app-pat-pro/scripts/assert-styles.mjs.
// Compares the rebuilt page's computed styles (captured from a browser into
// clone-workspace/tic-tac-cheat/06-qa/clone-styles.json) against the design
// tokens in 03-design-spec/assertions.json.
//
//   1. capture:  run the snippet in 06-qa/capture.js in the page console,
//                save the JSON to 06-qa/clone-styles.json
//   2. gate:     node scripts/assert-styles.mjs
//
// PASS = 0 failures. Colours are compared as normalised rgb(); px within ±1;
// em/letter-spacing within ±0.02em; font-family by its first quoted family.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ws = resolve(root, 'clone-workspace/tic-tac-cheat');
const spec = JSON.parse(readFileSync(resolve(ws, '03-design-spec/assertions.json'), 'utf8'));

let clone;
try {
  clone = JSON.parse(readFileSync(resolve(ws, '06-qa/clone-styles.json'), 'utf8'));
} catch {
  console.error('missing 06-qa/clone-styles.json — capture it first (see 06-qa/capture.js)');
  process.exit(2);
}

const firstFamily = s => (s || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
const px = s => { const m = /(-?[\d.]+)px/.exec(s || ''); return m ? parseFloat(m[1]) : NaN; };
const em = s => { const m = /(-?[\d.]+)em/.exec(s || ''); return m ? parseFloat(m[1]) : NaN; };
const norm = s => (s || '').replace(/\s+/g, ' ').trim();

function matches(prop, expected, actual) {
  if (actual == null) return false;
  if (/color|Color/.test(prop) && !/family|image/i.test(prop)) return norm(expected) === norm(actual);
  if (prop === 'fontFamily') return firstFamily(expected) === firstFamily(actual);
  if (prop === 'letterSpacing' && /em$/.test(expected)) {
    // expected in em, actual in px — can't compare without font-size; accept if both "normal" or both non-normal-ish
    if (expected === 'normal') return actual === 'normal';
    return actual !== 'normal' && actual !== '0px';
  }
  if (/px$/.test(expected)) return Math.abs(px(expected) - px(actual)) <= 1;
  if (/em$/.test(expected)) return !Number.isNaN(em(actual)) ? Math.abs(em(expected) - em(actual)) <= 0.02 : true;
  return norm(expected) === norm(actual);
}

const failures = [];
let checks = 0;

for (const entry of spec.assertions) {
  const got = clone[entry.sel];
  if (entry.props && !got) { failures.push(`${entry.sel} — selector not found on rebuilt page`); continue; }
  for (const [prop, expected] of Object.entries(entry.props || {})) {
    checks++;
    if (!matches(prop, expected, got[prop])) failures.push(`${entry.sel} { ${prop} } expected ${expected} · got ${got[prop] ?? '∅'}`);
  }
  if (entry.shadow_one_of) {
    checks++;
    const actual = norm(got && got.boxShadow);
    if (!entry.shadow_one_of.some(s => norm(s) === actual)) failures.push(`${entry.sel} { boxShadow } expected one of [${entry.shadow_one_of.join(' | ')}] · got ${actual || '∅'}`);
  }
  for (const [v, expected] of Object.entries(entry.vars || {})) {
    checks++;
    const actual = (clone.__vars || {})[v];
    if (norm(actual) !== norm(expected)) failures.push(`:root { ${v} } expected ${expected} · got ${actual ?? '∅'}`);
  }
}

console.log(`\nassert-styles — ${checks} checks, ${failures.length} failure(s)\n`);
for (const f of failures) console.log('  ✗ ' + f);
if (!failures.length) console.log('  ✓ all computed styles match the design tokens');
console.log('');
process.exit(failures.length ? 1 : 0);
