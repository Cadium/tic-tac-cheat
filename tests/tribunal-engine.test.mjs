import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeGrid, empty, completingCells, X, O } from '../tribunal/src/engine/grid.js';
import { condemn, housePlace } from '../tribunal/src/engine/house.js';
import { createMatch, playMatch, isForced, GRID, STANDARD_BUDGET } from '../tribunal/src/engine/model.js';
import { replay } from '../tribunal/src/engine/transcript.js';
import { naiveMove, strongMove } from '../tribunal/src/engine/policies.js';

// The probe module the whole mechanic was validated against. The engine is a
// promotion of this code; these tests exist to catch it drifting.
import { makeGrid as probeGrid } from '../scripts/probe/grid.mjs';
import { playMatch as probePlay } from '../scripts/probe/model.mjs';
import { naiveMove as probeNaive, strongMove as probeStrong } from '../scripts/probe/policies.mjs';

const PG = probeGrid(5, 4);

/** Drive a whole match with a policy, collecting the cells it played. */
function policyMoves(seed, policy, opts) {
  const m = createMatch(seed, opts);
  const moves = [];
  while (!m.outcome) {
    const mv = policy(m.board, m.grid, m.condemned, { budget: m.warrants, interventions: m.interventions });
    moves.push(mv);
    m.step(mv);
  }
  return moves;
}

// ---------------------------------------------------------------------------
// 1 — determinism
// ---------------------------------------------------------------------------
test('a (seed, moves) pair replays to a byte-identical transcript, 1000x', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const moves = policyMoves(seed, strongMove);
    const a = replay(seed, moves);
    const b = replay(seed, moves);
    assert.deepEqual(a, b, `seed ${seed} not reproducible`);
  }
});

test('the House RNG is seeded — the seed steers the match, not Math.random', () => {
  // same policy, many seeds -> the House must not play an identical game every
  // time (that would mean the seed is ignored), and re-running a seed must
  // reproduce it exactly (that would fail if Math.random leaked in).
  const signatures = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const moves = policyMoves(seed, strongMove);
    const once = replay(seed, moves);
    const twice = replay(seed, moves);
    assert.deepEqual(once, twice);
    signatures.add(JSON.stringify(once.steps.map(s => [s.housePlace, s.condemned])));
  }
  assert.ok(signatures.size > 20, `only ${signatures.size} distinct games across 60 seeds`);
});

// ---------------------------------------------------------------------------
// 2 — rules parity with the probe
// ---------------------------------------------------------------------------
test('isForced: line, fork, and neither', () => {
  const g = makeGrid(5, 4);
  assert.equal(isForced(empty(g), g, new Set()), null);

  const line = empty(g);
  [0, 1, 2, 3].forEach(i => (line[i] = X));
  assert.equal(isForced(line, g, new Set()), 'line');

  const fork = empty(g);
  [0, 1, 2, 5, 10].forEach(i => (fork[i] = X)); // completes at 3 (row) and 15 (col)
  assert.deepEqual(completingCells(fork, g, X, new Set()).sort((a, b) => a - b), [3, 15]);
  assert.equal(isForced(fork, g, new Set()), 'fork');

  const oneThreat = empty(g);
  [0, 1, 2].forEach(i => (oneThreat[i] = X));
  assert.equal(isForced(oneThreat, g, new Set()), null);
});

test('CONDEMN seals a square the player needs and consumes one rng draw', () => {
  const g = makeGrid(5, 4);
  const board = empty(g);
  [0, 1, 2, 5, 10].forEach(i => (board[i] = X));
  const condemned = new Set();
  let draws = 0;
  const rng = () => { draws += 1; return 0; };

  const { kind, cell } = condemn(board, g, condemned, rng);
  assert.equal(kind, 'condemn');
  assert.equal(draws, 1);
  assert.ok(condemned.has(cell));
  assert.ok([3, 15].includes(cell), 'condemned a square that was not a live threat');
});

test('honest placement: win over block, block over develop', () => {
  const g = makeGrid(5, 4);
  const noop = () => 0;

  const canWin = empty(g);
  [0, 1, 2].forEach(i => (canWin[i] = O));
  assert.equal(housePlace(canWin, g, new Set(), noop), 3);

  const mustBlock = empty(g);
  [0, 1, 2].forEach(i => (mustBlock[i] = X));
  assert.equal(housePlace(mustBlock, g, new Set(), noop), 3);
});

