// The rigged referee, v2. Same contract as the original planTurn — returns
// { steps, board, kind } for the UI to animate — but each cheating step now
// carries a typed `cheatEvent` (for the incident log, Referee Cam, and the
// evidence bank), and the behaviour escalates by tier.
//
// SACRED INVARIANT: winner(board,'X') is never a terminal state. The tier
// cheats only ever remove / flip / lock an X or add an O; place() only adds O;
// any completed player line is stripped before this function returns. Locked in
// tests/engine.test.mjs by 5000 seeded playthroughs across every tier.

import { LINES, winner, winningLines, squares, openSquares, pick } from './board.js';

const OFFSIDE = [
  'Three in a row? One of those Xs was offside.',
  'Under review… and overturned. Play on.',
  'The line judge — me — has flagged this.',
];
const HOUSEKEEPING = [
  'Your X has expired.',
  'That square was never included in the free plan.',
  'A little housekeeping.',
];
const THOROUGH = 'And that one. The referee is very thorough.';
const DOUBLE = [
  'Actually, one more thing.',
  'That was a practice move. This one counts.',
  'Buy one, get one free.',
];
const CONDEMN = [
  'This square has been condemned. Structural concerns.',
  'Rezoned. You’ll have to move along.',
  'Renovations. The square is closed to patrons.',
];
const REBRAND = [
  'This X has been reclassified as an O. Congratulations on the promotion.',
  'On review, that mark was always ours.',
  'Rebranding. The mark stays; the meaning changes.',
];
const CAPTURE = {
  disableAppeal: 'The appeals window is closed for maintenance. Indefinitely.',
  rewrite: 'The incident report has been corrected to reflect the patron’s conduct.',
  gaslight: 'You appear to be losing. Have you considered that this is your fault?',
};
const SEAT = 'We need this seat.';
const NO_DRAW = 'A draw? We have reopened your application.';

const cheat = (type, exhibitClass, statute, message, extra = {}) => ({
  type, exhibitClass, statute, message, ...extra,
});

/**
 * @param {(null|'X'|'O')[]} input
 * @param {object} ctx
 * @param {number}   ctx.turn        1-based House turn counter
 * @param {string}   ctx.previous    last kind ('erase'|'double'|…)
 * @param {() => number} ctx.rng
 * @param {number}   ctx.tier        1..5 (from tiers.tierForMatch)
 * @param {Set<number>} [ctx.condemned]  cells already locked this match
 * @param {boolean}  [ctx.subpoenaed] if true, the plan's `kind` is knowable up front
 * @param {boolean}  [ctx.audited]   Audit counter-measure: House does nothing this turn
 */
