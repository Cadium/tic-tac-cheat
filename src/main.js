// Match loop + the run economy. The engine decides how the House cheats; this
// file runs the loop, files the evidence, and lets you spend it fighting back.
// The tribunal, intermission screen, and global counter arrive in later phases.

import { emptyBoard, winner, makeRng } from './engine/board.js';
import { planTurn } from './engine/referee.js';
import { TIERS } from './engine/tiers.js';
import { distinctClasses } from './engine/evidence.js';
import { makeRun } from './meta/run.js';
import { loadPrefs, savePrefs, loadRun, saveRun } from './meta/persistence.js';
import { canUse, commitUse } from './meta/countermeasures.js';
import { mountBoard, renderBoard, nearMissSteal } from './ui/boardView.js';
import {
  mountIncidentLog, resetIncidentLog, reportIncident, rewriteLastIncident,
  setRefereeCam, incidentCount, truncateIncidentsTo, tagLastIncident,
} from './ui/incidentLog.js';
import { mountToast, showToast, hideToast } from './ui/toast.js';
import { houseVoice } from './ui/houseVoice.js';
import { sfx, setSoundEnabled } from './ui/sound.js';
import { mountComposureMeter, renderComposure } from './ui/composureMeter.js';
import { mountEvidenceTally, renderEvidenceTally } from './ui/evidenceTally.js';
import { mountCountermeasureBar, renderCountermeasureBar } from './ui/countermeasureBar.js';
import { openTribunal } from './ui/tribunal.js';
import { openEndgame } from './ui/endgame.js';
import { openRulebook } from './ui/rulebook.js';
import { syncStandings, reportOutcome, getStandings, renderStandingsStrip } from './net/standings.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

const SQUARE_NAMES = ['top left', 'top centre', 'top right', 'middle left', 'the centre', 'middle right', 'bottom left', 'bottom centre', 'bottom right'];
const OBSTRUCT_VERB = {
  disableAppeal: 'closed the appeals office',
  rewrite: 'rewrote the incident report to blame you',
  gaslight: 'suggested that losing is your own fault',
};

/** Plain-language narration for screen readers — the bureaucratic incident text
 *  doesn't say which square moved; this does. */
function narrateCheat(ev) {
  const at = (ev.cells || []).map(i => SQUARE_NAMES[i]).filter(Boolean).join(' and ');
  switch (ev.type) {
    case 'erasure': return `The House removed your mark from ${at || 'the board'}.`;
    case 'doubleDealing': return `The House took a second move at ${at || 'the board'}.`;
    case 'structural': return `The House condemned ${at || 'a square'}. It is out of play.`;
    case 'identityFraud': return `The House changed your mark at ${at || 'the board'} into its own.`;
    case 'obstruction': return `The House ${OBSTRUCT_VERB[ev.act] || 'interfered with the game'}.`;
    default: return ev.message;
  }
}
let announceTimer;
function announce(text) {
  const el = $('#sr-live');
  if (!el) return;
  el.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { el.textContent = text; }, 60);
}
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const shortDelay = ms => (reduced() ? Math.min(ms, 80) : ms);

const KIND_LABEL = {
  legal: 'an ordinary move', erase: 'an erasure', double: 'double-dealing',
  condemn: 'a condemnation', rebrand: 'a reclassification', capture: 'regulatory capture',
  audited: 'nothing at all',
};

// ---- state ---------------------------------------------------------------
const prefs = loadPrefs();
const run = makeRun(loadRun());
const rng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0);

let board = emptyBoard();
let condemned = new Set();
let turn = 0;
let previous = '';
let busy = false;
let done = false;
let generation = 0;
let incidentsThisMatch = 0;
let appealDisabled = false;

let snapPreMove = null;   // for INSTANT REPLAY
let snapPostMove = null;  // for FREEZE FRAME
let houseActed = false;   // was the last House turn a real move (not audited / already undone)?
let subpoenaCharges = 0;
let auditNext = false;
let cleanNextReply = false;

// ---- persistence --------------------------------------------------------
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveRun(run.serialize()); savePrefs(prefs); }, 250);
}

// ---- rendering ---------------------------------------------------------
const status = text => { $('#status').textContent = text; };

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

function canUndoNow() {
  return !busy && !done && houseActed && snapPostMove != null;
}

function refreshMeta() {
  renderComposure(run.composure);
  renderEvidenceTally(run.evidence);
  renderCountermeasureBar(run, {
    canUndo: canUndoNow(),
    hasExhibits: distinctClasses(run.evidence) > 0,
  });
  $('#press-charges').hidden = !run.canPressCharges;
  $('#match-number').textContent = String(run.match).padStart(3, '0');
  $('#ai-score').textContent = String(run.houseScore);
}

