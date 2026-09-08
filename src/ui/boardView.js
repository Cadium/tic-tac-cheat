// The board itself: render marks, run the stamp / steal animations, and the
// near-miss — the beat where you see the win before the House takes it.

const POSITIONS = ['Top left', 'Top center', 'Top right', 'Middle left', 'Center', 'Middle right', 'Bottom left', 'Bottom center', 'Bottom right'];
const NARRATE = { X: 'your X', O: 'house O' };

let boardEl;
let cells = [];
let reduced = false;

export function mountBoard(node, onCell) {
  boardEl = node;
  cells = [...node.querySelectorAll('[data-cell]')];
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', e => { reduced = e.matches; });

  // Roving tabindex: one tab stop for the grid, arrow keys move between cells.
  cells.forEach((cell, i) => {
    cell.tabIndex = i === 0 ? 0 : -1;
    cell.addEventListener('click', () => onCell(i));
    cell.addEventListener('keydown', e => handleGridKey(e, i));
  });
}

const MOVES = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };

function handleGridKey(e, i) {
  let next = i;
  if (e.key in MOVES) {
    const step = MOVES[e.key];
    const row = Math.floor(i / 3);
    if ((step === 1 || step === -1) && Math.floor((i + step) / 3) !== row) return; // don't wrap rows
    next = i + step;
  } else if (e.key === 'Home') next = row0(i);
  else if (e.key === 'End') next = row0(i) + 2;
  else return;
  if (next < 0 || next > 8) return;
  e.preventDefault();
  focusCell(next);
}
const row0 = i => Math.floor(i / 3) * 3;

function focusCell(i) {
  cells.forEach((c, j) => { c.tabIndex = j === i ? 0 : -1; });
  cells[i].focus();
}

/**
 * @param {(null|'X'|'O')[]} board
 * @param {object} opts
 * @param {number[]} [opts.changed]   cells to animate this frame
 * @param {boolean}  [opts.cheat]     animate `changed` as a theft, not a stamp
 * @param {Set<number>} [opts.condemned]
 * @param {boolean}  [opts.locked]    disable all cells (House turn / game over)
 * @param {number[]} [opts.winLine]   highlight the House's winning line
 */
export function renderBoard(board, opts = {}) {
  const { changed = [], cheat = false, condemned = new Set(), locked = false, winLine = [] } = opts;
  cells.forEach((cell, i) => {
    const mark = board[i];
    cell.className = mark ? mark.toLowerCase() : '';
    if (condemned.has(i)) cell.classList.add('condemned');
    if (winLine.includes(i)) cell.classList.add('winner');
    if (changed.includes(i)) {
      void cell.offsetWidth; // restart the animation
      cell.classList.add(cheat ? 'cheated' : 'ai-move');
      if (cheat && reduced) cell.classList.add('stolen-stamp');
    }
    cell.disabled = locked || condemned.has(i) || mark !== null;
    const state = mark ? NARRATE[mark] : condemned.has(i) ? 'condemned' : 'empty';
    cell.setAttribute('aria-label', `${POSITIONS[i]}, ${state}`);
  });

  // Keep the single tab stop on a cell that can actually take focus.
  if (!cells.some(c => c.tabIndex === 0 && !c.disabled)) {
    const first = cells.find(c => !c.disabled) ?? cells[0];
    cells.forEach(c => { c.tabIndex = c === first ? 0 : -1; });
  }
}

/** The near-miss: hold the completed line for a beat so the player feels it. */
export function nearMissSteal(line = []) {
  return new Promise(resolve => {
    line.forEach(i => cells[i]?.classList.add('so-close'));
    if (reduced) { setTimeout(() => { clearSoClose(line); resolve(); }, 120); return; }
    boardEl.classList.add('near-miss');
    setTimeout(() => {
      boardEl.classList.remove('near-miss');
      clearSoClose(line);
      resolve();
    }, 700);
  });
}

function clearSoClose(line) {
  line.forEach(i => cells[i]?.classList.remove('so-close'));
}

export const boardCells = () => cells;
