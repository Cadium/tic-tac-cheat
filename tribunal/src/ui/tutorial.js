// First-run orientation: four steps that teach the one idea the board hides —
// you don't win by completing a line, you win by making the House spend every
// warrant and then forcing it once more. Step one waits for the player to force
// a condemnation; the rest are read-and-continue. Shown once, then never again.

const KEY = 'tribunal:tutorial-done';

const STEPS = [
  {
    body:
      "You can't win the board — the House always finishes its four. So don't race it. "
      + 'Make a threat instead: line up three in a row, or set two threats at once. Try it now.',
    button: null, // gated on the player actually forcing a condemnation
  },
  {
    body:
      'There it is. You forced the House and it had no legal reply, so it condemned the '
      + 'square you needed — and spent a warrant to do it.',
    button: 'NEXT',
  },
  {
    body: 'It started this hearing with four warrants. One is already gone. Watch the counter.',
    button: 'NEXT',
  },
  {
    body:
      'Empty all four. Then force its hand one more time — with nothing left to spend, '
      + 'the House forfeits, and you win.',
    button: 'GOT IT',
  },
];

let els;
let onDone;
let step = -1;
let active = false;

export function tutorialPending() {
  try { return localStorage.getItem(KEY) !== '1'; } catch { return false; }
}

export function mountTutorial(root, done) {
  els = {
    root,
    body: root.querySelector('#coach-body'),
    next: root.querySelector('#coach-next'),
    skip: root.querySelector('#coach-skip'),
  };
  onDone = done;
  els.next.addEventListener('click', advance);
  els.skip.addEventListener('click', finish);
}

export function beginTutorial() {
  if (!active && !tutorialPending()) return;
  active = true;
  step = 0;
  render();
}

/** main() calls this once the first compelled condemnation has resolved. */
export function tutorialAfterCondemn() {
  if (active && step === 0) { step = 1; render(); }
}

/** main() calls this if the match ends while the tutorial is still up. */
export function tutorialMatchEnded() {
  if (active) finish();
}

export const tutorialActive = () => active;

function advance() {
  if (step >= STEPS.length - 1) { finish(); return; }
  step += 1;
  render();
}

function render() {
  const s = STEPS[step];
  els.body.textContent = s.body;
  els.next.hidden = s.button == null;
  els.next.textContent = s.button ?? 'NEXT';
  els.root.classList.toggle('awaiting', s.button == null);
  document.getElementById('warrants')?.classList.toggle('coach-focus', step === 2);
  els.root.hidden = false;
  // steps that ask the reader to continue take focus so keyboard users can;
  // the gated first step leaves focus on the board so they can play.
  if (s.button != null) els.next.focus();
}

function finish() {
  active = false;
  els.root.hidden = true;
  document.getElementById('warrants')?.classList.remove('coach-focus');
  try { localStorage.setItem(KEY, '1'); } catch { /* private mode — just don't persist */ }
  onDone?.();
}
