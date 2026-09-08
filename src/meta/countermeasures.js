// Counter-measures — what your evidence points buy you. None of them let you
// win the board (the referee still overturns any line you complete). They buy
// better evidence and a slower, angrier loss.
//
// Definitions only. The gameplay effect of each lives in main.js's match loop —
// these are the things a counter-measure has to reach into (the pending plan,
// the board history, composure), so they can't be pure.

export const COUNTERMEASURES = [
  {
    id: 'subpoena', label: 'SUBPOENA', cost: 3, cap: 3,
    blurb: 'The House must declare its next two moves before it makes them.',
    when: 'yourTurn',
  },
  {
    id: 'freeze', label: 'FREEZE FRAME', cost: 4, cap: 2,
    blurb: 'The House’s last turn is struck from the record. It does not get to retake it.',
    when: 'afterHouse',
  },
  {
    id: 'replay', label: 'INSTANT REPLAY', cost: 5, cap: 2,
    blurb: 'Rewind to before your last move. Play it again; the House replies clean.',
    when: 'afterHouse',
  },
  {
    id: 'whistle', label: 'WHISTLEBLOWER', cost: 6, cap: 1,
    blurb: 'Leak an incident to the press. Permanent hit to House composure; that exhibit counts double at trial.',
    when: 'anytime',
  },
  {
    id: 'audit', label: 'AUDIT', cost: 7, cap: 1,
    blurb: 'The House is frozen for one whole turn. It places nothing. It cheats nothing.',
    when: 'yourTurn',
  },
];

export const byId = Object.fromEntries(COUNTERMEASURES.map(c => [c.id, c]));

export function remainingUses(run, id) {
  return Math.max(0, byId[id].cap - (run.used[id] || 0));
}

export function canUse(run, id, context = {}) {
  const cm = byId[id];
  if (!cm) return false;
  if (run.points < cm.cost) return false;
  if (remainingUses(run, id) <= 0) return false;
  if ((cm.id === 'freeze' || cm.id === 'replay') && !context.canUndo) return false;
  if (cm.id === 'whistle' && !context.hasExhibits) return false;
  return true;
}

export function commitUse(run, id) {
  const cm = byId[id];
  if (!run.spendPoints(cm.cost)) return false;
  run.noteCountermeasure(id);
  run.composure.nudge(-10); // rattling the House always costs it composure
  return true;
}
