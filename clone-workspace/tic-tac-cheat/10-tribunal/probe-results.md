# 4x4 / 5x5 probe — result: VIABLE on 5x5 four-in-a-row + CONDEMN

Same naive + strong policies, same overload/forfeit model, generalised to N x N.
`scripts/probe/run.mjs` (sweep) and `scripts/probe/confirm.mjs` (deep + narrated).

## Sweep summary (3000 matches / cell)

| geometry | intervention | outcome |
|---|---|---|
| 4x4 four-in-a-row | erase / condemn / swap | **dead** — 0% forfeits at every budget, House dominates, 16 cells too small |
| 5x5 four-in-a-row | erase | dead — House too dominant on the big board |
| 5x5 four-in-a-row | swap | collapses past budget 1 |
| **5x5 four-in-a-row** | **condemn** | **VIABLE — see below** |
| 5x5 five-in-a-row | any | dead — only 12 lines, nobody ever threatens, 13-turn games |

## The viable design: 5x5 · four-in-a-row · CONDEMN

CONDEMN = when forced (player line or fork), the House permanently locks the
empty cell the player most needs, and still places its own mark.

| budget | naive forfeit% | strong forfeit% | expert forfeit% | gap (strong-naive) | House board-win% vs strong | median turns (p10..p90) |
|---|---|---|---|---|---|---|
| 2 | 24.1 | 79.4 | 92.6 | 55.3 | 20.6 | 6 (6..12) |
| 3 | 23.3 | 79.4 | 91.2 | 56.1 | 20.6 | 7 (7..12) |
| **4** | **21.8** | **79.3** | **90.7** | **57.5** | **20.7** | **8 (8..12)** |
| 5 | 6.2 | 78.6 | 89.0 | 72.3 | 21.4 | 9 (9..12) |
| 6 | 0.0 | 78.6 | 77.7 | 78.6 | 21.4 | 10 (10..12) |
| 8 | 0.0 | 0.0 | 0.0 | 0 | 100.0 | — (unbreakable) |

Against every viability criterion:

1. **Skill gap** — 55-79 points, far past the 20-30 target. And `expert`
   (1-ply lookahead) sits another ~10 above `strong`, so there is ceiling above
   the taught strategy too.
2. **Neither trivially dominant** — strong tops out ~79%, the House still wins
   ~21% of strong games on the board; naive is crushed (0-24%). Budget 8 is a
   natural "unbreakable" difficulty cap.
3. **Readable** — median 6-10 turns, p90 = 12.
4. **The House still feels like the House** — it controls the board (wins vs
   naive 78-100%, vs strong ~21%), methodically condemning squares. Narrated
   match: strong player forces one CONDEMN per turn, budget 4 -> 0 over four
   turns, then completes a line the House can't answer -> forfeit on turn 8.

## Budget as a difficulty axis — the ceiling at 6 (same-seed check)

Running `strong` and a greedy 1-ply `expert` on **identical seeds** (6000 each):

| budget | strong forfeit% | expert forfeit% | expert forced 6 ints | expert forfeits |
|---|---|---|---|---|
| 4 | 78.5 | 91.7 | forced 4 in 5525/6000 | ~5502 (nearly all convert) |
| 6 | 77.7 | 78.7 | forced 6 in 5402/6000 | ~4722 (~680 don't convert) |

At budget 4 the ladder is clean: `strong` 78.5% -> `expert` 91.7% on the same
hands, and almost every game where `expert` forces the 4th intervention ends in a
forfeit. At budget 6 the ladder flattens: `expert` forces the interventions
*faster* (greedy fork-maxing) but then **runs out of board** before it can land
the post-budget threat — it forces all 6 warrants in 5402 games yet only forfeits
in ~4722. This is not policy noise; forcing 7 compelled interventions bumps
against 25 cells / ~12 player moves, so budget 6 sits at the mechanic's ceiling.

**Conclusion:** budget alone is not a clean difficulty knob. Ship **budget 4 as
Standard**. Harder tiers, when built, come from *verified seeded scenarios*
(openings, House placement variants, pre-condemned cells), not a bigger budget.

### Recommended spec (vertical slice)

- board 5x5, four in a row
- intervention = CONDEMN (lock the cell)
- **budget 4 (Standard)** — the only tier the slice ships. One seed per match.
- The honest House heuristic (win > block single threat > deny fork > take own
  fork > extend line > centre) is strong enough; no minimax needed at 25 cells.
- budget 2-3 stay gentle but a naive player still breaks the House ~1 in 4;
  budget 5+ mostly punishes naive play without adding a real skill tier (above).

## Next

Tribunal Mode ships as a vertical slice at `/tribunal/` (route). Engine promoted
verbatim from `scripts/probe/{grid,model,policies}.mjs` into
`tribunal/src/engine/`, locked by `tests/tribunal-engine.test.mjs`. Comedy Mode
(v2) untouched.

`scripts/probe/` stays as the reproducible sweep — re-run `run.mjs` / `confirm.mjs`
before touching any House or policy heuristic.
