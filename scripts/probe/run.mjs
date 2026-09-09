#!/usr/bin/env node
// 4x4 / 5x5 probe. Sweeps board geometry x budget x intervention type and
// reports whether a strong player materially out-forfeits a naive one.
//
//   node scripts/probe/run.mjs

import { makeGrid, winner } from './grid.mjs';
import { playMatch } from './model.mjs';
import { naiveMove, strongMove } from './policies.mjs';

const GEOMS = [
  { N: 4, K: 4, label: '4x4 four-in-a-row' },
  { N: 5, K: 4, label: '5x5 four-in-a-row' },
  { N: 5, K: 5, label: '5x5 five-in-a-row' },
];
const INTERVENTIONS = ['erase', 'condemn', 'swap'];
const BUDGETS = [1, 2, 3, 4, 5, 6];
const N = 3000;

const viable = r =>
  (r.strong - r.naive) >= 20 &&
  r.naive <= 25 && r.strong >= 35 && r.strong <= 92 &&
  r.turns >= 6 && r.turns <= 22;

for (const geom of GEOMS) {
  const g = makeGrid(geom.N, geom.K);
  console.log(`\n=====  ${geom.label}  (${g.cells} cells, ${g.lines.length} lines)  =====`);
  for (const iv of INTERVENTIONS) {
    console.log(`\n  intervention: ${iv}`);
    console.log('  budget | naive% | strong% |  gap  | avg turns | strong int. | flag');
    for (const budget of BUDGETS) {
      let nw = 0, sw = 0, st = 0, si = 0;
      for (let s = 1; s <= N; s++) {
        const a = playMatch(g, budget, iv, naiveMove, s);
        const b = playMatch(g, budget, iv, strongMove, s ^ 0x9e3779b9);
        if (a.outcome === 'forfeit') nw++;
        if (b.outcome === 'forfeit') { sw++; }
        st += b.turns; si += b.interventions;
      }
      const row = { naive: 100 * nw / N, strong: 100 * sw / N, turns: st / N, int: si / N };
      row.gap = row.strong - row.naive;
      const flag = viable(row) ? '  <<< CANDIDATE' : '';
      console.log(
        `    ${budget}   | ${row.naive.toFixed(1).padStart(5)} | ${row.strong.toFixed(1).padStart(6)} | ${row.gap.toFixed(1).padStart(5)} |   ${row.turns.toFixed(1).padStart(4)}    |    ${row.int.toFixed(2)}     |${flag}`
      );
    }
  }
}
console.log('\nCANDIDATE = strong-naive gap >= 20, naive <= 25%, strong 35-92%, 6-22 turns.\n');
