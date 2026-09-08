// The counter-measure bar under the board: your points, and five buttons you
// can spend them on. Disabled state and remaining-use count come straight from
// meta/countermeasures.js.

import { COUNTERMEASURES, canUse, remainingUses } from '../meta/countermeasures.js';

let root;
let onUse = () => {};

export function mountCountermeasureBar(el, handler) {
  root = el;
  onUse = handler;
  root.hidden = false;
  root.className = 'countermeasures';
  root.innerHTML = `
    <div class="cm-head">
      <p class="label">COUNTER-MEASURES</p>
      <span class="cm-points"><strong>0</strong> pts</span>
    </div>
    <div class="cm-grid">${COUNTERMEASURES.map(cm => `
      <button type="button" class="cm-btn" data-cm="${cm.id}" title="${cm.blurb}">
        <span class="cm-label">${cm.label}</span>
        <span class="cm-meta"><span class="cm-cost">${cm.cost}p</span><span class="cm-uses"></span></span>
      </button>`).join('')}
    </div>
    <p class="cm-blurb" aria-live="polite">Spend documented violations to fight back. None of it lets you win the board.</p>
  `;
  root.querySelectorAll('.cm-btn').forEach(btn => {
    btn.addEventListener('click', () => onUse(btn.dataset.cm));
    btn.addEventListener('pointerenter', () => showBlurb(btn.dataset.cm));
    btn.addEventListener('focus', () => showBlurb(btn.dataset.cm));
  });
}

function showBlurb(id) {
  const cm = COUNTERMEASURES.find(c => c.id === id);
  if (cm && root) root.querySelector('.cm-blurb').textContent = cm.blurb;
}

export function renderCountermeasureBar(run, context = {}) {
  if (!root) return;
  root.querySelector('.cm-points strong').textContent = String(run.points);
  for (const cm of COUNTERMEASURES) {
    const btn = root.querySelector(`[data-cm="${cm.id}"]`);
    const left = remainingUses(run, cm.id);
    btn.querySelector('.cm-uses').textContent = left ? `×${left}` : 'spent';
    btn.disabled = !canUse(run, cm.id, context);
    btn.classList.toggle('is-spent', left === 0);
  }
}
