// Typed exhibits. Every cheat the referee commits is filed here. Collect enough
// distinct classes (or enough total) and PRESS CHARGES unlocks.

export const EXHIBIT_CLASSES = {
  erasure: {
    id: 'erasure', letter: 'A', label: 'Unlawful erasure of a patron mark',
    defense: 'The mark had lapsed. Renewal notices were sent to an address of our choosing.',
  },
  doubleDealing: {
    id: 'doubleDealing', letter: 'B', label: 'Taking of consecutive turns ("double-dealing")',
    defense: 'The first move was promotional and does not count against the House.',
  },
  structural: {
    id: 'structural', letter: 'C', label: 'Structural tampering with the board of play',
    defense: 'Routine maintenance. The affected square was condemned for the patron’s safety.',
  },
  identityFraud: {
    id: 'identityFraud', letter: 'D', label: 'Conversion of a patron mark into a House mark',
    defense: 'The mark elected to change teams. We have its verbal consent on file. Trust us.',
  },
  obstruction: {
    id: 'obstruction', letter: 'E', label: 'Obstruction of appeal and falsification of the record',
    defense: 'The record reflects events as the House remembers them, which is authoritative.',
  },
};

export function makeEvidenceBank() {
  return { exhibits: {}, total: 0, log: [] };
}

export function restoreEvidenceBank(state) {
  if (!state || typeof state !== 'object') return makeEvidenceBank();
  return {
    exhibits: state.exhibits ?? {},
    total: state.total ?? 0,
    log: Array.isArray(state.log) ? state.log : [],
  };
}

/** File one cheat. `cheatEvent` comes from the referee. Returns the exhibit entry. */
export function record(bank, cheatEvent) {
  const cls = EXHIBIT_CLASSES[cheatEvent.exhibitClass];
  if (!cls) return null;
  const e = (bank.exhibits[cls.id] ??= { id: cls.id, letter: cls.letter, label: cls.label, count: 0, corroborated: false, first: cheatEvent.message });
  e.count += 1;
  bank.total += 1;
  bank.log.push({ class: cls.id, message: cheatEvent.message, statute: cheatEvent.statute, turn: cheatEvent.turn ?? null });
  return e;
}

/** Whistleblower: an exhibit that stands up in court counts double. */
export function corroborate(bank, classId) {
  const e = bank.exhibits[classId];
  if (e) e.corroborated = true;
  return e;
}

export const distinctClasses = bank => Object.keys(bank.exhibits).length;

export const DISTINCT_TO_CHARGE = 5;
export const TOTAL_TO_CHARGE = 15;

export const canPressCharges = bank =>
  distinctClasses(bank) >= DISTINCT_TO_CHARGE || bank.total >= TOTAL_TO_CHARGE;

/** Count of guilty verdicts available at trial (corroborated exhibits count twice). */
export const countsAgainstHouse = bank =>
  Object.values(bank.exhibits).reduce((n, e) => n + e.count + (e.corroborated ? e.count : 0), 0);
