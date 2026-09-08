// After your first guilty verdict, the House makes you an offer. Accept and you
// see the machine from the inside for one match. Decline and you keep your
// record — 0–0, clean. Either way the season rolls over.

import { sfx } from './sound.js';

const GHOST_SCRIPT = [
  { patron: 'The patron plays the centre. The patron seems hopeful.', cell: 4 },
  { patron: '“I just need one more.” The patron plays a corner.', cell: 0 },
  { patron: '“That’s three. That’s three in a row, isn’t it?” The patron has a line.', cell: 8, line: true },
];

export function openEndgame(run, { onSeason, onGhostDone }) {
  const root = document.getElementById('screen-endgame');
  document.getElementById('screen-match').hidden = true;
  document.getElementById('screen-tribunal').hidden = true;
  root.hidden = false;
  run.flags.seenEndgame = true;
  sfx('register');

  root.innerHTML = `
    <div class="endgame">
      <p class="label">A LETTER FROM THE HOUSE</p>
      <h2>THE HOUSE IS<br><span>HIRING.</span></h2>
      <p class="endgame-body">
        You documented ${run.evidence.total} violations and won a verdict that changed nothing.
        The House was watching. The House is impressed. There is an opening.
      </p>
      <p class="endgame-role">POSITION: REFEREE. COMPENSATION: THE ABILITY TO WIN.</p>
      <div class="endgame-actions">
        <button class="tribunal-btn" data-act="accept">ACCEPT THE POSITION</button>
        <button class="tribunal-btn secondary" data-act="decline">DECLINE. KEEP MY RECORD.</button>
      </div>
    </div>
  `;

  root.querySelector('.endgame h2').setAttribute('tabindex', '-1');
  root.querySelector('.endgame h2').focus();
  root.querySelector('[data-act="accept"]').addEventListener('click', () => runGhostMatch(run, root, onGhostDone));
  root.querySelector('[data-act="decline"]').addEventListener('click', () => declineEnding(run, root, onSeason));
}

function declineEnding(run, root, onSeason) {
  sfx('chime');
  root.innerHTML = `
    <div class="endgame clean-ending">
      <p class="label">RESIGNATION ACCEPTED</p>
      <h2>YOU KEEP<br>YOUR RECORD.</h2>
      <p class="endgame-body">0 – 0. Not a single win. Not a single one taken from you that you didn’t get on paper. The House will remember you as “difficult”.</p>
      <button class="tribunal-btn" data-act="season">START ANOTHER SEASON</button>
    </div>
    <div class="confetti" aria-hidden="true"></div>
  `;
  spawnConfetti(root.querySelector('.confetti'));
  root.querySelector('[data-act="season"]').addEventListener('click', () => { root.hidden = true; onSeason(); });
}

function runGhostMatch(run, root, onGhostDone) {
  sfx('gavel');
  let step = 0;
  const board = Array(9).fill(null);

  const render = () => {
    const sc = GHOST_SCRIPT[step];
    root.innerHTML = `
      <div class="endgame ghost">
        <p class="label">TRAINING MATCH · YOU ARE O · THE HOUSE IS WATCHING</p>
        <div class="ghost-grid">${board.map((m, i) =>
          `<div class="ghost-cell ${m ? m.toLowerCase() : ''}">${m === 'X' ? '×' : m === 'O' ? '○' : ''}</div>`).join('')}</div>
        <p class="ghost-status" aria-live="polite">${sc ? sc.patron : ''}</p>
        <div class="endgame-actions">
          ${sc && sc.line
            ? `<button class="tribunal-btn" data-act="overrule">RULE IT OFFSIDE</button>`
            : sc
              ? `<button class="tribunal-btn" data-act="place">PLACE YOUR O &amp; MOVE ON</button>`
              : ''}
        </div>
      </div>
    `;
    root.querySelector('[data-act="place"]')?.addEventListener('click', () => {
      board[sc.cell] = 'X';
      const empty = board.map((m, i) => (m ? null : i)).filter(i => i != null);
      board[empty[Math.floor(Math.random() * empty.length)]] = 'O';
      step += 1;
      sfx('stamp');
      render();
    });
    root.querySelector('[data-act="overrule"]')?.addEventListener('click', () => {
      board[sc.cell] = null;
      sfx('whistle');
      finish();
    });
  };

  const finish = () => {
    root.innerHTML = `
      <div class="endgame ghost-done">
        <p class="label">PROBATION COMPLETE</p>
        <h2>THE PATRON<br><span>DID NOT WIN.</span></h2>
        <p class="endgame-body">
          It was easy. That was the disturbing part. Your name has been added to the
          masthead. You are, effective immediately, part of the House.
        </p>
        <button class="tribunal-btn" data-act="season">BEGIN YOUR FIRST SEASON AS THE HOUSE</button>
      </div>
    `;
    document.getElementById('rights-word').textContent = 'RESERVED';
    root.querySelector('[data-act="season"]').addEventListener('click', () => { root.hidden = true; onGhostDone(); });
  };

  render();
}

function spawnConfetti(host) {
  if (!host || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 40; i++) {
    const x = document.createElement('span');
    x.textContent = '×';
    x.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 1.2}s;animation-duration:${1.8 + Math.random() * 1.6}s`;
    host.append(x);
  }
  setTimeout(() => host.replaceChildren(), 4000);
}
