// The warrant counter: one pip per warrant the House started with, struck
// through as each is spent on a compelled condemnation.

let node;
let total = 0;

export function mountWarrants(el, budget) {
  node = el;
  total = budget;
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