// ---- the loop --------------------------------------------------------
function snapshot() {
  return {
    board: [...board], turn, previous,
    condemned: new Set(condemned),
    incidentN: incidentCount(),
    evLen: run.evidence.log.length,
  };
}

async function play(index) {
  if (busy || done || board[index] != null || condemned.has(index)) return;
  busy = true;
  const round = generation;

  snapPreMove = snapshot();
  board[index] = 'X';
  sfx('tap');
  paint([index], false);
  snapPostMove = snapshot();

  const threatened = Boolean(winner(board, 'X'));
  const band = run.composure.band().id;

  if (threatened) {
    status('THREE IN A ROW —');
    sfx('chime');
    await nearMissSteal(winner(board, 'X'));
    if (round !== generation) return;
    sfx('whistle');
    run.composure.nudge(-6);
    status(houseVoice.nearMiss(run.composure.band().id));
  }

  const tier = run.tier;
  const plan = planTurn(board, {
    turn: ++turn, previous, rng, tier,
    condemned, audited: auditNext, clean: cleanNextReply,
  });
  const wasAudited = auditNext;
  auditNext = false;
  cleanNextReply = false;
  for (const c of plan.condemned) condemned.add(c);

  if (subpoenaCharges > 0) {
    subpoenaCharges -= 1;
    status(`THE HOUSE DECLARES: ${KIND_LABEL[plan.kind] ?? plan.kind}. (${TIERS[tier].name})`);
    sfx('stamp');
    await wait(shortDelay(1100));
    if (round !== generation) return;
  }

  if (threatened) {
    const correction = plan.steps.shift();
    board = [...correction.board];
    applyCheatStep(correction);
    sfx('steal');
  } else {
    status(houseVoice.thinking(band));
  }

  setTurnPill('HOUSE TURN', true);
  await wait(shortDelay(threatened ? 250 : 450 + rng() * 250));
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
    await wait(shortDelay(step.delay));
    if (round !== generation) return;
  }

  previous = plan.kind;
  busy = false;
  houseActed = !wasAudited && plan.kind !== 'audited';

  if (winner(board, 'O')) {
    endMatch();
  } else {
    status(houseVoice.yourMove(run.composure.band().id, turn));
    setTurnPill('YOUR TURN');
    paint();
    refreshMeta();
  }
  persist();
}

function applyCheatStep(step) {
  const ev = step.cheatEvent;
  paint(step.changed, true);
  incidentsThisMatch += 1;

  if (ev.type === 'obstruction') {
    if (ev.act === 'disableAppeal') { appealDisabled = true; $('#appeal').disabled = true; }
    if (ev.act === 'rewrite') rewriteLastIncident();
  }

  reportIncident(step.message, { statute: ev.statute, turn: ev.turn ?? turn });
  run.bankViolation({ ...ev, turn });
  status(step.message);
  announce(narrateCheat(ev));
  refreshMeta();
}

function endMatch() {
  done = true;
  run.loseMatch({ clean: incidentsThisMatch === 0 });
  status(houseVoice.won(run.composure.band().id, incidentsThisMatch > 0));
  setTurnPill('');
  showToast('The House wins. What are the odds?');
  sfx('buzzer');
  paint();
  refreshMeta();
  persist();
  reportOutcome({ matchesDelta: 1, houseWinsDelta: 1, violationsDelta: incidentsThisMatch })
    .then(s => renderStandingsStrip($('#standings-strip'), s));
}

function newMatch() {
  generation += 1;
  run.advanceMatch();
  board = emptyBoard();
  condemned = new Set();
  turn = 0;
  previous = '';
  busy = false;
  done = false;
  incidentsThisMatch = 0;
  appealDisabled = false;
  snapPreMove = snapPostMove = null;
  houseActed = false;
  subpoenaCharges = 0;
  auditNext = false;
  cleanNextReply = false;
  $('#appeal').disabled = false;
  resetIncidentLog();
  hideToast();
  status(`Match ${String(run.match).padStart(3, '0')}. ${TIERS[run.tier].blurb}`);
  setTurnPill('YOUR TURN');
  paint();
  refreshMeta();
  persist();
}

