# DESIGN.md — Tic Tac Cheat / "THE HOUSE"

Authoritative token system. Extracted from the target's verbatim authored
stylesheet (`02-extraction/all-styles.css`) plus confirmed computed colour
resolutions. **Every value in the rebuild — original shell and all new UI —
comes from a token here. Consume tokens; never redefine them, never hardcode a
hex or a px in a component file.** New surfaces (composure meter, counter-measure
bar, tribunal, verdict card) are built only from these tokens + the Design
Guardrails below.

The target is deliberately raw: hard edges, 2px black rules, one hard drop
shadow, a newsprint palette, a monospace voice for everything administrative and
a tight grotesk for everything loud. It reads like a rigged government form.

---

## 1. Colour

| Token | Value | Resolved | Role |
|---|---|---|---|
| `--ink` | `#121212` | `rgb(18,18,18)` | text, borders, dark fills (footer, pill, buttons), grid lines |
| `--paper` | `#f4efdf` | `rgb(244,239,223)` | page background, cells, light text on dark |
| `--shell` | `#ece5d2` | `rgb(236,229,210)` | game-shell background (was an untokenised literal) |
| `--red` | `#ed3d2b` | `rgb(237,61,43)` | the House / O / accent / alarm / drop shadow |
| `--yellow` | `#ffd438` | `rgb(255,212,56)` | you / hover / winning line / highlight |
| `--muted` | `#777164` | `rgb(119,113,100)` | secondary + fine print |
| `--line` | `rgba(18,18,18,.22)` | — | hairline dividers inside the scorecard |
| `--focus` | `#1976d2` | `rgb(25,118,210)` | focus outline (was an untokenised literal) |

Accent discipline: `--red` = the House and everything it does to you; `--yellow`
= you and anything in your favour. Never swap these roles. New "evidence /
justice" UI uses `--yellow` as its positive accent and `--ink` structure;
`--red` stays the antagonist.

Do **not** introduce new hues. Tints/shades are done with `color-mix()` against
`--ink` / `--paper` only, e.g. `color-mix(in srgb, var(--ink) 8%, var(--paper))`
for a faint fill, and are allowed **locally** in a component file (they still
resolve to token colours).

---

## 2. Type

Two families. No third.

