// The House: the one intervention it is allowed (CONDEMN) and how it places its
// own mark. Lifted from scripts/probe/model.mjs — the erase/swap interventions
// are not part of the shipped mechanic and stay in the probe only.
//
// Honest placement, no minimax: at 25 cells a full search is infeasible, and the
// probe showed this heuristic is already strong enough to hold the board.

import { winner, completingCells, forkSquares, linesWith, openSquares, pick, X, O } from './grid.js';

/**
 * CONDEMN — permanently seal the empty cell the player most needs: a fork square
 * if one exists, else a completing cell, else any open square. Mutates
 * `condemned`. Consumes exactly one rng draw (via `pick`).
 */
export function condemn(board, g, condemned, rng) {
  const need = completingCells(board, g, X, condemned);
  const forks = forkSquares(board, g, X, condemned);
  const target = pick(rng, forks.length ? forks : need.length ? need : openSquares(board, condemned));
  if (target >= 0) condemned.add(target);
  return { kind: 'condemn', cell: target };
}

/**
 * Where the House plays its O. Priority: win > block a single player threat >
 * deny an incoming player fork > take our own fork > extend our strongest
 * developing line > best central square. Returns a cell index, or -1 if the
 * board is full.
 */
export function housePlace(board, g, condemned, rng) {
  const open = openSquares(board, condemned);
  if (!open.length) return -1;
  const myWin = completingCells(board, g, O, condemned)[0];
  if (myWin != null) return myWin;
  const block = completingCells(board, g, X, condemned)[0];   // block a single threat
  if (block != null) return block;
  const denyFork = forkSquares(board, g, X, condemned)[0];    // deny an incoming fork
  if (denyFork != null) return denyFork;
  const myFork = forkSquares(board, g, O, condemned)[0];      // take our own fork
  if (myFork != null) return myFork;
  // extend our strongest line, else best central square
  const dev = [...linesWith(board, g, O, g.K - 2, condemned), ...linesWith(board, g, O, g.K - 3, condemned)];
  const cells = [...new Set(dev.flatMap(L => L.filter(i => board[i] == null && !condemned.has(i))))];
  const poolRaw = cells.length ? cells : open;
  const bestW = Math.max(...poolRaw.map(i => g.weight[i] + (dev.filter(L => L.includes(i)).length * 2)));
  const top = poolRaw.filter(i => g.weight[i] + (dev.filter(L => L.includes(i)).length * 2) === bestW);
  return rng() < 0.75 ? top[0] : pick(rng, poolRaw);
}
