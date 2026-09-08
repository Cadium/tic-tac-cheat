// Deterministic replay: a seed plus the sequence of cells the player chose is
// enough to reconstruct the whole match, step by step. Used by the match summary
// ("Replay this match"), the tutorial's scripted opening, and the determinism
// test.

import { createMatch } from './model.js';

/**
 * @param {number} seed
 * @param {number[]} playerMoves  cells the player played, in order
 * @param {{budget?: number}} [opts]
 * @returns {{
 *   seed: number,
 *   outcome: 'forfeit' | 'house' | null,
 *   steps: Array<{
 *     turn: number, playerMove: number|null, forced: 'line'|'fork'|null,
 *     condemned: number|null, housePlace: number|null,
 *     warrantsLeft: number, forfeit: boolean, board: (string|null)[]
 *   }>,
 *   condemnedSequence: number[]
 * }}
 */
export function replay(seed, playerMoves, opts = {}) {
  const match = createMatch(seed, opts);
  const steps = [];

  for (const cell of playerMoves) {
    if (match.outcome) break;
    const s = match.step(cell);
    if (!s) break;
    steps.push({
      turn: s.turn,
      playerMove: s.playerMove,
      forced: s.forced,
      condemned: s.condemnedCell,
      housePlace: s.houseCell,
      warrantsLeft: s.warrantsLeft,
      forfeit: s.forfeit,
      board: s.board,
    });
    if (s.outcome) break;
  }

  return {
    seed,
    outcome: match.outcome,
    steps,
    condemnedSequence: steps.filter(s => s.condemned != null).map(s => s.condemned),
  };
}
