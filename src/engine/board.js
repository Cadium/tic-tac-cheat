// Pure board helpers + a seeded RNG. No DOM, no side effects — everything the
// tests lean on lives here.

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** The first winning line for `mark`, or undefined. */
export const winner = (board, mark) =>
  LINES.find(line => line.every(i => board[i] === mark));

/** All winning lines for `mark` (tier-4 / double-line handling). */
export const winningLines = (board, mark) =>
  LINES.filter(line => line.every(i => board[i] === mark));

/** Indices holding `mark` (pass null for empty squares). */
export const squares = (board, mark) =>
  board.flatMap((value, i) => (value === mark ? [i] : []));

/** Empty squares that are still in play (not condemned by the referee). */
export const openSquares = (board, condemned = new Set()) =>
  squares(board, null).filter(i => !condemned.has(i));

export const isFull = (board, condemned = new Set()) =>
  openSquares(board, condemned).length === 0;

/** mulberry32 — tiny deterministic PRNG so runs (and tests) are reproducible. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform pick, biased-safe: never returns undefined for a non-empty array. */
export const pick = (rng, values) =>
  values.length ? values[Math.min(values.length - 1, Math.floor(rng() * values.length))] : undefined;

export const emptyBoard = () => Array(9).fill(null);
