# Tic Tac Cheat

A rigged game of tic-tac-toe. You are X. The House is O. **You cannot win the
board** — the referee works for the House — but every time it cheats, it leaves
evidence. Document enough, and you can take the House to court.

Vanilla ES modules, no build step. Static site + one Cloudflare Pages Function
for the global counter.

---

## Play

The House cheats harder the longer a season runs:

| Match | Tier | The House starts… |
|---|---|---|
| 1 | Housekeeping | quietly erasing the occasional inconvenient mark |
| 2 | Promotions | taking two moves a turn |
| 3 | Renovations | condemning squares |
| 4 | Rebranding | reclassifying your marks as its own |
| 5+ | Compliance | disabling appeals, rewriting the incident report, gaslighting |

Its **composure** drains as you rattle it, and a rattled House overreaches —
which is more evidence for you.

**Counter-measures** cost documented violations:

- **Subpoena** — the House must declare its next two moves
- **Freeze Frame** — strike its last turn from the record
- **Instant Replay** — rewind your move; it replies clean
- **Whistleblower** — leak an incident (permanent composure hit; that exhibit
  counts double at trial)
- **Audit** — freeze the House for a whole turn

None of them let you win the board. That's the point.

At **5 distinct exhibit classes** (or 15 total violations) you can **Press
Charges**: *THE PEOPLE v. THE HOUSE*. The verdict is always guilty. The sentence
changes nothing. You get a card to share.

After your first verdict the House offers you a job.

---

## Run it locally

With the global counter (needs the KV binding — wrangler simulates it locally):

```bash
npx wrangler pages dev .
```

Without it (the counter falls back to a seeded local figure):

```bash
python3 -m http.server 8788
```

Checks:

```bash
npm test                    # node --test — engine + meta, incl. the 5000-run invariant
node scripts/assert-styles.mjs   # computed-style gate vs the design tokens
```

---

## Deploy (Cloudflare Pages)

The site is static; only `functions/api/standings.js` needs anything.

1. **Create the KV namespace:**
   ```bash
   npx wrangler kv namespace create STANDINGS
   ```
   Paste the returned `id` into `wrangler.toml` (replacing `REPLACE_WITH_KV_NAMESPACE_ID`).

2. **Deploy:**
   ```bash
   npx wrangler pages deploy .
   ```
   (First run creates the Pages project and prompts for a name.)

   *Or* connect this repo to a Pages project in the Cloudflare dashboard with
   **build command:** none, **output directory:** `/`, then bind a KV namespace
   called `STANDINGS` under Settings → Functions → KV namespace bindings.

The game is fully playable if the function is missing or down — the counter just
shows its seeded fallback.

---

## Layout

| Path | What |
|---|---|
| `index.html` · `styles/` · `src/` | the site |
| `styles/tokens.css` | the only file that declares design tokens |
| `src/engine/` | pure game logic — board, the rigged referee, tiers, composure, evidence |
| `src/meta/` | the run: economy, counter-measures, persistence |
| `src/ui/` | rendering — board, incident log, meters, tribunal, verdict card, endgame |
| `src/net/standings.js` | global-counter client (optimistic, offline-tolerant) |
| `functions/api/standings.js` | the counter (Pages Function + KV) |
| `clone-workspace/` | how this was rebuilt from an earlier static version, and the design-token spec every surface follows |
| `scripts/assert-styles.mjs` · `tests/` | the gates |

## Provenance

Rebuilt from the deployed assets of an earlier static version, following a
measured, computed-style-first reconstruction (see `clone-workspace/`), then
extended. The counter's numbers are a bit — a gag tally, not audited data. KV
`get`+`put` isn't atomic; an occasional lost increment is expected and fine.
