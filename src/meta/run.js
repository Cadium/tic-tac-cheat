// The run: everything that survives a single match. Match number drives the
// tier; documented violations become points you spend on counter-measures;
// losses are your permanent record; a season is one trip from match 1 to a
// verdict.

import { tierForMatch } from '../engine/tiers.js';
import { makeComposure, restoreComposure } from '../engine/composure.js';
import {
  makeEvidenceBank, restoreEvidenceBank, record as recordEvidence,
  rollbackTo, corroborate, canPressCharges, distinctClasses, countsAgainstHouse,
} from '../engine/evidence.js';

export function makeRun(persisted = null) {
  const s = persisted || {};

  const run = {
    season: s.season ?? 1,
    match: s.match ?? 1,
    losses: s.losses ?? 0,
    houseScore: s.houseScore ?? 0,       // losses + appeal fees, shown on the scoreboard
    spent: s.spent ?? 0,
    used: { ...(s.used || {}) },          // per-run counter-measure use counts
    flags: { seenEndgame: false, wonTribunal: false, ...(s.flags || {}) },
    evidence: restoreEvidenceBank(s.evidence),
    composure: restoreComposure(s.composure),

    get points() { return Math.max(0, run.evidence.total - run.spent); },
    get tier() { return tierForMatch(run.match, run.composure.band().id); },
    get canPressCharges() { return canPressCharges(run.evidence); },
    get distinctExhibits() { return distinctClasses(run.evidence); },
    get chargeCount() { return countsAgainstHouse(run.evidence); },

    /** File one cheat. Returns the evidence log length before it (for rollback). */
    bankViolation(cheatEvent) {
      const at = run.evidence.log.length;
      recordEvidence(run.evidence, cheatEvent);
      return at;
    },
    rollbackEvidence(toLength) { rollbackTo(run.evidence, toLength); },
    corroborateExhibit(classId) { corroborate(run.evidence, classId); },

    /** true if the spend went through */
    spendPoints(n) {
      if (run.points < n) return false;
      run.spent += n;
      return true;
    },
    noteCountermeasure(id) { run.used[id] = (run.used[id] || 0) + 1; },

    loseMatch({ clean }) {
      run.losses += 1;
      run.houseScore += 1;
      if (clean) run.composure.nudge(3); // won without a single documented foul
    },
    appealFee() { run.houseScore += 1; },
    advanceMatch() { run.match += 1; },

    /** After a verdict: keep the record and the season count, wipe the rest. */
    nextSeason() {
      run.season += 1;
      run.match = 1;
      run.spent = 0;
      run.used = {};
      run.evidence = makeEvidenceBank();
      run.composure = makeComposure();
      run.flags.wonTribunal = false;
      // seenEndgame stays true — the offer is made once.
    },

    serialize() {
      return {
        season: run.season, match: run.match, losses: run.losses, houseScore: run.houseScore,
        spent: run.spent, used: run.used, flags: run.flags,
        evidence: run.evidence, composure: run.composure.serialize(),
      };
    },
  };

  return run;
}