| Token | Stack |
|---|---|
| `--font-display` | `"Space Grotesk", "Arial Narrow", Arial, sans-serif` |
| `--font-mono` | `"DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

Self-hosted faces in `assets/fonts.css`: Space Grotesk 500/600/700, DM Mono
400/500. `font-synthesis: none` on `:root`.

### Ramp (verbatim clamp() expressions from the target)

| Token | Font / weight | Size | Line | Tracking | Used for |
|---|---|---|---|---|---|
| `--t-hero` | display 700 | `clamp(4rem, 10vw, 9.5rem)` | `.76` | `-.09em` | `h1` |
| `--t-ghost` | display 700 | `clamp(19rem, 38vw, 36rem)` | `.5` | `-.12em` | the giant "O" behind the intro |
| `--t-status` | display 600 | `clamp(1.25rem, 2.5vw, 2.2rem)` | normal | `-.045em` | status line |
| `--t-score` | display 700 | `clamp(4rem, 8vw, 7rem)` | `1` | `-.09em` | the big score numerals |
| `--t-lede` | mono 500 | `clamp(.9rem, 1.6vw, 1.12rem)` | `1.45` | normal | intro lede |
| `--t-label` | mono 500 | `.66rem` | `1` | `.11em`, uppercase | section labels / eyebrows |
| `--t-pill` | mono 500 | `.66rem` | `1` | normal | turn pill, house-status |
| `--t-btn` | mono 500 | `.73rem` | `1` | `.03em` | new-game button |
| `--t-appeal` | mono 500 | `.67rem` | `1` | normal | appeal button |
| `--t-log` | mono 500 | `.72rem` | `1.4` | normal | incident rows |
| `--t-meta` | mono 400 | `.6rem` | `1` | normal | score-head / log-head meta |
| `--t-fine` | mono 400 | `.56rem` | `1.4` | normal | fine print |
| `--t-foot` | mono 400 | `.58rem` | `1.4` | normal | footer |
| `--t-toast` | mono 500 | `.7rem` | `1.45` | normal | toast |
| board mark | display 600 | `22cqw` (board is `container-type: inline-size`) | `1` | `-.1em` | `×` / `○` glyphs |

New UI text sizes pick the nearest existing token — labels are `--t-label`, body
copy is `--t-log`, fine print is `--t-fine`, big numbers are `--t-score`.

---

## 3. Space & structure

- **Border:** `2px solid var(--ink)` is *the* structural rule — page frame
  (`border-inline` on `main`), every section divider, board frame, dark buttons,
  toast, scorecard internal columns. Hairline dividers inside the incident log
  are `1px solid var(--line)`.
- **Radius:** `0` everywhere. The only round things are two 8px status dots
  (`border-radius:50%`) and the 24px numbered circle on incident rows. New UI
  keeps `border-radius: 0` except for status-dot-style indicators.
- `--radius-dot: 50%` · `--dot: 8px` · `--badge: 24px`
- **Section rhythm:** big padded blocks — `clamp(2rem,5vw,5rem)` on the board
  column, `clamp(2rem,4vw,4rem)` on the scorecard, `1.8rem 5vw` on the topline,
  min-heights on most bands (intro 370/275, topline 118/125, footer 100).
- **Layout containers:** `main` and `footer` are `max-width: 1440px`, centred.
  `.game-grid` is `minmax(440px,1.25fr) / minmax(320px,.75fr)`, collapsing to one
  column at `≤850px`.
- Spacing scale (for new UI; derived from the values actually in use):
  `--s-1:.4rem` `--s-2:.65rem` `--s-3:1rem` `--s-4:1.3rem` `--s-5:1.8rem`
  `--s-6:2.3rem`.

---

## 4. Shadow & effects

Exactly one shadow idiom: a **hard offset block shadow**, no blur, in a token
colour.

| Token | Value | On |
|---|---|---|
| `--shadow-hard` | `13px 13px 0 var(--red)` | the board (desktop) |
| `--shadow-hard-sm` | `7px 7px 0 var(--red)` | the board (`≤560px`) |
| `--shadow-toast` | `6px 6px 0 var(--ink)` | the toast |

No `filter`, no `backdrop-filter`, no gradients anywhere. New elevated surfaces
(tribunal card, verdict card, modals) use `--shadow-toast` (ink block shadow).
The verdict-card canvas reproduces the same hard-shadow language.

---

## 5. Motion

Durations are short and mechanical; easing is either linear or a single
overshoot curve.

| Token | Value |
|---|---|
| `--ease-stamp` | `cubic-bezier(.2,.8,.2,1)` |
| `--dur-stamp` | `.4s` |
| `--dur-steal` | `.55s` |
| `--dur-toast` | `.25s` |

Keyframes (keep names; new ones follow the same spirit):

- `stamped` — `--dur-stamp` `--ease-stamp` — `from { background: var(--red) }`
  (the House's mark slams down red then settles).
- `stolen` — `--dur-steal` ease — `20%,46% { background: var(--ink) }` (a cell
  blinks black twice as your mark is taken).
- toast — `transform .25s ease`, slides up from `translateY(160%)`.

New motion added for the level-up, same idiom:

- `near-miss` — a held `--yellow` flash on the board + a shake, ~700ms, *before*
  the steal fires (so the player sees the win, then loses it).
- `morph-x-o` — an `×` scaling/rotating into an `○` for Identity-Fraud tier.
- `meter-drop` — the composure bar ticking down in steps, `--ease-stamp`.

**`prefers-reduced-motion: reduce`** (target already does this): all
`animation-duration` → `.01ms`, `animation-iteration-count` → `1`,
`transition-duration` → `.01ms`. The near-miss flash becomes an instant static
`STOLEN` stamp; `morph-x-o` becomes an instant swap. Honour this everywhere.

---

## 6. States

| Surface | Hover | Focus | Active/disabled |
|---|---|---|---|
| empty cell | `background: var(--yellow)` | `outline: 5px solid var(--focus); outline-offset:-6px; z-index:1` | disabled: `cursor:default; opacity:1` (filled/locked) |
| `.new-game` | `color:var(--ink); background:var(--yellow)` | (inherits) | — |
| `.appeal` | `color:var(--paper); background:var(--red)` | (inherits) | tier 5: `disabled`, greyed |
| dark pill/button | — | — | `.turn-pill.ai` swaps its dot `--yellow`→`--red` |

New interactive controls (counter-measure buttons, tribunal buttons) use the
`.new-game` idiom: ink block by default, `--yellow` fill on hover, `--focus`
ring, `cursor:pointer`. An unaffordable counter-measure is `disabled` + `opacity`
reduced, same as a locked cell.

---

## 7. Design Guardrails (obey when building new UI)

1. **Two accents, fixed meaning.** `--red` = House/threat, `--yellow` =
   you/relief. Never a third colour.
2. **Everything administrative is monospace.** Any label, log line, statute
   citation, form field, verdict text → `--font-mono`. Grotesk is reserved for
   loud display moments (headline, score, verdict headline).
3. **Hard edges only.** `border-radius: 0`. One shadow idiom (hard offset, no
   blur). No gradients, no blur, no glass.
4. **2px ink rule** is the divider for structure; `1px --line` for hairlines
   inside a panel.
5. **Motion is mechanical and brief.** Stamp, blink, slide. Nothing eases for
   longer than `.55s`. Always provide the reduced-motion equivalent.
6. **Voice is deadpan bureaucrat.** Copy stays flat, official, faintly menacing —
   "processing fee", "your application", "sole and unreviewable discretion".
   Never wink at the player.
7. **The player never wins the board.** Any new mechanic that could produce
   `winner(board,'X')` as a terminal state is a bug.

---

## 8. Asset paths

- Fonts: `assets/fonts/*.woff2`, declared in `assets/fonts.css`.
- Social card: `assets/og.png` (1200×630, generated in the same visual language).
- No images or icons in the UI — every glyph is a font character or CSS.
