// A numbered record of every compelled condemnation. P2: plain rows. P3 gives
// each row its § flavour and slides it in.

import { cellName } from './boardView.js';

let listEl;
let n = 0;

export function mountIncidentLog(el) {
  listEl = el;
  reset();
}

export function reset() {
  n = 0;
  listEl.replaceChildren(
    Object.assign(document.createElement('li'), {
      className: 'empty',
      textContent: 'No incidents recorded.',
    }),
  );
}

/** Record one compelled condemnation of `cell`, with `warrantsLeft` remaining. */
export function recordCondemn(cell, warrantsLeft) {
  if (n === 0) listEl.replaceChildren();
  n += 1;
  const li = document.createElement('li');
  const tag = document.createElement('span');
  tag.className = 'n';
  tag.textContent = `§${n}`;
  li.append(
    tag,
    document.createTextNode(
      ` the square at ${cellName(cell)} is condemned — ` +
      `${warrantsLeft} warrant${warrantsLeft === 1 ? '' : 's'} left`,
    ),
  );
  listEl.append(li);
}

export const incidentCount = () => n;
