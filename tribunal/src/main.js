// Tribunal Mode — the match loop. Click a cell -> the engine resolves the
// player's mark and the House's compelled response -> re-render from match
// state. P2: plain. P3 makes the compelled beat and the forfeit legible.

import { winner } from './engine/grid.js';
import { createMatch, GRID, STANDARD_BUDGET } from './engine/model.js';
import { mountBoard, renderBoard, cellName } from './ui/boardView.js';
import { mountWarrants, render as renderWarrants } from './ui/warrants.js';
import { mountIncidentLog, reset as resetLog, recordCondemn } from './ui/incidentLog.js';

const $ = s => document.querySelector(s);
const statusEl = $('#status');
const seedLineEl = $('#seed-line');

let match;

// ---- seed ---------------------------------------------------------------
function readSeedParam() {
  const raw = new URLSearchParams(location.search).get('seed');
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
}
const randomSeed = () => (Math.random() * 0x100000000) >>> 0;

// ---- render ------------------------------------------------------------
function paint() {
  const over = Boolean(match.outcome);
  const winLine = match.outcome === 'house' ? (winner(match.board, GRID, 'O') || []) : [];
  renderBoard(match.board, { condemned: match.condemned, locked: over, winLine });
  renderWarrants(match.warrants);
}

function setStatus(text, won = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('win', won);
}

// ---- loop ------------------------------------------------------------
function play(cell) {
  if (match.outcome) return;

  const step = match.step(cell);
  if (!step) return;

  if (step.condemnedCell != null) recordCondemn(step.condemnedCell, step.warrantsLeft);
  paint();

  if (match.outcome === 'forfeit') {
    setStatus('THE HOUSE FORFEITS. You emptied the warrants and forced its hand once more.', true);
  } else if (match.outcome === 'house') {
    setStatus('THE HOUSE WINS THE BOARD. It never had to spend everything.');
  } else if (step.forced) {
    setStatus(
      `COMPELLED — the House condemns ${cellName(step.condemnedCell)}. ` +
      `${match.warrants} warrant${match.warrants === 1 ? '' : 's'} left.`,
    );
  } else {
    setStatus('Your move.');
  }
}

// ---- new match -------------------------------------------------------
function start(seed, viaLink) {
  match = createMatch(seed, { budget: STANDARD_BUDGET });
  mountWarrants($('#warrants'), STANDARD_BUDGET);
  resetLog();
  setStatus('Your move.');
  paint();
  seedLineEl.textContent =
    `seed ${seed} · ${STANDARD_BUDGET} warrants${viaLink ? ' · shared link' : ''}`;
}

function newMatch() {
  const url = new URL(location.href);
  url.searchParams.delete('seed');
  history.replaceState(null, '', url);
  start(randomSeed(), false);
}

// ---- boot ----------------------------------------------------------
mountBoard($('#board'), play);
mountIncidentLog($('#incident-log'));
$('#new-match').addEventListener('click', newMatch);

const linked = readSeedParam();
start(linked ?? randomSeed(), linked != null);
