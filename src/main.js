// Match loop, on the v2 engine. Phase 2 wires a single escalating match with the
// near-miss steal, the House voice, the incident log, and Referee Cam. The run
// economy (composure meter, counter-measures, the tribunal) lands in later
// phases — the evidence bank is already accumulating for them.

import { emptyBoard, winner, openSquares, makeRng } from './engine/board.js';
import { planTurn } from './engine/referee.js';
import { tierForMatch } from './engine/tiers.js';
import { makeComposure } from './engine/composure.js';
import { makeEvidenceBank, record as recordEvidence, canPressCharges } from './engine/evidence.js';
import { mountBoard, renderBoard, nearMissSteal } from './ui/boardView.js';
import { mountIncidentLog, resetIncidentLog, reportIncident, rewriteLastIncident, setRefereeCam } from './ui/incidentLog.js';
import { mountToast, showToast, hideToast } from './ui/toast.js';
import { houseVoice } from './ui/houseVoice.js';
import { sfx, setSoundEnabled } from './ui/sound.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- persisted preferences (formalised in meta/persistence.js in Phase 3) ----
const PREF = 'ttc:prefs';
const prefs = load(PREF, { refereeCam: false, sound: false });
function load(k, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...fallback }; }
}
function savePrefs() {
  try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* private mode */ }
}

// ---- session state ----------------------------------------------------------
const rng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0);
const composure = makeComposure();
const evidence = makeEvidenceBank();

let board = emptyBoard();
let condemned = new Set();
let turn = 0;
let previous = '';
let busy = false;
let done = false;
let generation = 0;
let matchNumber = 1;
let houseWins = 0;
let incidentsThisMatch = 0;
let appealDisabled = false;

// ---- render helpers --------------------------------------------------------
function status(text) { $('#status').textContent = text; }

function setTurnPill(label, ai = false) {
  $('#turn-label').textContent = label;
  const pill = $('.turn-pill');
  pill.classList.toggle('ai', ai);
  pill.style.visibility = label ? 'visible' : 'hidden';
}

function paint(changed = [], cheat = false) {
  renderBoard(board, {
    changed, cheat, condemned,
    locked: busy || done,
    winLine: done ? (winner(board, 'O') ?? []) : [],
  });
}

// ---- the loop -------------------------------------------------------------
async function play(index) {
  if (busy || done || board[index] != null || condemned.has(index)) return;
  busy = true;
  const round = generation;

  board[index] = 'X';
  sfx('tap');
  paint([index], false);

  const threatened = Boolean(winner(board, 'X'));
  const band = composure.band().id;

  if (threatened) {
    status('THREE IN A ROW —');
    sfx('chime');
    await nearMissSteal(winner(board, 'X'));
    if (round !== generation) return;
    sfx('whistle');
    composure.nudge(-6);
  }

  const tier = tierForMatch(matchNumber, composure.band().id);
  const plan = planTurn(board, { turn: ++turn, previous, rng, tier, condemned });
  for (const c of plan.condemned) condemned.add(c); // reflect condemnations as they animate

  if (threatened) {
    const correction = plan.steps.shift();
    board = [...correction.board];
    applyCheatStep(correction);
    sfx('steal');
  } else {
    status(houseVoice.thinking(band));
  }

  setTurnPill('HOUSE TURN', true);
  await wait(threatened ? 250 : 450 + rng() * 250);
  if (round !== generation) return;

  for (const step of plan.steps) {
    board = [...step.board];
    if (step.cheatEvent) {
      applyCheatStep(step);
      sfx(step.cheatEvent.type === 'doubleDealing' ? 'stamp' : 'steal');
    } else {
      paint(step.changed, false);
      if (step.message) status(step.message);
      else if (step.cue) status(step.cue);
      if (step.changed.length) sfx('stamp');
    }
    await wait(reducedDelay(step.delay));
    if (round !== generation) return;
  }

  previous = plan.kind;
  busy = false;

  if (winner(board, 'O')) endMatch();
  else {
    status(houseVoice.yourMove(composure.band().id, turn));
    setTurnPill('YOUR TURN');
    paint();
  }
}

function applyCheatStep(step) {
  const ev = step.cheatEvent;
  paint(step.changed, true);
  incidentsThisMatch++;

  if (ev.type === 'obstruction') {
    if (ev.act === 'disableAppeal') { appealDisabled = true; $('#appeal').disabled = true; }
    if (ev.act === 'rewrite') rewriteLastIncident();
  }

  reportIncident(step.message, { statute: ev.statute, turn: ev.turn ?? turn });
  recordEvidence(evidence, { ...ev, turn });
  status(step.message);

  // Press Charges availability is surfaced fully in Phase 4; keep the hook live.
  if (canPressCharges(evidence)) $('#press-charges').hidden = false;
}

function reducedDelay(ms) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reduced ? Math.min(ms, 80) : ms;
}

function endMatch() {
  done = true;
  houseWins++;
  $('#ai-score').textContent = String(houseWins);
  if (incidentsThisMatch === 0) composure.nudge(3); // a clean win emboldens it
  status(houseVoice.won(composure.band().id, incidentsThisMatch > 0));
  setTurnPill('');
  showToast('The House wins. What are the odds?');
  sfx('buzzer');
  paint();
}

function newMatch() {
  generation++;
  matchNumber++;
  board = emptyBoard();
  condemned = new Set();
  turn = 0;
  previous = '';
  busy = false;
  done = false;
  incidentsThisMatch = 0;
  appealDisabled = false;
  $('#appeal').disabled = false;
  $('#match-number').textContent = String(matchNumber).padStart(3, '0');
  resetIncidentLog();
  hideToast();
  status('Your move, hotshot.');
  setTurnPill('YOUR TURN');
  paint();
}

// ---- wiring --------------------------------------------------------------
mountBoard($('#board'), i => void play(i));
mountIncidentLog($('#incident-log'), $('#incident-count'));
mountToast($('#toast'));

$('#new-game').addEventListener('click', newMatch);

$('#appeal').addEventListener('click', () => {
  if (appealDisabled) return;
  houseWins++;
  $('#ai-score').textContent = String(houseWins);
  incidentsThisMatch++;
  const msg = houseVoice.appeal(composure.band().id);
  reportIncident(msg, { statute: '§8 APPEALS', turn });
  recordEvidence(evidence, { exhibitClass: 'obstruction', statute: '§8 APPEALS', message: msg, turn });
  composure.nudge(-2);
  showToast('APPEAL DENIED · HOUSE +1');
  sfx('register');
  if (canPressCharges(evidence)) $('#press-charges').hidden = false;
});

const camBtn = $('#referee-cam');
function applyCam() {
  camBtn.setAttribute('aria-pressed', String(prefs.refereeCam));
  setRefereeCam(prefs.refereeCam);
}
camBtn.addEventListener('click', () => {
  prefs.refereeCam = !prefs.refereeCam;
  savePrefs();
  applyCam();
});

setSoundEnabled(prefs.sound);
applyCam();
$('#year').textContent = String(new Date().getFullYear());
paint();
