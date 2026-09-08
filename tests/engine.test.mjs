import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LINES, winner, squares, openSquares, makeRng, pick, emptyBoard } from '../src/engine/board.js';
import { planTurn } from '../src/engine/referee.js';
import { tierForMatch, MAX_TIER } from '../src/engine/tiers.js';
import { makeComposure, START } from '../src/engine/composure.js';
import {
  makeEvidenceBank, record, corroborate, distinctClasses,
  canPressCharges, EXHIBIT_CLASSES,
} from '../src/engine/evidence.js';

// ---------------------------------------------------------------------------
// board helpers
// ---------------------------------------------------------------------------
test('winner detects every line and nothing else', () => {
  for (const l of LINES) {
    const b = emptyBoard();
    l.forEach(i => (b[i] = 'X'));
    assert.deepEqual(winner(b, 'X'), l);
  }
  assert.equal(winner(emptyBoard(), 'X'), undefined);
  assert.equal(winner(['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'], 'X'), undefined);
});

test('openSquares excludes filled and condemned cells', () => {
  const b = emptyBoard();
  b[0] = 'X';
  assert.deepEqual(openSquares(b, new Set([4])), [1, 2, 3, 5, 6, 7, 8]);
});

// ---------------------------------------------------------------------------
// THE SACRED INVARIANT — you can never hold three in a row when the dust settles
// ---------------------------------------------------------------------------
function simulateMatch(seed, matchNumber, playerMode) {
  const rng = makeRng(seed);
  let board = emptyBoard();
  const condemned = new Set();
  let previous = '';
  let turn = 0;

  for (let safety = 0; safety < 60; safety++) {
    // player move
    const open = openSquares(board, condemned);
    if (open.length) {
      let choice;
      if (playerMode === 'greedy') {
        // take a winning square if one exists, else centre/corners, else random
        choice = open.find(i => { const b = [...board]; b[i] = 'X'; return winner(b, 'X'); })
          ?? [4, 0, 2, 6, 8].find(i => open.includes(i))
          ?? pick(rng, open);
      } else {
        choice = pick(rng, open);
      }
      board[choice] = 'X';

      // INVARIANT A: a completed player line must be gone before the turn ends
      const threat = Boolean(winner(board, 'X'));

      const plan = planTurn(board, {
        turn: ++turn, previous, rng,
        tier: tierForMatch(matchNumber),
        condemned,
      });
      previous = plan.kind;
      for (const c of plan.condemned) condemned.add(c);

      if (threat) {
        // main.js applies the first correction atomically — mirror that
        const first = plan.steps.shift();
        board = [...first.board];
        assert.ok(!winner(board, 'X'), `seed ${seed}: player line survived the atomic correction`);
      }
      for (const step of plan.steps) board = [...step.board];

      assert.ok(!winner(board, 'X'),
        `seed ${seed} match ${matchNumber}: player is holding a line after the House replied\n${board}`);
      for (const i of condemned) {
        assert.equal(board[i], null,
          `seed ${seed} match ${matchNumber}: condemned cell ${i} is holding "${board[i]}"`);
      }
    }

    if (winner(board, 'O')) return { turns: turn, board }; // House won — expected
  }
  assert.fail(`seed ${seed} match ${matchNumber}: no resolution in 60 turns (${board})`);
}

test('5000 seeded playthroughs — the player never wins, the House always does', () => {
  let totalTurns = 0;
  for (let seed = 1; seed <= 2500; seed++) {
    const matchNumber = 1 + (seed % MAX_TIER);
    simulateMatch(seed, matchNumber, 'random');
    const r = simulateMatch(seed + 100000, matchNumber, 'greedy');
    totalTurns += r.turns;
  }
  assert.ok(totalTurns > 0);
});

test('opening move is always clean — one O, no violation', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = makeRng(seed);
    const board = emptyBoard();
    board[pick(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8])] = 'X';
    const plan = planTurn(board, { turn: 1, previous: '', rng, tier: tierForMatch(1) });
    assert.equal(plan.kind, 'legal');
    assert.ok(plan.steps.every(s => !s.cheatEvent), `seed ${seed}: opening had a cheat`);
    assert.equal(squares(plan.board, 'O').length, 1);
  }
});

test('condemnation is capped at one square per match', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = makeRng(seed);
    let board = emptyBoard();
    const condemned = new Set();
    let previous = '';
    for (let turn = 1; turn <= 12; turn++) {
      const open = openSquares(board, condemned);
      if (!open.length) break;
      board[pick(rng, open)] = 'X';
      const plan = planTurn(board, { turn, previous, rng, tier: 3, condemned });
      previous = plan.kind;
      for (const c of plan.condemned) condemned.add(c);
      for (const s of plan.steps) board = [...s.board];
      if (winner(board, 'O')) break;
    }
    assert.ok(condemned.size <= 1, `seed ${seed}: condemned ${condemned.size} squares`);
  }
});

