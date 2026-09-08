// Escalation. Which cheats the House has unlocked, by match number, with a
// panic bump when its composure cracks.

export const TIERS = {
  1: {
    id: 1, name: 'HOUSEKEEPING',
    blurb: 'A quiet operation. The House tidies away the occasional inconvenient mark.',
    signature: 'erase',
  },
  2: {
    id: 2, name: 'PROMOTIONS',
    blurb: 'The House introduces a limited-time offer: two moves for the price of your turn.',
    signature: 'double',
  },
  3: {
    id: 3, name: 'RENOVATIONS',
    blurb: 'The board is under development. Certain squares have been condemned. Mind the dust.',
    signature: 'condemn',
  },
  4: {
    id: 4, name: 'REBRANDING',
    blurb: 'The House has reviewed your marks and reclassified one of them as its own.',
    signature: 'rebrand',
  },
  5: {
    id: 5, name: 'COMPLIANCE',
    blurb: 'The House has acquired the referee, the appeals office, and the incident report. Enjoy your game.',
    signature: 'capture',
  },
};

export const MAX_TIER = 5;

/**
 * Which tier is in force. Base = match number, capped at 5. If the House is
 * unravelling it overreaches by one — which also means more evidence for you.
 */
export function tierForMatch(matchNumber, composureBand = 'smug') {
  const base = Math.min(MAX_TIER, Math.max(1, matchNumber));
  const panicking = composureBand === 'unhinged' || composureBand === 'unravelling';
  return Math.min(MAX_TIER, base + (panicking ? 1 : 0));
}

/** The lower-tier cheats the House still has in its pocket at a given tier. */
export function repertoire(tier) {
  const all = ['erase', 'double', 'condemn', 'rebrand', 'capture'];
  return all.slice(0, tier);
}
