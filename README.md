# Tic Tac Cheat

A rigged game of tic-tac-toe. You are X. The house is O. You cannot win a
board — the referee is the house — but every time it cheats, it leaves
evidence. Document enough violations and you can take the house to court.

Vanilla ES modules, no build step. Deploys as a static site with one Cloudflare
Pages Function backing the global counter.

## Run locally

```bash
npx wrangler pages dev .
```

or, without the counter:

```bash
python3 -m http.server 8788
```

## Layout

| Path | What |
|---|---|
| `index.html` · `styles/` · `src/` | the site |
| `functions/api/standings.js` | global tally (Pages Function + KV) |
| `styles/tokens.css` | the only file that declares design tokens |
| `clone-workspace/` | reconstruction notes — how this was rebuilt from the original, and the design-token spec every surface follows |
| `scripts/assert-styles.mjs` | style-assertion gate |
| `tests/` | `node --test` |

## Provenance

Rebuilt from the deployed assets of an earlier static version, following a
measured, computed-style-first reconstruction (see `clone-workspace/`), then
extended. The global counter's numbers are a bit — a gag tally, not audited data.
