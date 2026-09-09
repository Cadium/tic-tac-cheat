// The 5×5 board: build the cells once, then re-render from match state.
// renderBoard() paints the durable state; the pulse / highlight helpers layer
// one-shot animation on top and are no-ops under prefers-reduced-motion.

import { GRID } from '../engine/model.js';

const ROW_NAMES = ['top', 'upper', 'middle', 'lower', 'bottom'];
const COL_NAMES = ['far left', 'left', 'centre', 'right', 'far right'];
const N = GRID.N;

const cellName = i => `${ROW_NAMES[Math.floor(i / N)]} ${COL_NAMES[i % N]}`;
const gridRef = i => `R${Math.floor(i / N) + 1}C${(i % N) + 1}`;

let cells = [];
let boardEl;
let reduced = false;
let keyboardMode = false;

export function mountBoard(node, onCell) {
  boardEl = node;
  node.style.setProperty('--n', N);
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.matchMedia?.('(prefers-reduced-motion: reduce)')
    .addEventListener?.('change', e => { reduced = e.matches; });

  cells = Array.from({ length: GRID.cells }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.dataset.cell = String(i);
    b.setAttribute('role', 'gridcell');
    b.setAttribute('aria-rowindex', String(Math.floor(i / N) + 1));
    b.setAttribute('aria-colindex', String((i % N) + 1));
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => onCell(i));
    b.addEventListener('keydown', e => handleGridKey(e, i));
    node.append(b);
    return b;
  });

  node.addEventListener('keydown', () => { keyboardMode = true; });
  node.addEventListener('pointerdown', () => { keyboardMode = false; });
}

/**
 * After the board becomes interactive again, pull focus back to a playable cell
 * — but only for keyboard players, so a mouse click never sprouts a focus ring.
 */
export function restoreBoardFocus() {
  if (!keyboardMode) return;
  const active = document.activeElement;
  const lost = active === document.body
    || (active instanceof HTMLElement && active.classList.contains('cell') && active.disabled);
  if (!lost) return;
  const target = cells.find(c => c.tabIndex === 0 && !c.disabled) ?? cells.find(c => !c.disabled);
  target?.focus();
}

// Roving tabindex: the grid is one tab stop; arrow keys move within it, skipping
// cells that are already played and never wrapping rows. Home/End jump to the
// nearest playable cell at the ends of the current row.
const STEP = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: N, ArrowUp: -N };

function handleGridKey(e, i) {
  const row = Math.floor(i / N);
  const horizontal = ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key);
  let dir = 0;
  let from = i;

  if (e.key in STEP) {
    dir = STEP[e.key];
  } else if (e.key === 'Home') {
    dir = 1; from = row * N - 1;
  } else if (e.key === 'End') {
    dir = -1; from = row * N + N;
  } else {
    return;
  }

  let next = from + dir;
  while (next >= 0 && next < cells.length) {
    if (horizontal && Math.floor(next / N) !== row) break; // no row wrap
    if (!cells[next].disabled) { e.preventDefault(); focusCell(next); return; }
    next += dir;
  }
  if (from !== i) e.preventDefault(); // Home/End with nothing playable: swallow
}

function focusCell(i) {
  cells.forEach((c, j) => { c.tabIndex = j === i ? 0 : -1; });
  cells[i].focus();
}

/**
 * @param {(null|'X'|'O')[]} board
 * @param {{condemned?: Set<number>, locked?: boolean, winLine?: number[], playerWin?: number[]}} opts
 */
export function renderBoard(board, opts = {}) {
  const { condemned = new Set(), locked = false, winLine = [], playerWin = [] } = opts;
  cells.forEach((cell, i) => {
    const mark = board[i];
    cell.classList.toggle('x', mark === 'X');
    cell.classList.toggle('o', mark === 'O');
    cell.classList.toggle('condemned', condemned.has(i));
    cell.classList.toggle('house-win', winLine.includes(i));
    cell.classList.toggle('player-win', playerWin.includes(i));
    cell.textContent = mark ?? '';
    cell.disabled = locked || mark != null || condemned.has(i);

    const state = mark === 'X' ? 'your mark'
      : mark === 'O' ? 'House mark'
      : condemned.has(i) ? 'condemned, out of play'
      : 'empty';
    cell.setAttribute('aria-label', `${cellName(i)} — ${state}`);
  });

  if (!cells.some(c => c.tabIndex === 0 && !c.disabled)) {
    const first = cells.find(c => !c.disabled) ?? cells[0];
    cells.forEach(c => { c.tabIndex = c === first ? 0 : -1; });
  }
}

// ---- one-shot animation ------------------------------------------------
function pulse(i, cls) {
  const cell = cells[i];
  if (!cell || reduced) return;
  cell.classList.remove(cls);
  void cell.offsetWidth; // restart
  cell.classList.add(cls);
  // animationend clears it; the timeout is a fallback for a tab backgrounded
  // mid-animation, where the event never fires.
  const done = () => cell.classList.remove(cls);
  cell.addEventListener('animationend', done, { once: true });
  setTimeout(done, 900);
}

export const markLanded = i => pulse(i, 'landed');
export const stampCondemn = i => pulse(i, 'stamping');
export const oDropped = i => pulse(i, 'dropping');

/** Glow the near-complete lines and ring the squares that would finish them. */
export function highlightThreat({ lineCells = [], gaps = [] } = {}) {
  clearThreat();
  lineCells.forEach(i => cells[i]?.classList.add('threat'));
  gaps.forEach(i => cells[i]?.classList.add('crucial'));
}

export function clearThreat() {
  cells.forEach(c => c.classList.remove('threat', 'crucial'));
}

export function freezeBoard() { boardEl.classList.add('frozen'); }
export function thawBoard() { boardEl.classList.remove('frozen'); }

export const boardCells = () => cells;
export { cellName, gridRef };
