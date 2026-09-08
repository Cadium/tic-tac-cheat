// The House's composure. One number, 0-100, that drifts down as you rattle it
// and up when it wins cleanly. It drives the voice (houseVoice.js) and how hard
// the referee overreaches (tiers.js reads the band).

const BANDS = [
  { at: 70, id: 'smug', word: 'SMUG' },
  { at: 45, id: 'annoyed', word: 'ANNOYED' },
  { at: 25, id: 'sweating', word: 'SWEATING' },
  { at: 8, id: 'unhinged', word: 'UNHINGED' },
  { at: 0, id: 'unravelling', word: 'OFF THE RAILS' },
];

export const START = 78;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function makeComposure(value = START, floor = 0) {
  let v = clamp(value, floor, 100);
  let f = clamp(floor, 0, 100);

  const api = {
    get value() { return Math.round(v); },
    get floor() { return Math.round(f); },
    band() { return BANDS.find(b => v >= b.at) ?? BANDS[BANDS.length - 1]; },
    /** returns the delta actually applied (clamping can eat some of it) */
    nudge(delta) {
      const before = v;
      v = clamp(v + delta, f, 100);
      return v - before;
    },
    /** whistleblower: drop the ceiling the House can ever recover to */
    lowerFloor(by) {
      f = clamp(f + by, 0, 100);
      v = clamp(v, f, 100);
      return api;
    },
    serialize() { return { v, f }; },
  };
  return api;
}

export function restoreComposure(state) {
  if (!state || typeof state.v !== 'number') return makeComposure();
  return makeComposure(state.v, state.f ?? 0);
}

export { BANDS };
