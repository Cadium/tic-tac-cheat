// The 5×5 board: build the cells once, then re-render from match state.
// P2 is plain render + click. Threat highlight and the condemn stamp animation
// arrive in P3.

import { GRID } from '../engine/model.js';

const ROW_NAMES = ['top', 'upper', 'middle', 'lower', 'bottom'];
const COL_NAMES = ['far left', 'left', 'centre', 'right', 'far right'];
const N = GRID.N;

const cellName = i => `${ROW_NAMES[Math.floor(i / N)]} ${COL_NAMES[i % N]}`;

let cells = [];

export function mountBoard(node, onCell) {
  node.style.setProperty('--n', N);
  cells = Array.from({ length: GRID.cells }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.dataset.cell = String(i);
    b.setAttribute('role', 'gridcell');
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => onCell(i));
    node.append(b);
    return b;
  });
}

/**
 * @param {(null|'X'|'O')[]} board
 * @param {{condemned?: Set<number>, locked?: boolean, winLine?: number[]}} opts
 */
export function renderBoard(board, opts = {}) {
  const { condemned = new Set(), locked = false, winLine = [] } = opts;
  cells.forEach((cell, i) => {
    const mark = board[i];
    cell.classList.toggle('x', mark === 'X');
    cell.classList.toggle('o', mark === 'O');
    cell.classList.toggle('condemned', condemned.has(i));
    cell.classList.toggle('house-win', winLine.includes(i));
    cell.textContent = mark ?? '';
    cell.disabled = locked || mark != null || condemned.has(i);

    const state = mark === 'X' ? 'your mark'
      : mark === 'O' ? 'House mark'
      : condemned.has(i) ? 'condemned, out of play'
      : 'empty';
    cell.setAttribute('aria-label', `${cellName(i)} — ${state}`);
  });

  // keep a usable tab stop
  if (!cells.some(c => c.tabIndex === 0 && !c.disabled)) {
    const first = cells.find(c => !c.disabled) ?? cells[0];
    cells.forEach(c => { c.tabIndex = c === first ? 0 : -1; });
  }
}

export const boardCells = () => cells;
export { cellName };
