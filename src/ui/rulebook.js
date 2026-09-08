// "HOUSE RULES, 4th edition." The full statute list the Referee Cam cites from —
// a modal you can open any time. It is the joke stated plainly: a rulebook that
// exists entirely to justify the House.

const STATUTES = [
  ['§2.4', 'PROMOTIONAL PLAY', 'The first move of any House turn is promotional and is not counted against the House. Subsequent moves are also not counted, as a courtesy.'],
  ['§3.2', 'CONDEMNATION', 'The House may condemn any square for structural, cosmetic, or competitive reasons. Condemned squares remain the property of the House.'],
  ['§4.0', 'MARK VALIDITY', 'A patron mark is valid until the House becomes aware of it.'],
  ['§4.1', 'SEATING', 'Where the House requires a square, the square is vacated. The previous occupant is thanked for their patronage.'],
  ['§5.1', 'RECLASSIFICATION', 'The House may reclassify a patron mark as a House mark upon determining that it was always a House mark.'],
  ['§7(b)', 'LINE INTEGRITY', 'Three patron marks in a row constitutes a line only if the House agrees that it does. The House does not.'],
  ['§7(c)', 'RESIDUAL LINE', 'Any line surviving §7(b) is removed under §7(c). Any line surviving §7(c) does not exist.'],
  ['§8', 'APPEALS', 'Appeals are processed for a fee. The fee is one point, payable to the House, win or lose. Chiefly lose.'],
  ['§9.0', 'NON-TERMINATION', 'A game may not end in a draw. A draw is a loss the House has not yet been awarded.'],
  ['§11', 'REGULATORY CAPTURE', 'The referee, the appeals office, the incident report, and the gallery are wholly-owned subsidiaries of the House. This is disclosed here and nowhere else.'],
];

export function openRulebook() {
  const host = document.getElementById('modal-root');
  host.innerHTML = `
    <div class="modal-backdrop" data-close>
      <div class="modal" role="dialog" aria-modal="true" aria-label="House Rules">
        <div class="modal-head">
          <p class="label">HOUSE RULES · 4TH EDITION</p>
          <button class="modal-close" data-close aria-label="Close">×</button>
        </div>
        <p class="modal-intro">The complete statutes under which the referee operates. The referee wrote them. The referee is the House.</p>
        <dl class="statutes">
          ${STATUTES.map(([n, t, body]) => `<div><dt>${n} — ${t}</dt><dd>${body}</dd></div>`).join('')}
        </dl>
        <p class="modal-foot">This edition supersedes all previous editions, all future editions, and any edition you believe you remember.</p>
      </div>
    </div>
  `;
  const close = () => host.replaceChildren();
  host.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', e => {
    if (e.target === el) close();
  }));
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  host.querySelector('.modal-close').focus();
}
