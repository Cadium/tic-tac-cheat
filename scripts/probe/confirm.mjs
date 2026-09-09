#!/usr/bin/env node
// Deep confirmation of the candidate: 5x5, four-in-a-row, CONDEMN.

import { makeGrid, winner, openSquares } from './grid.mjs';
import { playMatch, housePlace, isForced } from './model.mjs';
import { naiveMove, strongMove } from './policies.mjs';

const g = makeGrid(5, 4);
const N = 3000;

// a "very strong" player: 1-ply lookahead on top of strongMove, maximising
// forced interventions this turn without losing the board.
function expertMove(board, gg, condemned, view) {
  const open = openSquares(board, condemned);
  if (!open.length) return -1;
  // never lose the board
  const { completingCells, forkSquares } = _helpers;
  const hw = completingCells(board, gg, 'O', condemned); if (hw.length) return hw[0];
  const hf = forkSquares(board, gg, 'O', condemned); if (hf.length) return hf[0];
  let best = -1, bs = -Infinity;
  for (const i of open) {
    board[i] = 'X';
    const forced = isForced(board, gg, condemned) ? 1 : 0;
    const myForks = forkSquares(board, gg, 'X', condemned).length;
    const s = forced * 10 + myForks * 3 + gg.weight[i] * 0.2;
    board[i] = null;
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
import * as _helpers from './grid.mjs';

console.log(`\n5x5 four-in-a-row · CONDEMN · ${N} matches/cell\n`);
console.log(' budget | naive fft% | strong fft% | expert fft% | House board-win% (vs strong) | median turns | turn p10..p90');
for (const budget of [2, 3, 4, 5, 6, 8]) {
  const rec = { n: 0, s: 0, e: 0, turns: [] };
  let houseVsStrong = 0;
  for (let seed = 1; seed <= N; seed++) {
    if (playMatch(g, budget, 'condemn', naiveMove, seed).outcome === 'forfeit') rec.n++;
    const s = playMatch(g, budget, 'condemn', strongMove, seed ^ 0x9e3779b9);
    if (s.outcome === 'forfeit') rec.s++; else houseVsStrong++;
    rec.turns.push(s.turns);
    if (playMatch(g, budget, 'condemn', expertMove, seed ^ 0x51ed2701).outcome === 'forfeit') rec.e++;
  }
  rec.turns.sort((a, b) => a - b);
  const q = p => rec.turns[Math.floor(p * rec.turns.length)];
  console.log(
    `   ${String(budget).padStart(2)}   |   ${(100 * rec.n / N).toFixed(1).padStart(5)}   |    ${(100 * rec.s / N).toFixed(1).padStart(5)}   |    ${(100 * rec.e / N).toFixed(1).padStart(5)}   |            ${(100 * houseVsStrong / N).toFixed(1).padStart(5)}            |      ${q(0.5)}       |  ${q(0.1)}..${q(0.9)}`
  );
}

// one narrated match at budget 4
console.log('\n--- one strong match, budget 4 ---');
narrate(4);
function narrate(budget) {
  const board = Array(g.cells).fill(null);
  const condemned = new Set();
  let bud = budget, ivs = 0, turn = 0;
  const rng = mul(12345);
  const show = () => {
    let s = '';
    for (let r = 0; r < 5; r++) { for (let c = 0; c < 5; c++) { const i = r * 5 + c; s += condemned.has(i) ? '#' : (board[i] || '.'); } s += '\n'; }
    return s;
  };
  for (let guard = 0; guard < 60; guard++) {
    const open = openSquares(board, condemned);
    if (!open.length) { console.log('board full — House wins'); break; }
    let mv = strongMove(board, g, condemned, { budget: bud, interventions: ivs });
    if (mv < 0 || board[mv] != null) mv = open[0];
    board[mv] = 'X'; turn++;
    const forced = isForced(board, g, condemned);
    let note = `T${turn}: X@${mv}`;
    if (forced) {
      if (bud <= 0) { console.log(note + `  -> House FORCED (${forced}) with no budget -> FORFEIT after ${ivs} interventions\n` + show()); return; }
      // condemn
      const { completingCells, forkSquares } = _helpers;
      const need = completingCells(board, g, 'X', condemned);
      const forks = forkSquares(board, g, 'X', condemned);
      const t = (forks[0] ?? need[0] ?? open[0]);
      condemned.add(t); bud--; ivs++;
      note += `  -> House CONDEMNS @${t}  (budget ${bud}, interventions ${ivs})`;
    }
    const p = housePlace(board, g, condemned, rng);
    if (p >= 0) board[p] = 'O';
    note += `  · O@${p}`;
    console.log(note);
    if (winner(board, g, 'O')) { console.log('House completes a line — House wins\n' + show()); return; }
  }
}
function mul(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
