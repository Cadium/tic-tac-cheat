// The HOUSE COMPOSURE bar. It drains as you rattle the House. The fill is red —
// it is the House's, and less of it is better for you.

let root;
let lastBand = null;

export function mountComposureMeter(el) {
  root = el;
  root.hidden = false;
  root.className = 'composure';
  root.innerHTML = `
    <div class="composure-head">
      <p class="label">HOUSE COMPOSURE</p>
      <span class="composure-band" aria-live="polite">SMUG</span>
    </div>
    <div class="composure-track"><div class="composure-fill"></div></div>
  `;
}

export function renderComposure(composure) {
  if (!root) return;
  const band = composure.band();
  const v = composure.value;
  root.querySelector('.composure-fill').style.width = v + '%';
  root.dataset.band = band.id;
  const bandEl = root.querySelector('.composure-band');
  bandEl.textContent = `${band.word} · ${v}`;
  if (band.id !== lastBand) {
    lastBand = band.id;
    root.classList.remove('pulse');
    void root.offsetWidth;
    root.classList.add('pulse');
  }
}
