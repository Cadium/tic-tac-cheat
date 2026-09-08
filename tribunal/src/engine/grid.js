// Generalised N x N board with a K-in-a-row target. Pure helpers only.
//
// Promoted verbatim from scripts/probe/grid.mjs — the module the Tribunal Mode
// design was validated against. Do not change a heuristic here without re-running
// scripts/probe/run.mjs and scripts/probe/confirm.mjs.

export const X = 'X', O = 'O';

export function makeGrid(N, K) {
  const cells = N * N;
  const lines = [];
  const at = (r, c) => r * N + c;
  // rows, cols, and both diagonal directions, all windows of length K
  for (let r = 0; r < N; r++) for (let c = 0; c + K <= N; c++) lines.push(Array.from({ length: K }, (_, i) => at(r, c + i)));
  for (let c = 0; c < N; c++) for (let r = 0; r + K <= N; r++) lines.push(Array.from({ length: K }, (_, i) => at(r + i, c)));
  for (let r = 0; r + K <= N; r++) for (let c = 0; c + K <= N; c++) lines.push(Array.from({ length: K }, (_, i) => at(r + i, c + i)));
  for (let r = 0; r + K <= N; r++) for (let c = K - 1; c < N; c++) lines.push(Array.from({ length: K }, (_, i) => at(r + i, c - i)));

  const linesThrough = Array.from({ length: cells }, () => []);
  lines.forEach((L, li) => L.forEach(i => linesThrough[i].push(li)));

  // centre-weighted square priority
  const weight = Array.from({ length: cells }, (_, i) => {
    const r = Math.floor(i / N), c = i % N;
    const dr = Math.min(r, N - 1 - r), dc = Math.min(c, N - 1 - c);
    return dr + dc + linesThrough[i].length * 0.1;
  });

  return { N, K, cells, lines, linesThrough, weight };
}

export const empty = g => Array(g.cells).fill(null);
export const openSquares = (board, condemned) => {
  const out = [];
  for (let i = 0; i < board.length; i++) if (board[i] == null && !condemned.has(i)) out.push(i);
  return out;
};

export function winner(board, g, mark) {
  for (const L of g.lines) if (L.every(i => board[i] === mark)) return L;
  return null;
}

/** empty, non-condemned cells that complete a line for `mark` (K-1 of mark + 1 gap). */
export function completingCells(board, g, mark, condemned) {
  const set = new Set();
  for (const L of g.lines) {
    let m = 0, gap = -1, blocked = false;
    for (const i of L) {
      if (board[i] === mark) m++;
      else if (board[i] == null && !condemned.has(i)) { if (gap === -1) gap = i; else { blocked = true; break; } }
      else { blocked = true; break; }
    }
    if (!blocked && m === g.K - 1 && gap !== -1) set.add(gap);
  }
  return [...set];
}

/** lines with exactly `mark` count `n` and the rest open (developing threats). */
export function linesWith(board, g, mark, n, condemned) {
  const out = [];
  for (const L of g.lines) {
    let m = 0, open = 0;
    for (const i of L) {
      if (board[i] === mark) m++;
      else if (board[i] == null && !condemned.has(i)) open++;
      else { m = -99; break; }
    }
    if (m === n && open === g.K - n) out.push(L);
  }
  return out;
}

/** empty cells where playing `mark` yields >=2 completing cells (a fork). */
export function forkSquares(board, g, mark, condemned) {
  const out = [];
  for (const i of openSquares(board, condemned)) {
    board[i] = mark;
    if (completingCells(board, g, mark, condemned).length >= 2) out.push(i);
    board[i] = null;
  }
  return out;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rng, arr) => (arr.length ? arr[Math.floor(rng() * arr.length)] : -1);