// ---- counter-measures --------------------------------------------------
function useCountermeasure(id) {
  if (busy) return;
  const context = { canUndo: canUndoNow(), hasExhibits: distinctClasses(run.evidence) > 0 };
  if (!canUse(run, id, context)) return;
  commitUse(run, id);

  if (id === 'subpoena') {
    subpoenaCharges = 2;
    showToast('SUBPOENA SERVED · the House must declare its next two moves');
  } else if (id === 'audit') {
    auditNext = true;
    showToast('AUDIT SCHEDULED · the House sits out its next turn');
  } else if (id === 'freeze') {
    restore(snapPostMove);
    cleanNextReply = false;
    houseActed = false;
    snapPostMove = null;
    status('The House’s last turn has been struck from the record.');
    showToast('FREEZE FRAME · the House does not get to retake it');
  } else if (id === 'replay') {
    restore(snapPreMove);
    cleanNextReply = true;
    houseActed = false;
    snapPreMove = snapPostMove = null;
    status('Rewound. Play it again — the House replies clean this time.');
    showToast('INSTANT REPLAY');
  } else if (id === 'whistle') {
    const last = run.evidence.log[run.evidence.log.length - 1];
    if (last) {
      run.corroborateExhibit(last.class);
      tagLastIncident('LEAKED', 'leaked');
    }
    run.composure.lowerFloor(8);
    run.composure.nudge(-8);
    showToast('LEAKED TO THE PRESS · that exhibit counts double at trial');
  }

  sfx('gavel');
  setTurnPill('YOUR TURN');
  paint();
  refreshMeta();
  persist();
}

function restore(snap) {
  if (!snap) return;
  const strikeFrom = snap.incidentN;
  board = [...snap.board];
  turn = snap.turn;
  previous = snap.previous;
  condemned = new Set(snap.condemned);
  truncateIncidentsTo(strikeFrom);
  run.rollbackEvidence(snap.evLen);
  incidentsThisMatch = Math.max(0, incidentsThisMatch - 1);
  busy = false;
  done = false;
}

// ---- wiring ----------------------------------------------------------
mountBoard($('#board'), i => void play(i));
mountIncidentLog($('#incident-log'), $('#incident-count'));
mountToast($('#toast'));
mountComposureMeter($('#composure-meter'));
mountEvidenceTally($('#evidence-tally'));
mountCountermeasureBar($('#countermeasure-bar'), useCountermeasure);

$('#new-game').addEventListener('click', newMatch);

$('#appeal').addEventListener('click', () => {
  if (appealDisabled) return;
  run.appealFee();
  incidentsThisMatch += 1;
  const msg = houseVoice.appeal(run.composure.band().id);
  reportIncident(msg, { statute: '§8 APPEALS', turn });
  run.bankViolation({ exhibitClass: 'obstruction', statute: '§8 APPEALS', message: msg, turn });
  run.composure.nudge(-2);
  showToast('APPEAL DENIED · HOUSE +1');
  sfx('register');
  refreshMeta();
  persist();
});

$('#press-charges').addEventListener('click', () => {
  if (busy || !run.canPressCharges) return;
  generation += 1; // abandon any in-flight House turn
  document.querySelector('.intro').hidden = true;
  openTribunal(run, {
    standings: getStandings(),
    onContinue() {
      persist();
      if (!run.flags.seenEndgame) {
        openEndgame(run, { onSeason: rollSeason, onGhostDone: rollSeason });
      } else {
        rollSeason();
      }
    },
  });
});

function rollSeason() {
  run.nextSeason();
  reportOutcome({ seasonsDelta: 1 }).then(s => renderStandingsStrip($('#standings-strip'), s));
  document.getElementById('screen-tribunal').hidden = true;
  document.getElementById('screen-endgame').hidden = true;
  document.getElementById('screen-match').hidden = false;
  document.querySelector('.intro').hidden = false;
  board = emptyBoard();
  condemned = new Set();
  turn = 0; previous = ''; busy = false; done = false;
  incidentsThisMatch = 0; appealDisabled = false;
  snapPreMove = snapPostMove = null; houseActed = false;
  subpoenaCharges = 0; auditNext = false; cleanNextReply = false;
  $('#appeal').disabled = false;
  resetIncidentLog();
  hideToast();
  status(`Season ${run.season}. A clean slate, allegedly. ${TIERS[run.tier].blurb}`);
  setTurnPill('YOUR TURN');
  paint();
  refreshMeta();
  persist();
  $('#new-game').focus();
}

$('#house-rules').addEventListener('click', openRulebook);

const camBtn = $('#referee-cam');
function applyCam() {
  camBtn.setAttribute('aria-pressed', String(prefs.refereeCam));
  setRefereeCam(prefs.refereeCam);
}
camBtn.addEventListener('click', () => {
  prefs.refereeCam = !prefs.refereeCam;
  applyCam();
  persist();
});

window.addEventListener('standings:update', e => renderStandingsStrip($('#standings-strip'), e.detail));
renderStandingsStrip($('#standings-strip'), getStandings());
syncStandings().then(s => renderStandingsStrip($('#standings-strip'), s));

setSoundEnabled(prefs.sound);
applyCam();
$('#year').textContent = String(new Date().getFullYear());
status(run.match > 1
  ? `Match ${String(run.match).padStart(3, '0')}. ${TIERS[run.tier].blurb}`
  : 'Your move, hotshot.');
setTurnPill('YOUR TURN');
paint();
refreshMeta();