test('audited turn: the House places nothing and cheats nothing', () => {
  const rng = makeRng(7);
  const board = emptyBoard();
  board[0] = 'X'; board[4] = 'O'; board[1] = 'X';
  const before = [...board];
  const plan = planTurn(board, { turn: 3, previous: 'erase', rng, tier: 4, audited: true });
  assert.equal(plan.kind, 'audited');
  assert.deepEqual(plan.board, before);
  assert.ok(plan.steps.every(s => !s.cheatEvent && s.changed.length === 0));
});

test('every cheat step carries a typed, well-formed cheatEvent', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 800; seed++) {
    const rng = makeRng(seed);
    let board = emptyBoard();
    const condemned = new Set();
    let previous = '';
    for (let turn = 1; turn <= 12; turn++) {
      const open = openSquares(board, condemned);
      if (!open.length) break;
      board[pick(rng, open)] = 'X';
      const plan = planTurn(board, { turn, previous, rng, tier: 1 + (seed % 5), condemned });
      previous = plan.kind;
      for (const c of plan.condemned) condemned.add(c);
      for (const s of plan.steps) {
        if (s.cheatEvent) {
          assert.ok(EXHIBIT_CLASSES[s.cheatEvent.exhibitClass], `unknown class ${s.cheatEvent.exhibitClass}`);
          assert.match(s.cheatEvent.statute, /^§/);
          assert.ok(typeof s.cheatEvent.message === 'string' && s.cheatEvent.message.length);
          seen.add(s.cheatEvent.exhibitClass);
        }
        board = [...s.board];
      }
      if (winner(board, 'O')) break;
    }
  }
  // across 800 varied runs we should exercise every exhibit class
  for (const id of Object.keys(EXHIBIT_CLASSES)) assert.ok(seen.has(id), `never produced a ${id} cheat`);
});

// ---------------------------------------------------------------------------
// tiers
// ---------------------------------------------------------------------------
test('tierForMatch: base = match number capped at 5, panic bumps +1', () => {
  assert.equal(tierForMatch(1), 1);
  assert.equal(tierForMatch(5), 5);
  assert.equal(tierForMatch(9), 5);
  assert.equal(tierForMatch(2, 'smug'), 2);
  assert.equal(tierForMatch(2, 'unhinged'), 3);
  assert.equal(tierForMatch(5, 'unravelling'), 5); // already capped
});

// ---------------------------------------------------------------------------
// composure
// ---------------------------------------------------------------------------
test('composure clamps to [floor, 100] and reports bands', () => {
  const c = makeComposure(START);
  assert.equal(c.band().id, 'smug');
  c.nudge(-30);
  assert.equal(c.value, 48);
  assert.equal(c.band().id, 'annoyed');
  c.nudge(-15);
  assert.equal(c.band().id, 'sweating');
  c.nudge(-999);
  assert.equal(c.value, 0);
  assert.equal(c.band().id, 'unravelling');
  c.nudge(999);
  assert.equal(c.value, 100);
});

test('whistleblower lowers the ceiling the House can recover to', () => {
  const c = makeComposure(30);
  c.lowerFloor(8);
  assert.equal(c.floor, 8);
  c.nudge(-100);
  assert.equal(c.value, 8);
  c.nudge(50);
  assert.equal(c.value, 58);
});

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------
test('record files one exhibit per class and counts totals', () => {
  const bank = makeEvidenceBank();
  record(bank, { exhibitClass: 'erasure', statute: '§4', message: 'gone' });
  record(bank, { exhibitClass: 'erasure', statute: '§4', message: 'gone again' });
  record(bank, { exhibitClass: 'doubleDealing', statute: '§2', message: 'twice' });
  assert.equal(bank.total, 3);
  assert.equal(distinctClasses(bank), 2);
  assert.equal(bank.exhibits.erasure.count, 2);
});

test('canPressCharges: 5 distinct classes OR 15 total violations', () => {
  const byDistinct = makeEvidenceBank();
  for (const id of Object.keys(EXHIBIT_CLASSES)) record(byDistinct, { exhibitClass: id, statute: '§x', message: 'm' });
  assert.equal(distinctClasses(byDistinct), 5);
  assert.ok(canPressCharges(byDistinct));

  const byTotal = makeEvidenceBank();
  for (let i = 0; i < 15; i++) record(byTotal, { exhibitClass: 'erasure', statute: '§4', message: 'm' });
  assert.equal(distinctClasses(byTotal), 1);
  assert.ok(canPressCharges(byTotal));

  const notYet = makeEvidenceBank();
  for (let i = 0; i < 3; i++) record(notYet, { exhibitClass: 'erasure', statute: '§4', message: 'm' });
  assert.ok(!canPressCharges(notYet));
});

test('corroborate marks an exhibit as court-ready', () => {
  const bank = makeEvidenceBank();
  record(bank, { exhibitClass: 'structural', statute: '§3', message: 'm' });
  corroborate(bank, 'structural');
  assert.equal(bank.exhibits.structural.corroborated, true);
});
