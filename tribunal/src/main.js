// Tribunal Mode — the match loop, paced so the compelled condemnation reads:
// player mark -> threat highlight -> "COMPELLED" -> the CONDEMN stamp + warrant
// struck + incident row -> the O drops. The engine still resolves each turn in
// one atomic step(); this file only stages what that step already decided.

import { winner } from './engine/grid.js';
import { createMatch, GRID, STANDARD_BUDGET } from './engine/model.js';
import { playerThreat } from './engine/threats.js';
import {
  mountBoard, renderBoard, cellName, gridRef,
  markLanded, stampCondemn, oDropped, highlightThreat, clearThreat,
  freezeBoard, thawBoard,
} from './ui/boardView.js';
import { mountWarrants, render as renderWarrants, strike as strikeWarrant } from './ui/warrants.js';
import { mountIncidentLog, reset as resetLog, recordCondemn } from './ui/incidentLog.js';
import { sfx, setSoundEnabled, isSoundEnabled } from './ui/sound.js';

const $ = s => document.querySelector(s);
const statusEl = $('#status');
const seedLineEl = $('#seed-line');
const SOUND_KEY = 'tribunal:sound';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let match;
let busy = false;
let generation = 0;

// ---- pacing ----------------------------------------------------------
function beat(gen, ms) {
  const wait = reduced() ? Math.min(ms, 140) : ms;
  return new Promise(resolve => setTimeout(() => resolve(gen === generation), wait));
}

// ---- seed -----------------------------------------------------------
function readSeedParam() {
  const raw = new URLSearchParams(location.search).get('seed');
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
}
const randomSeed = () => (Math.random() * 0x100000000) >>> 0;

// ---- status --------------------------------------------------------
function setStatus(text, { win = false, compelled = false } = {}) {
  statusEl.textContent = text;
  statusEl.classList.toggle('win', win);
  statusEl.classList.toggle('compelled', compelled);
}
const warrantsPhrase = n => (n === 0 ? 'no warrants left' : `${n} warrant${n === 1 ? '' : 's'} left`);

// ---- the loop -----------------------------------------------------
async function play(cell) {
  if (busy || match.outcome) return;
  busy = true;
  const gen = generation;

  const preBoard = match.board.slice();
  const preCondemned = new Set(match.condemned);
  const step = match.step(cell);
  if (!step) { busy = false; return; }

  // 1 — the player's mark lands
  const afterMark = preBoard.slice();
  afterMark[step.playerMove] = 'X';
  renderBoard(afterMark, { condemned: preCondemned, locked: true });
  markLanded(step.playerMove);
  sfx('tap');

  if (step.forced) {
    // 2 — show what the player threatened, and the square about to be sealed
    const threat = playerThreat(afterMark, GRID, preCondemned);
    highlightThreat({
      lineCells: threat.lineCells,
      gaps: [...new Set([...threat.gaps, step.condemnedCell].filter(c => c != null))],
    });
    setStatus(step.forced === 'line' ? 'FOUR IN A ROW —' : 'TWO THREATS AT ONCE —', { compelled: true });
    if (!await beat(gen, 620)) return;

    if (step.forfeit) {
      // 3f — the forfeit
      freezeBoard();
      setStatus('NO WARRANT ON FILE.', { compelled: true });
      sfx('lose');
      if (!await beat(gen, 820)) return;
      clearThreat();
      thawBoard();
      renderBoard(step.board, { condemned: match.condemned, locked: true, playerWin: threat.lineCells });
      setStatus('THE HOUSE FORFEITS. You forced its hand with nothing left to spend.', { win: true });
      sfx('win');
      seedLineEl.textContent += ' · forfeit forced';
      busy = false;
      return;
    }

    // 3 — compelled
    setStatus('COMPELLED.', { compelled: true });
    sfx('compelled');
    if (!await beat(gen, 460)) return;

    // 4 — the CONDEMN stamp, the struck warrant, the incident row
    clearThreat();
    renderBoard(afterMark, { condemned: match.condemned, locked: true });
    stampCondemn(step.condemnedCell);
    strikeWarrant(match.warrants);
    sfx('stamp');
    recordCondemn(step.condemnedCell, step.warrantsLeft);
    setStatus(
      `The House condemns ${gridRef(step.condemnedCell)} (${cellName(step.condemnedCell)}). ` +
      `Warrant ${STANDARD_BUDGET - match.warrants} spent — ${warrantsPhrase(match.warrants)}.`,
      { compelled: true },
    );
    if (!await beat(gen, 540)) return;
  }

  // 5 — the House places its O
  const over = Boolean(match.outcome);
  const winLine = match.outcome === 'house' ? (winner(step.board, GRID, 'O') || []) : [];
  renderBoard(step.board, { condemned: match.condemned, locked: over, winLine });
  if (step.houseCell != null) { oDropped(step.houseCell); sfx('drop'); }

  if (match.outcome === 'house') {
    setStatus('THE HOUSE WINS THE BOARD. It never had to spend everything.');
    sfx('lose');
  } else if (step.forced) {
    setStatus(`Your move. The House has ${warrantsPhrase(match.warrants)}.`);
  } else {
    setStatus('Your move.');
  }
  busy = false;
}

// ---- new match ---------------------------------------------------
function start(seed, viaLink) {
  generation += 1;
  busy = false;
  match = createMatch(seed, { budget: STANDARD_BUDGET });
  thawBoard();
  clearThreat();
  mountWarrants($('#warrants'), STANDARD_BUDGET);
  resetLog();
  renderWarrants(STANDARD_BUDGET);
  renderBoard(match.board, { condemned: match.condemned, locked: false });
  setStatus('Your move.');
  seedLineEl.textContent =
    `seed ${seed} · ${STANDARD_BUDGET} warrants${viaLink ? ' · shared link' : ''}`;
}

function newMatch() {
  const url = new URL(location.href);
  url.searchParams.delete('seed');
  history.replaceState(null, '', url);
  start(randomSeed(), false);
}

// ---- sound toggle ----------------------------------------------
function applySound(on) {
  setSoundEnabled(on);
  const btn = $('#sound-toggle');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Sound on' : 'Sound off';
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

// ---- boot -----------------------------------------------------
mountBoard($('#board'), play);
mountIncidentLog($('#incident-log'), STANDARD_BUDGET);
$('#new-match').addEventListener('click', newMatch);
$('#sound-toggle').addEventListener('click', () => applySound(!isSoundEnabled()));

let soundPref = false;
try { soundPref = localStorage.getItem(SOUND_KEY) === '1'; } catch { /* private mode */ }
applySound(soundPref);

const linked = readSeedParam();
start(linked ?? randomSeed(), linked != null);
