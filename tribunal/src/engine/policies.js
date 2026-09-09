// The two reference players the mechanic was balanced against, promoted verbatim
// from scripts/probe/policies.mjs.
//
//   naive  — plays four-in-a-row straight, no idea the House has a budget
//   strong — plays the overload game: deny the House the board, then manufacture
//            forks to drain warrants
//
// The balance-lock test drives matches with both; the tutorial hint reuses
// `strongMove` to suggest the player's next threat.

import { completingCells, forkSquares, linesWith, openSquares } from './grid.js';

const X = 'X', O = 'O';
const withX = (b, i) => { b[i] = X; return b; };
const undo = (b, i) => { b[i] = null; return b; };

const bestBy = (cells, score) => {
  let best = cells[0], bs = -Infinity;
  for (const i of cells) { const s = score(i); if (s > bs) { bs = s; best = i; } }
  return best;
};

/** Plays K-in-a-row straight. No idea the House has a budget. */
export function naiveMove(board, g, condemned) {
  const open = openSquares(board, condemned);
  if (!open.length) return -1;
  const mine = completingCells(board, g, X, condemned);
  if (mine.length) return mine[0];
  const theirs = completingCells(board, g, O, condemned);
  if (theirs.length) return theirs[0];
  const fork = forkSquares(board, g, X, condemned);
  if (fork.length) return bestBy(fork, i => g.weight[i]);
  const dev = linesWith(board, g, X, g.K - 2, condemned);
  const devCells = [...new Set(dev.flatMap(L => L.filter(i => board[i] == null && !condemned.has(i))))];
  return bestBy(devCells.length ? devCells : open, i => g.weight[i] + dev.filter(L => L.includes(i)).length);
}

/** Plays the overload game: deny the House the board, then manufacture forks. */
export function strongMove(board, g, condemned) {
  const open = openSquares(board, condemned);
  if (!open.length) return -1;

  // 1 — never let the House take the board
  const houseWin = completingCells(board, g, O, condemned);
  if (houseWin.length) return houseWin[0];
  // 2 — deny the House a fork square
  const houseFork = forkSquares(board, g, O, condemned);
  if (houseFork.length) return bestBy(houseFork, i => g.weight[i]);

  // 3 — a fork right now forces an intervention: take the strongest one
  const forks = forkSquares(board, g, X, condemned);
  if (forks.length) {
    return bestBy(forks, i => {
      withX(board, i);
      const c = completingCells(board, g, X, condemned).length;
      const d = linesWith(board, g, X, g.K - 2, condemned).length;
      undo(board, i);
      return c * 3 + d + g.weight[i] * 0.3;
    });
  }
  // 4 — a completed line also forces one
  const line = completingCells(board, g, X, condemned);
  if (line.length) return line[0];

  // 5 — build toward the next fork
  return bestBy(open, i => {
    withX(board, i);
    const c = completingCells(board, g, X, condemned).length;
    const d = linesWith(board, g, X, g.K - 2, condemned).length;
    const e = linesWith(board, g, X, g.K - 3, condemned).length;
    undo(board, i);
    return c * 5 + d * 2 + e + g.weight[i] * 0.5;
  });
}
