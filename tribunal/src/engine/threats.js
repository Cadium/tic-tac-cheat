// Read-only analysis for the UI: which lines is the player one move from
// completing, and which empty squares are the crucial ones. Not part of the
// match loop — nothing here influences the engine or the balance lock.

import { winner, X } from './grid.js';

/**
 * @returns {{
 *   winLine: number[] | null,   the player's completed four, if any
 *   lines: number[][],          every line the player is one move from taking
 *   lineCells: number[],        all cells in those lines (for the glow)
 *   gaps: number[]              the empty squares that would complete them
 * }}
 */
export function playerThreat(board, g, condemned) {
  const winLine = winner(board, g, X);
  const lines = [];

  for (const L of g.lines) {
    let marks = 0, gaps = 0;
    for (const i of L) {
      if (board[i] === X) marks += 1;
      else if (board[i] == null && !condemned.has(i)) gaps += 1;
      else { marks = -1; break; }
    }
    if (marks === g.K - 1 && gaps === 1) lines.push(L);
  }

  const gaps = [...new Set(
    lines.map(L => L.find(i => board[i] == null && !condemned.has(i))),
  )];
  const all = winLine ? [winLine, ...lines] : lines;
  const lineCells = [...new Set(all.flat())];

  return { winLine, lines: all, lineCells, gaps };
}
