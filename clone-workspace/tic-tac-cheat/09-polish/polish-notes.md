# Phase 6 — polish notes

## Accessibility

- **Board keyboard nav** — roving tabindex (one tab stop for the grid), arrow
  keys move between cells without wrapping rows, Home/End jump to row ends. The
  tab stop re-homes to a focusable cell when the current one is filled/condemned.
- **Screen-reader cheat narration** — `#sr-live` (assertive, visually hidden)
  announces the concrete action the bureaucratic incident text omits:
  "The House removed your mark from the centre.", "The House condemned bottom
  left. It is out of play.", etc. `setTimeout`-gated (not rAF — rAF is throttled
  in a backgrounded tab).
- **Focus management** — tribunal and endgame move focus to their heading
  (`tabindex=-1`); the rulebook modal focuses its close button and closes on
  Escape / backdrop; a season roll returns focus to the New Game button.
- **Contrast** — `--muted` nudged `#777164` → `#6b6459` (4.2:1 → 5.08:1 on
  `--paper`; 4.65:1 on `--shell`). Small red-on-paper text that carried real
  information (`.judge-line`, `.evidence-progress.ready`, `.endgame-role`) moved
  to `--ink` with a red `▸` marker; the "record amended" state stopped relying on
  colour alone — it now gets an explicit `AMENDED BY THE HOUSE` tag plus a red
  left rule. `--red` itself is unchanged (brand fidelity; the original's own
  large-text red-on-paper uses are ≥3:1 and fine).
- Colour is never the only signal: condemned cells are hatched + labelled,
  leaked/amended incidents are tagged, the turn pill pairs its dot with a word.

## Responsive

Verified 375 / 768 / desktop, match + tribunal + endgame:
- topline aside wraps at ≤560; turn-pill min-width drops to 0
- counter-measure grid 5-col → 2-col at ≤560
- tribunal body 2-col → 1-col at ≤700; its buttons go full-width at ≤560
- verdict card is `width:100%; max-width:420px`
- **no horizontal overflow at any width** (measured: `scrollWidth === clientWidth`)

## Reduced motion

The global `@media (prefers-reduced-motion: reduce)` block neutralises every
animation/transition; `.confetti` is `display:none`; `boardView` swaps the
near-miss flash for an instant static `STOLEN` stamp.

## Assets

- `assets/og.png` — 1200×630 social card, drawn in the site's language (builder
  archived at `09-polish/og-card-builder.html`).
- Fonts self-hosted (6 woff2, ~90KB total), 2 preloaded.

## Verification summary

- `npm test` — 19/19 (engine + meta, incl. the 5000-run sacred-invariant test)
- `node scripts/assert-styles.mjs` — 106/106
- `wrangler pages dev` — GET/POST/KV all exercised; humanWins stays 0 under every
  input; client verified online (strip increments) and offline (seeded fallback)
- multi-match playthroughs with appeals, counter-measures, rulebook, cam toggle,
  tribunal, both endgame branches, season roll — **zero console errors/warnings**
