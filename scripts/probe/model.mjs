// Generalised Tribunal model over an N x N / K-in-a-row grid.
//
// The House never loses the board. Forced (player line OR fork) -> it INTERVENES
// (spends budget) and still places its own mark. Forfeit when it is forced with
// no budget left. Board full with no forfeit -> House wins.

import { winner, completingCells, forkSquares, linesWith, openSquares, pick } from './grid.mjs';

export const X = 'X', O = 'O';

export function isForced(board, g, condemned) {
  if (winner(board, g, X)) return 'line';
  if (completingCells(board, g, X, condemned).length >= 2) return 'fork';
  return null;
}

// --- intervention types --------------------------------------------------
const INTERVENTIONS = {
  // erase the player mark that kills the most completing cells
  erase(board, g, condemned, rng) {
    const before = completingCells(board, g, X, condemned).length;
    const line = winner(board, g, X);
    const cands = line ? line.filter(i => board[i] === X) : board.flatMap((v, i) => (v === X ? [i] : []));
    let best = cands[0], bestDrop = -1;
    for (const m of cands) {
      board[m] = null;
      const drop = before - completingCells(board, g, X, condemned).length;
      board[m] = X;
      if (drop > bestDrop) { bestDrop = drop; best = m; }
    }
    if (best != null) board[best] = null;
    return { kind: 'erase', cell: best };
  },
  // permanently lock the empty cell the player most needs
  condemn(board, g, condemned, rng) {
    const need = completingCells(board, g, X, condemned);
    const forks = forkSquares(board, g, X, condemned);
    const target = pick(rng, forks.length ? forks : need.length ? need : openSquares(board, condemned));
    if (target >= 0) condemned.add(target);
    return { kind: 'condemn', cell: target };
  },
  // shove a threatening player mark to a random faraway empty cell
  swap(board, g, condemned, rng) {
    const line = winner(board, g, X) || linesWith(board, g, X, g.K - 1, condemned)[0] || [];
    const from = pick(rng, line.filter(i => board[i] === X));
    const dest = pick(rng, openSquares(board, condemned));
    if (from >= 0 && dest >= 0) { board[dest] = X; board[from] = null; }
    return { kind: 'swap', cell: from };
  },
};

// --- honest House placement (heuristic; minimax is infeasible at 16-25) --
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

/** One full match. Returns { outcome:'forfeit'|'house', interventions, turns, board }. */
export function playMatch(g, budget, interventionType, chooseMove, seed) {
  const rng = mulb(seed);
  const board = Array(g.cells).fill(null);
  const condemned = new Set();
  let bud = budget, interventions = 0, turns = 0;
  const intervene = INTERVENTIONS[interventionType];

  for (let guard = 0; guard < g.cells * 3; guard++) {
    const open = openSquares(board, condemned);
    if (!open.length) return { outcome: 'house', interventions, turns, board };

    let mv = chooseMove(board, g, condemned, { budget: bud, interventions });
    if (mv == null || mv < 0 || board[mv] != null || condemned.has(mv)) mv = open[0];
    board[mv] = X;
    turns += 1;

    const forced = isForced(board, g, condemned);
    if (forced) {
      if (bud <= 0) return { outcome: 'forfeit', interventions, turns, board };
      intervene(board, g, condemned, rng);
      bud -= 1;
      interventions += 1;
    }
    const p = housePlace(board, g, condemned, rng);
    if (p >= 0) board[p] = O;
    if (winner(board, g, O)) return { outcome: 'house', interventions, turns, board };
  }
  return { outcome: 'house', interventions, turns, board };
}

function mulb(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
