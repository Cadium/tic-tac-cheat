# Tribunal Mode — pre-UI validation

Goal (per the user): before building any UI, prove that a naive player and a
strong player have measurably different win rates in the overload/forfeit
mechanic on a 3x3 board.

## Model

- Player is X, moves first. House is O. Standard 3x3, 8 lines.
- The House never loses the board. When the player completes a line OR holds a
  fork (>=2 completing cells), the House is FORCED to intervene: it erases a
  player mark and — in the realistic model — still places its own.
- Each intervention spends 1 from the House's budget.
- Player wins ONLY by forcing (budget + 1) interventions in one match -> FORFEIT.
- Board full / draw with no forfeit -> the House wins.

## Result: the mechanic has no skill headroom on 3x3

`scripts/tribunal-sweep.mjs`, exhaustive analysis in `src/engine/analysis.js`:

| House placement | intervene skips placement | maxForcible (perfect player, from empty) | naive forfeit% | strong forfeit% |
|---|---|---|---|---|
| honest 1-ply | no (board favours House) | **1** | ~0 at every budget | ~0 at every budget |
| honest 1-ply | yes (House barely places) | 46 (capped) | 25.7% flat | 19.1% flat |
| perfect minimax | no | **1** | 0 | 0 |
| perfect minimax | yes | 46 | 0 | 0 |

- In the only model that keeps "the board favours the House" (the House places
  every turn), **a perfect player can force exactly ONE intervention.** Budget 1+
  is unloseable for the House.
- naive vs strong forfeit-rates are **both ~0** and the gap is not positive —
  there is no measurable skill difference.
- State space is tiny: **168 distinct reachable positions, 258 game-tree nodes.**

## Why

3x3 tic-tac-toe is ~5478 nodes / trivially solved. A House that places a mark
every turn and can additionally erase one of yours has total board control —
after it answers your fork and places optimally, you cannot reconstitute a
second fork before the board fills (9 cells, ~5 player moves total). There is no
tempo or positional layer for skill to live in.

## Recommendation

The overload mechanic is sound in principle — it just needs a board with room to
sustain pressure over many turns. Next probe: generalise to **4x4 (four in a
row)** or **5x5**, re-run the same simulator, and find the board size + budget
where `strong forfeit% - naive forfeit%` is large. Keep 3x3 as Comedy Mode only.
