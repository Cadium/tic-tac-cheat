// Client for the global tally. Optimistic and offline-tolerant: the strip
// always shows a number, the game never waits on the network, and a failed
// sync still moves the local figure so it feels alive.

const CACHE_KEY = 'ttc:standings';
const ENDPOINT = '/api/standings';

const SEED = { houseWins: 52_140, humanWins: 0, violations: 191_744, matches: 52_140, seasons: 8_305 };

let current = { ...SEED };

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && typeof c.matches === 'number') return { ...SEED, ...c, humanWins: 0 };
  } catch { /* ignore */ }
  return null;
}
function writeCache(s) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...s, humanWins: 0 })); } catch { /* ignore */ }
}

export function getStandings() { return { ...current, humanWins: 0 }; }

export async function syncStandings() {
  current = readCache() || { ...SEED };
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      current = {
        ...current, ...data,
        houseWins: Math.max(current.houseWins, data.houseWins ?? 0),
        violations: Math.max(current.violations, data.violations ?? 0),
        matches: Math.max(current.matches, data.matches ?? 0),
        seasons: Math.max(current.seasons, data.seasons ?? 0),
        humanWins: 0,
      };
      writeCache(current);
    }
  } catch { /* offline — keep the cache */ }
  return getStandings();
}

let pending = null;
export async function reportOutcome(deltas) {
  // optimistic local bump so the number moves even if the POST fails
  current = {
    ...current,
    houseWins: current.houseWins + (deltas.houseWinsDelta || 0),
    violations: current.violations + (deltas.violationsDelta || 0),
    matches: current.matches + (deltas.matchesDelta || 0),
    seasons: current.seasons + (deltas.seasonsDelta || 0),
    humanWins: 0,
  };
  writeCache(current);

  clearTimeout(pending);
  pending = setTimeout(async () => {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(deltas),
      });
      if (res.ok) {
        const data = await res.json();
        // If the write was throttled the returned totals don't include our
        // delta yet — keep the optimistic figure rather than snapping back.
        if (!data.throttled) {
          current = {
            ...current,
            ...data,
            houseWins: Math.max(current.houseWins, data.houseWins ?? 0),
            violations: Math.max(current.violations, data.violations ?? 0),
            matches: Math.max(current.matches, data.matches ?? 0),
            seasons: Math.max(current.seasons, data.seasons ?? 0),
            humanWins: 0,
          };
          writeCache(current);
        }
        window.dispatchEvent(new CustomEvent('standings:update', { detail: getStandings() }));
      }
    } catch { /* offline — the optimistic bump stands */ }
  }, 400);

  return getStandings();
}

export function formatStandings(s = current) {
  const n = x => x.toLocaleString('en-US');
  return `THE HOUSE ${n(s.houseWins)}  —  HUMANITY ${n(s.humanWins)}`;
}

export function renderStandingsStrip(el, s = current) {
  if (!el) return;
  el.textContent = formatStandings(s);
  el.dataset.ready = 'true';
}
