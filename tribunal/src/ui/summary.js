// The match summary: verdict, the shape of how it ended, and the two ways on —
// replay this exact seed, or take a fresh one. The replay link is a local
// convenience (same seed, same match), not a social feature.

import { gridRef } from './boardView.js';
import { STANDARD_BUDGET } from '../engine/model.js';

let els;
let currentSeed = null;

export function mountSummary(root, { onReplay, onNew }) {
  els = {
    root,
    verdict: root.querySelector('#summary-verdict'),
    turns: root.querySelector('#summary-turns'),
    forced: root.querySelector('#summary-forced'),
    condemned: root.querySelector('#summary-condemned'),
    replay: root.querySelector('#summary-replay'),
    fresh: root.querySelector('#summary-new'),
    copy: root.querySelector('#summary-copy'),
  };
  els.replay.addEventListener('click', () => onReplay(currentSeed));
  els.fresh.addEventListener('click', () => onNew());
  els.copy.addEventListener('click', copyLink);
}

/**
 * @param {{outcome:'forfeit'|'house', turns:number, warrantsSpent:number,
 *          condemnedSequence:number[], seed:number}} result
 */
export function showSummary({ outcome, turns, warrantsSpent, condemnedSequence, seed }) {
  currentSeed = seed;
  const won = outcome === 'forfeit';

  els.verdict.textContent = won ? 'THE HOUSE FORFEITS' : 'THE HOUSE WINS THE BOARD';
  els.root.classList.toggle('won', won);
  els.turns.textContent = String(turns);
  els.forced.textContent = won
    ? `all ${STANDARD_BUDGET} — then one more it could not answer`
    : `${warrantsSpent} of ${STANDARD_BUDGET}`;
  els.condemned.textContent = condemnedSequence.length
    ? condemnedSequence.map(gridRef).join('  →  ')
    : 'none — the House never had to';

  resetCopyLabel();
  els.root.hidden = false;
  els.verdict.focus();
}

export function hideSummary() {
  if (!els) return;
  els.root.hidden = true;
  els.root.classList.remove('won');
}

function replayUrl() {
  const u = new URL(location.href);
  u.search = `?seed=${currentSeed}`;
  u.hash = '';
  return u.toString();
}

async function copyLink() {
  if (currentSeed == null) return;
  const url = replayUrl();
  try {
    await navigator.clipboard.writeText(url);
    els.copy.textContent = 'Link copied';
  } catch {
    els.copy.textContent = url;
  }
  setTimeout(resetCopyLabel, 2500);
}

function resetCopyLabel() {
  els.copy.textContent = 'Copy replay link';
}
