// Cloudflare Pages Function — the global tally behind "THE HOUSE n — HUMANITY 0".
//
// GET  /api/standings            -> { houseWins, humanWins, violations, matches, seasons }
// POST /api/standings  { matchesDelta, violationsDelta, houseWinsDelta, seasonsDelta }
//
// This is a gag counter, not audited data. KV get+put is not atomic, so a
// concurrent write can be lost — that is fine here. The one number that is not
// a counter is humanWins.

const KEYS = ['houseWins', 'violations', 'matches', 'seasons'];

// A plausible starting point so the counter doesn't read "3" on launch. KV only
// ever holds growth since deploy; the displayed figure is SEED + growth.
const SEED = {
  houseWins: 52_140,
  violations: 191_744,
  matches: 52_140,
  seasons: 8_305,
};

// Per-call clamp so a misbehaving or malicious client can't spike the numbers.
const MAX_DELTA = { matches: 3, houseWins: 3, violations: 30, seasons: 2 };

const HUMAN_WINS = 0; // This value is not a variable.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });

async function readAll(kv) {
  const raw = await Promise.all(KEYS.map(k => kv.get(k)));
  const out = {};
  KEYS.forEach((k, i) => { out[k] = SEED[k] + (parseInt(raw[i], 10) || 0); });
  return out;
}

async function hash(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestOptions() {
  return json({}, 204);
}

export async function onRequestGet({ env }) {
  if (!env.STANDINGS) return json({ ...SEED, humanWins: HUMAN_WINS, offline: true });
  const totals = await readAll(env.STANDINGS);
  return json({ ...totals, humanWins: HUMAN_WINS });
}

export async function onRequestPost({ request, env }) {
  if (!env.STANDINGS) return json({ ...SEED, humanWins: HUMAN_WINS, offline: true });

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad request' }, 400);

  // light per-IP rate limit — the key is a short hash, TTL'd, never returned
  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  const rlKey = 'rl:' + (await hash(ip));
  if (await env.STANDINGS.get(rlKey)) {
    const totals = await readAll(env.STANDINGS);
    return json({ ...totals, humanWins: HUMAN_WINS, throttled: true });
  }
  // KV's minimum TTL is 60s. One write per IP per minute to the shared totals
  // is plenty; the client bumps its local figure optimistically in between, so
  // the number still moves for the player even while throttled.
  await env.STANDINGS.put(rlKey, '1', { expirationTtl: 60 });

  const deltas = {
    matches: clampDelta(body.matchesDelta, MAX_DELTA.matches),
    houseWins: clampDelta(body.houseWinsDelta, MAX_DELTA.houseWins),
    violations: clampDelta(body.violationsDelta, MAX_DELTA.violations),
    seasons: clampDelta(body.seasonsDelta, MAX_DELTA.seasons),
  };

  await Promise.all(KEYS.map(async k => {
    if (!deltas[k]) return;
    const current = parseInt(await env.STANDINGS.get(k), 10) || 0;
    await env.STANDINGS.put(k, String(current + deltas[k]));
  }));

  const totals = await readAll(env.STANDINGS);
  return json({ ...totals, humanWins: HUMAN_WINS });
}

function clampDelta(v, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
}
