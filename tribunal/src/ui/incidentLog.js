// A numbered record of every compelled condemnation, in the House's own
// bureaucratic register voice. Each new row slides in (instant under
// prefers-reduced-motion).

import { cellName, gridRef } from './boardView.js';

let listEl;
let n = 0;
let budget = 0;
let reduced = false;

export function mountIncidentLog(el, warrantBudget) {
  listEl = el;
  budget = warrantBudget;
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  reset();
}

export function reset() {
  n = 0;
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = 'No incidents recorded.';
  listEl.replaceChildren(li);
}

/**
 * Record one compelled condemnation of `cell`, leaving `warrantsLeft` behind.
 * The spent warrant is numbered from 1.
 */
export function recordCondemn(cell, warrantsLeft) {
  if (n === 0) listEl.replaceChildren();
  n += 1;
  const warrantNo = budget - warrantsLeft;

  const li = document.createElement('li');
  const tag = document.createElement('span');
  tag.className = 'n';
  tag.textContent = `§ WARRANT ${warrantNo}`;
  li.append(
    tag,
    document.createTextNode(
      ` — the square at ${gridRef(cell)} (${cellName(cell)}) is condemned ` +
      'pending review. It is out of play.',
    ),
  );
  if (!reduced) {
    li.classList.add('sliding');
    const done = () => li.classList.remove('sliding');
    li.addEventListener('animationend', done, { once: true });
    setTimeout(done, 900);
  }
  listEl.append(li);
}

export const incidentCount = () => n;
