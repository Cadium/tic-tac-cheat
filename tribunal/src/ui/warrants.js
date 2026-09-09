// The warrant counter: one pip per warrant the House started with, struck
// through as each is spent on a compelled condemnation.

let node;
let total = 0;
let reduced = false;

export function mountWarrants(el, budget) {
  node = el;
  total = budget;
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  node.replaceChildren();
  for (let i = 0; i < total; i += 1) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    pip.dataset.pip = String(i);
    node.append(pip);
  }
  render(total);
}

/** @param {number} left  warrants the House still has */
export function render(left) {
  const spent = total - left;
  node.querySelectorAll('.pip').forEach((pip, i) => {
    pip.classList.toggle('spent', i < spent);
  });
  node.setAttribute('aria-label', `${left} of ${total} warrants on file`);
}

/** Strike the pip that was just spent, with a one-shot flourish. */
export function strike(left) {
  render(left);
  const pip = node.querySelector(`.pip[data-pip="${total - left - 1}"]`);
  if (!pip || reduced) return;
  pip.classList.remove('striking');
  void pip.offsetWidth;
  pip.classList.add('striking');
  const done = () => pip.classList.remove('striking');
  pip.addEventListener('animationend', done, { once: true });
  setTimeout(done, 900);
}
