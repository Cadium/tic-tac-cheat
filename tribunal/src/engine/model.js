// The Tribunal match: the overload/forfeit loop, promoted from
// scripts/probe/model.mjs.
//
// The House never loses the board. When the player completes a line OR holds a
// fork the House is *compelled*: it spends one warrant to CONDEMN the crucial
// square and still places its own mark. It FORFEITS the moment it is compelled
// with no warrant left. Board full with no forfeit -> the House wins.
//
// `createMatch` is the single source of truth for those rules. `playMatch` is a
// thin batch driver over it (used by the balance-lock tests); `transcript.js`
// wraps it for deterministic replay. tests/tribunal-engine.test.mjs checks this
// stepwise core against the literal probe module over thousands of seeds.

import { makeGrid, empty, winner, completingCells, openSquares, mulberry, X, O } from './grid.js';
import { condemn, housePlace } from './house.js';

export { X, O };

/** The shipped board: 5x5, four in a row. */
export const GRID = makeGrid(5, 4);

/** The only difficulty the vertical slice ships. See probe-results.md. */
export const STANDARD_BUDGET = 4;

/** Is the House compelled to intervene? 'line' | 'fork' | null. */
export function isForced(board, g, condemned) {
  if (winner(board, g, X)) return 'line';
  if (completingCells(board, g, X, condemned).length >= 2) return 'fork';
  return null;
}

/**
 * A live match. `step(cell)` plays the player's mark in `cell` (falling back to
 * the first open square if `cell` is unusable, exactly as the probe does),
 * resolves the House's compelled response, and returns the resulting step:
 *
 *   { turn, playerMove, forced, condemnedCell, houseCell, warrantsLeft,
 *     forfeit, board, outcome }
 *
 * `outcome` is null until the match ends, then 'forfeit' or 'house'.
 */
export function createMatch(seed, { budget = STANDARD_BUDGET, grid = GRID } = {}) {
  const g = grid;
  const rng = mulberry(seed);
  const board = empty(g);
  const condemned = new Set();
  let warrants = budget, interventions = 0, turns = 0, outcome = null;

  const end = (result, extra) => {
    outcome = result;
    return {
      turn: turns, playerMove: null, forced: null, condemnedCell: null,
      houseCell: null, warrantsLeft: warrants, forfeit: false,
      board: board.slice(), outcome, ...extra,
    };
  };

  function step(requestedCell) {
    if (outcome) return null;

    const open = openSquares(board, condemned);
    if (!open.length) return end('house');

    let mv = requestedCell;
    if (mv == null || mv < 0 || board[mv] != null || condemned.has(mv)) mv = open[0];
    board[mv] = X;
    turns += 1;

    const forced = isForced(board, g, condemned);
    let condemnedCell = null;
    if (forced) {
      if (warrants <= 0) {
        outcome = 'forfeit';
        return {
          turn: turns, playerMove: mv, forced, condemnedCell: null,
          houseCell: null, warrantsLeft: 0, forfeit: true,
          board: board.slice(), outcome,
        };
      }
      condemnedCell = condemn(board, g, condemned, rng).cell;
      warrants -= 1;
      interventions += 1;
    }

    const houseCell = housePlace(board, g, condemned, rng);
    if (houseCell >= 0) board[houseCell] = O;
    if (winner(board, g, O)) outcome = 'house';

    return {
      turn: turns, playerMove: mv, forced, condemnedCell,
      houseCell, warrantsLeft: warrants, forfeit: false,
      board: board.slice(), outcome,
    };
  }

  return {
    step,
    grid: g,
    get board() { return board; },
    get condemned() { return condemned; },
    get warrants() { return warrants; },
    get interventions() { return interventions; },
    get turns() { return turns; },
    get outcome() { return outcome; },
  };
}

/**
 * Run a whole match with `chooseMove(board, grid, condemned, view)` picking every
 * player move. Returns { outcome, interventions, turns, board }. Mirrors
 * scripts/probe/model.mjs `playMatch` for CONDEMN.
 */
export function playMatch(chooseMove, seed, opts = {}) {
  const m = createMatch(seed, opts);
  let guard = 0;
  const cap = m.grid.cells * 3;
  while (!m.outcome && guard < cap) {
    const mv = chooseMove(m.board, m.grid, m.condemned, { budget: m.warrants, interventions: m.interventions });
    m.step(mv);
    guard += 1;
  }
  return { outcome: m.outcome || 'house', interventions: m.interventions, turns: m.turns, board: m.board.slice() };
}
