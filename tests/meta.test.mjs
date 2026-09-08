import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeRun } from '../src/meta/run.js';
import { canUse, commitUse, remainingUses, byId } from '../src/meta/countermeasures.js';
import { makeEvidenceBank, record, rollbackTo, canPressCharges } from '../src/engine/evidence.js';
import { emptyBoard, openSquares, makeRng, pick, winner } from '../src/engine/board.js';
import { planTurn } from '../src/engine/referee.js';

const foul = cls => ({ exhibitClass: cls, statute: '§x', message: 'm' });

test('run points = documented violations minus what you have spent', () => {
  const run = makeRun();
  assert.equal(run.points, 0);
  run.bankViolation(foul('erasure'));
  run.bankViolation(foul('erasure'));
  run.bankViolation(foul('doubleDealing'));
  assert.equal(run.points, 3);
  assert.equal(run.spendPoints(2), true);
  assert.equal(run.points, 1);
  assert.equal(run.spendPoints(5), false); // can't overspend
  assert.equal(run.points, 1);
});

test('counter-measure caps and affordability', () => {
  const run = makeRun();
  for (let i = 0; i < 10; i++) run.bankViolation(foul('erasure')); // 10 pts

  assert.equal(canUse(run, 'whistle', { hasExhibits: true }), true);
  assert.equal(canUse(run, 'whistle', { hasExhibits: false }), false); // needs an exhibit
  assert.equal(canUse(run, 'freeze', { canUndo: false }), false);      // nothing to undo
  assert.equal(canUse(run, 'freeze', { canUndo: true }), true);

  assert.equal(remainingUses(run, 'audit'), byId.audit.cap);
  assert.equal(commitUse(run, 'audit'), true);
  assert.equal(remainingUses(run, 'audit'), 0);
  assert.equal(canUse(run, 'audit', {}), false); // cap hit even though affordable
});

test('evidence rollback restores counts and total exactly', () => {
  const bank = makeEvidenceBank();
  record(bank, foul('erasure'));
  const mark = bank.log.length;
  record(bank, foul('structural'));
  record(bank, foul('erasure'));
  assert.equal(bank.total, 3);
  rollbackTo(bank, mark);
  assert.equal(bank.total, 1);
  assert.equal(bank.exhibits.erasure.count, 1);
  assert.equal(bank.exhibits.structural, undefined);
});

test('nextSeason keeps the record and season, wipes the case', () => {
  const run = makeRun();
  run.bankViolation(foul('erasure'));
  run.loseMatch({ clean: false });
  run.advanceMatch();
  run.nextSeason();
  assert.equal(run.season, 2);
  assert.equal(run.match, 1);
  assert.equal(run.losses, 1);       // permanent record survives
  assert.equal(run.evidence.total, 0); // the case is fresh
  assert.equal(run.points, 0);
});

test('Instant Replay clean flag: the House places but does not elect to cheat', () => {
  // Set up a mid-game board with no player line; a clean reply should add exactly
  // one O and produce zero cheat events.
  for (let seed = 1; seed <= 300; seed++) {
    const rng = makeRng(seed);
    let board = emptyBoard();
    board[0] = 'X'; board[4] = 'O'; board[8] = 'X'; board[2] = 'O';
    const before = board.filter(v => v === 'O').length;
    const plan = planTurn(board, { turn: 3, previous: 'rebrand', rng, tier: 4, clean: true });
    for (const s of plan.steps) board = [...s.board];
    assert.ok(plan.steps.every(s => !s.cheatEvent), `seed ${seed}: clean reply still cheated`);
    assert.equal(board.filter(v => v === 'O').length, before + 1);
    assert.ok(!winner(board, 'X'));
  }
});

test('the House still wins promptly — median resolution under ~6 turns at every tier', () => {
  for (let tier = 1; tier <= 5; tier++) {
    const lengths = [];
    for (let seed = 1; seed <= 200; seed++) {
      const rng = makeRng(seed * 31 + tier);
      let board = emptyBoard();
      const condemned = new Set();
      let previous = '';
      let t = 0;
      for (; t < 40; t++) {
        const open = openSquares(board, condemned);
        if (open.length) {
          board[pick(rng, open)] = 'X';
          const threat = Boolean(winner(board, 'X'));
          const plan = planTurn(board, { turn: t + 1, previous, rng, tier, condemned });
          previous = plan.kind;
          for (const c of plan.condemned) condemned.add(c);
          if (threat) { const f = plan.steps.shift(); board = [...f.board]; }
          for (const s of plan.steps) board = [...s.board];
        }
        if (winner(board, 'O')) break;
      }
      lengths.push(t + 1);
    }
    lengths.sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];
    assert.ok(median <= 6, `tier ${tier}: median match length ${median} turns (too slow)`);
  }
});
