// WebAudio SFX, generated — no asset files. Off by default; the preference is
// persisted by the caller. Every cue degrades to silence if the context can't
// be created or the user hasn't enabled sound.

let ctx = null;
let enabled = false;

export function setSoundEnabled(on) {
  enabled = Boolean(on);
  if (enabled && !ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (enabled && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export const isSoundEnabled = () => enabled;

function tone(freq, dur, { type = 'sine', gain = 0.08, slideTo = null, delay = 0 } = {}) {
  if (!enabled || !ctx) return;
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
  stamp: () => { tone(140, 0.14, { type: 'sawtooth', gain: 0.09 }); tone(90, 0.18, { type: 'sine', gain: 0.06, delay: 0.02 }); },
  chime: () => { [0, 0.09, 0.18].forEach((d, i) => tone([660, 880, 1320][i], 0.5, { type: 'sine', gain: 0.07, delay: d })); },
  whistle: () => { tone(2100, 0.16, { type: 'square', gain: 0.06 }); tone(2500, 0.22, { type: 'square', gain: 0.05, delay: 0.05 }); },
  steal: () => tone(300, 0.3, { type: 'sawtooth', gain: 0.08, slideTo: 70 }),
  register: () => { tone(180, 0.05, { type: 'square', gain: 0.08 }); tone(1200, 0.4, { type: 'triangle', gain: 0.05, delay: 0.06 }); },
  buzzer: () => tone(120, 0.45, { type: 'sawtooth', gain: 0.10 }),
  gavel: () => { tone(200, 0.09, { type: 'square', gain: 0.10 }); tone(160, 0.14, { type: 'sine', gain: 0.08, delay: 0.1 }); },
};

export function sfx(name) {
  try { CUES[name]?.(); } catch { /* silence */ }
}
