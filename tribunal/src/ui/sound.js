// WebAudio SFX, generated — no asset files. Off by default; the caller persists
// the preference. Every cue degrades to silence if the context can't be created
// or sound is off.

let ctx = null;
let enabled = false;

// The context is created lazily on the first cue — which always fires inside a
// click handler — so it never trips the browser's autoplay warning at boot.
export function setSoundEnabled(on) { enabled = Boolean(on); }
export const isSoundEnabled = () => enabled;

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, { type = 'sine', gain = 0.08, slideTo = null, delay = 0 } = {}) {
  if (!enabled || !ensureCtx()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const CUES = {
  tap: () => tone(320, 0.06, { type: 'square', gain: 0.05 }),
  compelled: () => { tone(180, 0.2, { type: 'sine', gain: 0.07 }); tone(120, 0.28, { type: 'sine', gain: 0.05, delay: 0.04 }); },
  stamp: () => { tone(140, 0.14, { type: 'sawtooth', gain: 0.09 }); tone(90, 0.18, { type: 'sine', gain: 0.06, delay: 0.02 }); },
  strike: () => tone(2000, 0.09, { type: 'square', gain: 0.05 }),
  drop: () => tone(300, 0.12, { type: 'triangle', gain: 0.06, slideTo: 180 }),
  win: () => [0, 0.09, 0.2].forEach((d, i) => tone([523, 659, 988][i], 0.5, { type: 'sine', gain: 0.07, delay: d })),
  lose: () => { tone(200, 0.5, { type: 'sawtooth', gain: 0.1, slideTo: 70 }); tone(80, 0.7, { type: 'sine', gain: 0.07, delay: 0.08 }); },
};

export function sfx(name) {
  try { CUES[name]?.(); } catch { /* silence */ }
}
