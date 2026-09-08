// The INCIDENT REPORT panel. Numbered violations, newest first. With Referee Cam
// on, each row also shows the statute the referee invoked. At tier 5 the House
// starts editing its own entries to name you as the offender.

import { pick, makeRng } from '../engine/board.js';

const REWRITE_RNG = makeRng(0xC0FFEE);
const BLAME = [
  'Patron became agitated and was asked to calm down.',
  'Patron attempted an unsanctioned line. Corrected without incident.',
  'Patron disputed a ruling. Ruling stands.',
  'No violation occurred. Patron is mistaken.',
  'Clerical note: the patron was, on reflection, offside the entire time.',
];

let listEl;
let countEl;
let n = 0;
let cam = false;

export function mountIncidentLog(list, count) {
  listEl = list;
  countEl = count;
}

export function resetIncidentLog() {
  n = 0;
  listEl.innerHTML = '<li class="empty-log">Nothing suspicious yet.<br><span>Give it a second.</span></li>';
  if (countEl) countEl.textContent = '0 violations';
}

export function reportIncident(message, { statute = '', turn = null } = {}) {
  if (!n) listEl.replaceChildren();
  const li = document.createElement('li');
  li.dataset.number = String(++n).padStart(2, '0');
  const text = document.createElement('span');
  text.className = 'incident-text';
  text.textContent = message;
  li.append(text);
  if (statute) {
    const s = document.createElement('span');
    s.className = 'statute';
    s.textContent = statute + (turn ? ` · turn ${turn}` : '');
    s.hidden = !cam;
    li.append(s);
  }
  listEl.prepend(li);
  if (countEl) countEl.textContent = `${n} violation${n === 1 ? '' : 's'}`;
  return li;
}

/** Tier-5 obstruction: the House edits its most recent admission to blame you. */
export function rewriteLastIncident() {
  const li = listEl.querySelector('li:not(.empty-log)');
  if (!li) return;
  const text = li.querySelector('.incident-text');
  if (!text || li.classList.contains('rewritten')) return;
  text.dataset.original = text.textContent;
  text.textContent = pick(REWRITE_RNG, BLAME);
  li.classList.add('rewritten');
  tagLastIncident('AMENDED BY THE HOUSE', 'amended');
}

export function setRefereeCam(on) {
  cam = Boolean(on);
  listEl?.querySelectorAll('.statute').forEach(s => { s.hidden = !cam; });
}

/** Counter-measure undo: drop the newest rows back to a prior count. */
export function truncateIncidentsTo(count) {
  const rows = [...listEl.querySelectorAll('li:not(.empty-log)')]; // newest first
  const toRemove = Math.max(0, rows.length - count);
  for (let i = 0; i < toRemove; i++) rows[i].remove();
  n = Math.max(0, count);
  if (countEl) countEl.textContent = n ? `${n} violation${n === 1 ? '' : 's'}` : '0 violations';
  if (!n) resetIncidentLog();
}

/** Tag the most recent incident (e.g. LEAKED, VOID). */
export function tagLastIncident(label, cls = 'tagged') {
  const li = listEl.querySelector('li:not(.empty-log)');
  if (!li || li.querySelector('.incident-tag')) return;
  const tag = document.createElement('span');
  tag.className = 'incident-tag ' + cls;
  tag.textContent = label;
  li.querySelector('.incident-text')?.after(tag);
  li.classList.add('has-tag');
}

export const incidentCount = () => n;