test('engine matches the probe move-for-move over 4000 seeds x both policies', () => {
  let mismatches = 0;
  for (let seed = 1; seed <= 4000; seed++) {
    for (const [ engine, probe, s ] of [
      [naiveMove, probeNaive, seed],
      [strongMove, probeStrong, seed ^ 0x9e3779b9],
    ]) {
      const e = playMatch(engine, s);
      const p = probePlay(PG, STANDARD_BUDGET, 'condemn', probe, s);
      if (e.outcome !== p.outcome || e.turns !== p.turns
        || e.interventions !== p.interventions
        || e.board.join(',') !== p.board.join(',')) mismatches += 1;
    }
  }
  assert.equal(mismatches, 0);
});

// ---------------------------------------------------------------------------
// 3 — balance lock  (fails loudly if a heuristic tweak breaks the mechanic)
// ---------------------------------------------------------------------------
test('budget 4: naive ~22% / strong ~78% forfeit, House holds the board ~21% vs strong', () => {
  const N = 4000;
  let naiveForfeit = 0, strongForfeit = 0, houseHoldsVsStrong = 0;

  for (let seed = 1; seed <= N; seed++) {
    if (playMatch(naiveMove, seed).outcome === 'forfeit') naiveForfeit += 1;
    const s = playMatch(strongMove, seed ^ 0x9e3779b9);
    if (s.outcome === 'forfeit') strongForfeit += 1; else houseHoldsVsStrong += 1;
  }

  const naivePct = 100 * naiveForfeit / N;
  const strongPct = 100 * strongForfeit / N;
  const holdPct = 100 * houseHoldsVsStrong / N;

  assert.ok(Math.abs(naivePct - 22) <= 3, `naive forfeit ${naivePct.toFixed(1)}% outside 22 ± 3`);
  assert.ok(Math.abs(strongPct - 78) <= 3, `strong forfeit ${strongPct.toFixed(1)}% outside 78 ± 3`);
  assert.ok(Math.abs(holdPct - 21) <= 4, `House-holds-board ${holdPct.toFixed(1)}% outside 21 ± 4`);
  assert.ok(strongPct - naivePct >= 45, `skill gap ${(strongPct - naivePct).toFixed(1)}pt collapsed`);
});

// ---------------------------------------------------------------------------
// 4 — the visible loop
// ---------------------------------------------------------------------------
// Seed 1, the strong policy's own line of play: three quiet developing moves,
// then a fork every turn draining warrants 4 -> 0, then a fifth compelled
// intervention with no warrant behind it -> forfeit on turn 8.
const LOOP_SEED = 1;
const LOOP_MOVES = [12, 16, 6, 18, 17, 3, 24, 5];

test('the reference match: 4 condemns, warrants 4->0, forfeit on the compelled 5th', () => {
  const r = replay(LOOP_SEED, LOOP_MOVES);

  assert.equal(r.outcome, 'forfeit');
  assert.equal(r.condemnedSequence.length, 4, 'expected exactly four CONDEMNs');

  const warrants = r.steps.map(s => s.warrantsLeft);
  assert.deepEqual(warrants, [4, 4, 4, 3, 2, 1, 0, 0]);

  const last = r.steps[r.steps.length - 1];
  assert.ok(last.forfeit, 'final step is not the forfeit');
  assert.equal(last.forced, 'line', 'the House forfeits because it is compelled');
  assert.equal(last.housePlace, null, 'the House still moved on the forfeit turn');
  assert.ok(last.turn <= 12, `match ran ${last.turn} turns`);

  // every condemned square was empty and off the board afterwards
  for (const cell of r.condemnedSequence) {
    assert.equal(last.board[cell], null);
  }
});

test('naive play loses the board: the House completes four in a row', () => {
  let boardLosses = 0;
  for (let seed = 1; seed <= 200; seed++) {
    if (playMatch(naiveMove, seed).outcome === 'house') boardLosses += 1;
  }
  assert.ok(boardLosses > 150, `only ${boardLosses}/200 naive games lost on the board`);
});

// ---------------------------------------------------------------------------
// 5 — turn sanity
// ---------------------------------------------------------------------------
test('strong matches resolve in a readable number of turns (median 6-12 over 4000)', () => {
  const turns = [];
  for (let seed = 1; seed <= 4000; seed++) turns.push(playMatch(strongMove, seed ^ 0x9e3779b9).turns);
  turns.sort((a, b) => a - b);
  const median = turns[Math.floor(turns.length / 2)];
  const p90 = turns[Math.floor(turns.length * 0.9)];
  assert.ok(median >= 6 && median <= 12, `median ${median} turns`);
  assert.ok(p90 <= 14, `p90 ${p90} turns`);
});

test('GRID is 5x5 four-in-a-row and STANDARD_BUDGET is 4', () => {
  assert.equal(GRID.N, 5);
  assert.equal(GRID.K, 4);
  assert.equal(GRID.cells, 25);
  assert.equal(STANDARD_BUDGET, 4);
});
