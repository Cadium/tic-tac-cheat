# File tree

Vanilla ES modules, no build step, served from repo root. Cloudflare Pages
serves the root; `functions/` is the Pages Functions dir.

```
tic-tac-cheat/
├── index.html                 # single page. all screens are sections toggled with [hidden].
├── assets/
│   ├── fonts.css              # @font-face (self-hosted woff2)
│   ├── fonts/*.woff2
│   └── og.png                 # social card
├── styles/
│   ├── tokens.css             # :root — every DESIGN.md token. loaded first. SOLE token author.
│   └── app.css                # layout + components. consumes var(--token) only.
├── src/
│   ├── main.js                # entry: build state, wire DOM, screen router, per-match loop
│   ├── engine/
│   │   ├── board.js           # pure. lines, winner, squares, emptyCells, applyStep, mulberry32 RNG
│   │   ├── referee.js         # planTurn(v2): tiered rigged plan -> { steps, board, kind }, steps carry cheatEvent
│   │   ├── tiers.js           # TIERS[1..5] defs + tierForMatch(matchNo, composure)
│   │   ├── composure.js       # makeComposure(): value 0..100, band(), nudge(), bands drive voice + aggression
│   │   └── evidence.js        # EXHIBIT_CLASSES, recordFromCheatEvent(bank, ev) -> updates typed exhibits
│   ├── meta/
│   │   ├── run.js             # makeRun(): match #, season #, tier, evidence bank, losses, flags. completeMatch()
│   │   ├── countermeasures.js # COUNTERMEASURES[5]: id,label,cost,cap,apply(ctx). pure-ish effects on turn state
│   │   └── persistence.js     # load()/save() run+settings to localStorage, all try/catch, schema-versioned
│   ├── ui/
│   │   ├── boardView.js       # render(board, changed, kind), nearMissSteal(), morphXO(), disabled logic
│   │   ├── incidentLog.js     # report(msg), refereeCamLine(statute), self-rewrite (tier 5), reset
│   │   ├── composureMeter.js  # render bar + band label + aria-live announce
│   │   ├── countermeasureBar.js # render buttons w/ cost/affordability, dispatch use events
│   │   ├── houseVoice.js      # LINES keyed by {situation, band} -> pick(rng)
│   │   ├── tribunal.js        # open(run): full-screen case, exhibits vs defense, public-opinion bar, verdict
│   │   ├── verdictCard.js     # drawCard(canvas, verdict) -> toBlob; download + navigator.share
│   │   ├── toast.js           # showToast(msg), timer
│   │   ├── endgame.js         # one-time "THE HOUSE is hiring" modal + ghost match (you as O)
│   │   ├── rulebook.js        # "HOUSE RULES, 4th ed." modal — the full fake statute list
│   │   └── sound.js           # WebAudio SFX (whistle, chime, register, buzzer). off by default, persisted.
│   └── net/
│       └── standings.js       # GET/POST /api/standings, optimistic + offline localStorage fallback
├── functions/
│   └── api/
│       └── standings.js       # Pages Function. GET returns tallies; POST clamps deltas; humanWins === 0 always.
├── clone-workspace/tic-tac-cheat/   # this methodology paper trail (not shipped; .gitignore? no — keep in repo)
├── scripts/assert-styles.mjs        # QA gate
├── tests/engine.test.mjs            # node --test
├── wrangler.toml                    # [[kv_namespaces]] binding STANDINGS for `wrangler pages dev`
├── README.md
└── .gitignore
```

## Load order in index.html

1. `<link rel="preload">` the two most-used woff2 (space-grotesk-latin, dm-mono-500-latin)
2. `assets/fonts.css`
3. `styles/tokens.css`
4. `styles/app.css`
5. `<script type="module" src="src/main.js">`
