// The EVIDENCE tally in the scorecard — Exhibits A–E and their counts, plus how
// close you are to being able to press charges.

import { EXHIBIT_CLASSES, DISTINCT_TO_CHARGE, TOTAL_TO_CHARGE } from '../engine/evidence.js';

let root;

export function mountEvidenceTally(el) {
  root = el;
  root.hidden = false;
  root.className = 'evidence';
}

export function renderEvidenceTally(bank) {
  if (!root) return;
  const rows = Object.values(EXHIBIT_CLASSES).map(cls => {
    const e = bank.exhibits[cls.id];
    const n = e?.count ?? 0;
    const flags = e?.corroborated ? ' <span class="corroborated">corroborated</span>' : '';
    return `<li class="${n ? 'has' : ''}"><span class="ex-letter">${cls.letter}</span><span class="ex-label">${cls.label}</span><span class="ex-count">${n}</span>${flags}</li>`;
  }).join('');

  const distinct = Object.keys(bank.exhibits).length;
  const ready = distinct >= DISTINCT_TO_CHARGE || bank.total >= TOTAL_TO_CHARGE;
  const progress = ready
    ? 'CASE READY — you can press charges'
    : `${distinct}/${DISTINCT_TO_CHARGE} distinct exhibits · ${bank.total}/${TOTAL_TO_CHARGE} total`;

  root.innerHTML = `
    <div class="log-head"><p class="label">EVIDENCE</p><span>${bank.total} logged</span></div>
    <ul class="exhibit-list">${rows}</ul>
    <p class="evidence-progress ${ready ? 'ready' : ''}">${progress}</p>
  `;
}
