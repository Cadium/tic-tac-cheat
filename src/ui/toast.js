// The bottom-right toast. One at a time; auto-dismiss.

let el;
let timer;

export function mountToast(node) {
  el = node;
}

export function showToast(message, ms = 2800) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms);
}

export function hideToast() {
  clearTimeout(timer);
  el?.classList.remove('show');
}