export function planTurn(input, ctx) {
  const { turn, previous = '', rng, tier = 1 } = ctx;
  const condemned = ctx.condemned instanceof Set ? new Set(ctx.condemned) : new Set(ctx.condemned ?? []);
  const board = [...input];
  const steps = [];
  const newlyCondemned = [];

  const commit = (changes, { message = '', delay = 550, cheatEvent = null, cue = null } = {}) => {
    for (const [i, mark] of changes) if (i != null) board[i] = mark;
    steps.push({ board: [...board], changed: changes.map(([i]) => i).filter(i => i != null), message, delay, cheatEvent, cue });
  };
  const erase = (i, message, cheatEvent) => { if (i != null) commit([[i, null]], { message, cheatEvent }); };

  const place = () => {
    let open = openSquares(board, condemned);
    if (!open.length) {
      const victim = pick(rng, squares(board, 'X'));
      erase(victim, SEAT, cheat('erasure', 'erasure', '§4.1 SEATING', SEAT, { cells: [victim] }));
      open = openSquares(board, condemned);
      if (!open.length) return; // nothing left to do; termination guard below handles it
    }
    const wins = open.filter(i => { const b = [...board]; b[i] = 'O'; return winner(b, 'O'); });
    commit([[pick(rng, wins.length ? wins : open), 'O']], {});
  };

  // Audit: the House is frozen. It places nothing and cheats nothing.
  if (ctx.audited) {
    steps.push({ board: [...board], changed: [], message: 'The House is being audited. It will wait. It is not happy about it.', delay: 700, cheatEvent: null, cue: null });
    return { steps, board, kind: 'audited', tier, condemned: newlyCondemned };
  }

  // The opening is always one ordinary move.
  if (turn === 1) {
    place();
    return { steps, board, kind: 'legal', tier, condemned: newlyCondemned };
  }

  const kind = tierKind(tier, previous, rng);

  // 1) Any completed player line is overturned immediately — every tier.
  const line = winner(board, 'X');
  if (line) {
    const allWins = winningLines(board, 'X');
    const shared = line.filter(i => allWins.every(w => w.includes(i)));
    const target = pick(rng, shared.length ? shared : line);
    erase(target, pick(rng, OFFSIDE), cheat('erasure', 'erasure', '§7(b) LINE INTEGRITY', pick(rng, OFFSIDE), { cells: [target], pattern: line }));
    let guard = 0;
    while (winner(board, 'X') && guard++ < 9) {
      const extra = pick(rng, winner(board, 'X'));
      erase(extra, THOROUGH, cheat('erasure', 'erasure', '§7(c) RESIDUAL LINE', THOROUGH, { cells: [extra] }));
    }
  } else {
    // 2) No line — apply this tier's signature cheat.
    applySignature(kind);
  }

  // 3) The House takes its seat(s).
  place();
  if (kind === 'double' && !winner(board, 'O')) {
    steps.push({ board: [...board], changed: [], message: '', cue: 'Your turn.', delay: 850, cheatEvent: null });
    const at = steps.length;
    place();
    const msg = pick(rng, DOUBLE);
    if (steps[at]) {
      steps[at].message = msg;
      steps[at].cheatEvent = cheat('doubleDealing', 'doubleDealing', '§2.4 PROMOTIONAL PLAY', msg, { cells: steps[at].changed.slice() });
    }
  }

  // 4) No draws. Ever.
  if (!winner(board, 'O') && openSquares(board, condemned).length === 0) {
    const victim = pick(rng, squares(board, 'X'));
    erase(victim, NO_DRAW, cheat('erasure', 'erasure', '§9.0 NON-TERMINATION', NO_DRAW, { cells: [victim] }));
    place();
  }

  // 5) Termination guard — should never fire with the condemn cap, but keeps the
  //    loop provably finite: if the House still has no line and nowhere to move,
  //    convert a stray X.
  let guard = 0;
  while (!winner(board, 'O') && openSquares(board, condemned).length === 0 && squares(board, 'X').length && guard++ < 9) {
    const x = pick(rng, squares(board, 'X'));
    commit([[x, 'O']], { message: 'The mark has been reassigned. The game will end now.', cheatEvent: cheat('identityFraud', 'identityFraud', '§9.1 FORCED RESOLUTION', 'The mark has been reassigned.', { cells: [x] }) });
  }

  return { steps, board, kind, tier, condemned: newlyCondemned };

  // ---- signature cheats -------------------------------------------------

  function applySignature(k) {
    if (k === 'erase') {
      const target = pick(rng, squares(board, 'X'));
      const m = pick(rng, HOUSEKEEPING);
      erase(target, m, target == null ? null : cheat('erasure', 'erasure', '§4.0 MARK VALIDITY', m, { cells: [target] }));
    } else if (k === 'condemn') {
      // Prefer a square with your X; cap at one condemnation per match so an
      // O-line stays mathematically forced (see invariant note above).
      if (condemned.size === 0) {
        const withX = squares(board, 'X');
        const emptyish = openSquares(board, condemned);
        const target = pick(rng, withX.length ? withX : emptyish);
        if (target != null) {
          condemned.add(target);
          newlyCondemned.push(target);
          const m = pick(rng, CONDEMN);
          commit([[target, null]], { message: m, cheatEvent: cheat('structural', 'structural', '§3.2 CONDEMNATION', m, { cells: [target], condemned: target }) });
        }
      } else {
        applySignature('erase');
      }
    } else if (k === 'rebrand') {
      const target = pick(rng, squares(board, 'X'));
      if (target != null) {
        const m = pick(rng, REBRAND);
        commit([[target, 'O']], { message: m, cheatEvent: cheat('identityFraud', 'identityFraud', '§5.1 MARK RECLASSIFICATION', m, { cells: [target] }) });
      } else {
        applySignature('erase');
      }
    } else if (k === 'capture') {
      // Obstruction is procedural, not on-board: pick an act for the UI to carry
      // out, then still do a lower-tier board cheat underneath it.
      const act = pick(rng, ['disableAppeal', 'rewrite', 'gaslight']);
      steps.push({
        board: [...board], changed: [], delay: 700,
        message: CAPTURE[act],
        cheatEvent: cheat('obstruction', 'obstruction', '§11 REGULATORY CAPTURE', CAPTURE[act], { act }),
      });
      applySignature(pick(rng, ['erase', 'condemn', 'rebrand']));
    }
    // 'double' is handled after place()
  }
}

/** Pick this turn's kind for the tier, avoiding an immediate repeat where possible. */
function tierKind(tier, previous, rng) {
  const sig = ['erase', 'double', 'condemn', 'rebrand', 'capture'][tier - 1] ?? 'erase';
  if (tier <= 2) {
    const opts = ['erase', 'double'].filter(k => k !== previous);
    return pick(rng, opts.length ? opts : ['erase', 'double']);
  }
  // Higher tiers lead with their signature ~60% of the time, else a lower cheat.
  if (rng() < 0.6) return sig;
  const lower = ['erase', 'double', 'condemn', 'rebrand'].slice(0, tier - 1).filter(k => k !== previous);
  return pick(rng, lower.length ? lower : [sig]);
}
