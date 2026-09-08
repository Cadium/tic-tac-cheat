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
  cells.forEach((cell, i) => cell.addEventListener('click', () => onCell(i)));
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
