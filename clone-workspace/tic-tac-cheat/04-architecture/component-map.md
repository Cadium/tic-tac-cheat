# Component map

## Original (target) — one screen

```
main
├── section.intro
│   ├── h1#page-title  ("THINK YOU / CAN WIN?")
│   ├── p.lede
│   └── ::after  (giant ghost "O")
└── section.game-shell
    ├── .game-topline
    │   ├── p#status.status  [aria-live=polite]
    │   └── .turn-pill  (#turn-dot, #turn-label)
    └── .game-grid
        ├── div            (board column)
        │   ├── #board.board[role=grid]
        │   │   └── button[role=gridcell][data-cell=0..8] ×9   (.x/.o/.winner/.ai-move/.cheated)
        │   └── #new-game.new-game
        └── aside.scorecard
            ├── .score-head  (.label "OFFICIAL SCORE", #match-number)
            ├── .scores      (YOU #player-score=0  |  THE HOUSE #ai-score)
            ├── .fine-print
            ├── .log-head    (.label "INCIDENT REPORT", #incident-count)
            ├── ol#incident-log[aria-live=polite]  > li[data-number]
            └── #appeal.appeal
footer  (2 lines)
#toast[role=status]
```

## Rebuild — screens (sections in one index.html, toggled with [hidden])

```
#screen-match      (default) — the original layout above, PLUS:
  .game-topline
    + button#referee-cam-toggle  (topline, right of pill)
    + #standings-strip  ("THE HOUSE 48,213 — HUMANITY 0")   [from net/standings.js]
  board column
    + #composure-meter   (House Composure bar + band word)   [ui/composureMeter.js]
    + #countermeasure-bar (5 buttons w/ point costs)         [ui/countermeasureBar.js]
    + button#press-charges (hidden until evidence threshold)
  scorecard
    incident-log li  gains  .statute  child when Referee Cam on   [ui/incidentLog.js]
    + #evidence-tally  (Exhibit A–E class counts)

#screen-intermission  — between matches: tier reveal ("THE HOUSE — RENOVATIONS"),
                        evidence banked, spend points on counter-measures, [CONTINUE]

#screen-tribunal   — THE PEOPLE v. THE HOUSE. exhibit list | house defense |
                     #public-opinion bar | [PRESENT NEXT] | verdict block |
                     <canvas#verdict-card> + [DOWNLOAD] [SHARE]

#screen-endgame    — one-time modal after first verdict: "THE HOUSE is hiring."
                     [ACCEPT] -> #screen-ghost (you play O, rigging tools, scripted human)
                     [DECLINE] -> clean end card + ×-confetti

#modal-rulebook    — "HOUSE RULES, 4th ed." full statute list (overlay, any screen)
```

## State ownership

| State | Owner | Persisted |
|---|---|---|
| board, turn, busy, generation, current plan | `main.js` (per-match, transient) | no |
| match #, season #, tier, losses, evidence bank, flags (seenEndgame…) | `meta/run.js` | yes (`persistence.js`) |
| House composure value + floor | `engine/composure.js` instance held by `run` | yes |
| settings: sound on/off, refereeCam on/off, reducedMotion override | `persistence.js` | yes |
| global tallies | server KV via `net/standings.js`; mirrored to localStorage | server + local |

`main.js` holds the match loop and is the only module that mutates the DOM board;
every `ui/*` module exposes a small render/opened API and emits `CustomEvent`s
(`cm:use`, `tribunal:done`, `endgame:choice`) that `main.js` listens for. No
shared mutable singletons beyond the one `run` object passed by reference.

## Per-match loop (main.js)

```
player clicks cell i
  -> board[i] = 'X'; playSfx('tap')
  -> if winner(board,'X'):  nearMissSteal()  (flash + chime + hold 700ms)
  -> plan = planTurn(board, turn, prev, rng, tierForMatch(run.match, composure.value))
  -> for step of plan.steps:
        applyStep -> boardView.render(changed, step.cheat)
        if step.cheatEvent:
           incidentLog.report(step.message)
           if refereeCam: incidentLog.refereeCamLine(step.cheatEvent.statute)
           evidence.recordFromCheatEvent(run.bank, step.cheatEvent)
           composure.nudge(...)
           standings.bumpViolations()
        await step.delay   (respect reduced-motion -> ~0)
  -> if winner(board,'O'): run.completeMatch('loss'); composure clean-win bump;
        standings.bumpMatch({house:1}); -> #screen-intermission (or tribunal if unlocked & chosen)
  -> else back to player
counter-measure use (cm:use) interrupts: apply effect to the pending plan / board,
  spend points, composure.nudge(-10), re-render.
```
