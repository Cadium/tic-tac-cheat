// localStorage, defensively. Every read and write is guarded — private windows,
// disabled storage, and quota errors all degrade to "no saved state".

const PREFS_KEY = 'ttc:prefs';
const RUN_KEY = 'ttc:run';
export const SCHEMA = 2;

const DEFAULT_PREFS = { refereeCam: false, sound: false };

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function loadPrefs() {
  return { ...DEFAULT_PREFS, ...(readJSON(PREFS_KEY) || {}) };
}
export function savePrefs(prefs) {
  writeJSON(PREFS_KEY, { ...DEFAULT_PREFS, ...prefs });
}

/** Returns the persisted run blob, or null if absent / from an old schema. */
export function loadRun() {
  const blob = readJSON(RUN_KEY);
  if (!blob || blob.schema !== SCHEMA) return null;
  return blob.run ?? null;
}
export function saveRun(run) {
  return writeJSON(RUN_KEY, { schema: SCHEMA, run, savedAt: Date.now() });
}
export function clearRun() {
  try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ }
}
