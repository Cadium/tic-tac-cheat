// THE PEOPLE v. THE HOUSE. The board game you cannot win becomes a case you
// can. You present your exhibits; the House's defence is nonsense; the judge
// (also the House) overrules you every time; the House is found guilty anyway
// and nothing changes — except you get a card to share.

import { EXHIBIT_CLASSES } from '../engine/evidence.js';
import { drawVerdictCard, shareOrDownload } from './verdictCard.js';
import { sfx } from './sound.js';

const JUDGE = [
  'Objection noted. Objection overruled. Objection filed under "noted".',
  'The witness for the defence is the House. The House finds the House credible.',
  'Struck from the record. The record has also been struck.',
  'The court reminds the prosecution that the court is leased from the defendant.',
  'Sustained. Then, on reflection, overruled. The House prefers overruled.',
  'The exhibit is admitted, admired, and disregarded.',
];

const SENTENCE_FLAVOUR = {
  furious: 'The gallery is in uproar. The House has noted every face for follow-up.',
  restless: 'There is murmuring. The House has increased the price of murmuring.',
  quiet: 'The gallery is silent. The House takes this as applause.',
};

export function openTribunal(run, { onContinue }) {
  const root = document.getElementById('screen-tribunal');
  document.getElementById('screen-match').hidden = true;
  root.hidden = false;
  sfx('gavel');

  const exhibits = Object.values(EXHIBIT_CLASSES)
    .map(cls => ({ cls, e: run.evidence.exhibits[cls.id] }))
    .filter(x => x.e && x.e.count > 0);

  const caseNo = `${String(run.season).padStart(2, '0')}-${String(run.losses).padStart(3, '0')}`;
  let presented = 0;
  let opinion = 0;

  root.innerHTML = `
    <div class="tribunal">
      <header class="tribunal-head">
        <p class="label">IN THE COURT OF THE HOUSE</p>
        <h2>THE PEOPLE<br><span>v.</span> THE HOUSE</h2>
        <p class="tribunal-case">CASE #${caseNo} · ${run.evidence.total} logged violations · ${exhibits.length} exhibit classes</p>
      </header>

      <div class="tribunal-body">
        <section class="docket" aria-label="Exhibits">
          <p class="label">THE PROSECUTION</p>
          <ol class="exhibit-docket"></ol>
        </section>
        <section class="opinion" aria-label="Public opinion">
          <p class="label">PUBLIC OPINION</p>
          <div class="opinion-track"><div class="opinion-fill"></div></div>
          <p class="opinion-note" aria-live="polite">The gallery is seated. It does not expect much.</p>
          <p class="judge-line" aria-live="polite"></p>
        </section>
      </div>

      <div class="tribunal-actions">
        <button class="tribunal-btn" data-act="present">PRESENT EXHIBIT ${exhibits.length ? 'A' : ''}</button>
        <button class="tribunal-btn secondary" data-act="skip">SKIP TO VERDICT</button>
      </div>

      <div class="verdict" hidden></div>
    </div>
  `;

  const docket = root.querySelector('.exhibit-docket');
  const fill = root.querySelector('.opinion-fill');
  const note = root.querySelector('.opinion-note');
  const judgeLine = root.querySelector('.judge-line');
  const actions = root.querySelector('.tribunal-actions');
  const presentBtn = root.querySelector('[data-act="present"]');

  function present() {
    if (presented >= exhibits.length) return deliverVerdict();
    const { cls, e } = exhibits[presented];
    const weight = e.count * (e.corroborated ? 2 : 1);
    opinion = Math.min(100, opinion + weight * 6 + 4);

    const li = document.createElement('li');
    li.className = 'exhibit-entry';
    li.innerHTML = `
      <div class="exhibit-charge">
        <span class="ex-letter">EXHIBIT ${cls.letter}</span>
        <span class="ex-count">${e.count} count${e.count === 1 ? '' : 's'}${e.corroborated ? ' · CORROBORATED' : ''}</span>
      </div>
      <p class="exhibit-claim">${cls.label}.</p>
      <p class="exhibit-quote">The record reads: “${e.first}”</p>
      <p class="exhibit-defence"><span>THE HOUSE:</span> ${cls.defense}</p>
    `;
    docket.append(li);
    li.scrollIntoView({ block: 'nearest' });

    fill.style.width = opinion + '%';
    note.textContent = opinion >= 70 ? SENTENCE_FLAVOUR.furious
      : opinion >= 35 ? SENTENCE_FLAVOUR.restless
      : SENTENCE_FLAVOUR.quiet;
    judgeLine.textContent = 'THE JUDGE (also the House): ' + JUDGE[presented % JUDGE.length];
    sfx('stamp');

    presented += 1;
    if (presented >= exhibits.length) {
      presentBtn.textContent = 'DELIVER VERDICT';
      presentBtn.dataset.act = 'verdict';
    } else {
      presentBtn.textContent = `PRESENT EXHIBIT ${exhibits[presented].cls.letter}`;
    }
  }

  function deliverVerdict() {
    const counts = run.chargeCount;
    const top = exhibits.slice().sort((a, b) =>
      (b.e.count * (b.e.corroborated ? 2 : 1)) - (a.e.count * (a.e.corroborated ? 2 : 1)))[0];

    run.flags.wonTribunal = true;
    actions.hidden = true;
    const verdict = root.querySelector('.verdict');
    verdict.hidden = false;
    verdict.innerHTML = `
      <p class="label">THE VERDICT</p>
      <h3>THE HOUSE — <span>GUILTY</span></h3>
      <p class="verdict-counts">on ${counts} count${counts === 1 ? '' : 's'} of rigging a game of tic-tac-toe.</p>
      <div class="verdict-sentence">
        <p class="label">SENTENCE</p>
        <p>The House is fined ${counts} point${counts === 1 ? '' : 's'}, payable to the House. Your record stands at <strong>0&nbsp;–&nbsp;0&nbsp;–&nbsp;${run.losses}</strong>. ${opinion >= 70 ? SENTENCE_FLAVOUR.furious : opinion >= 35 ? SENTENCE_FLAVOUR.restless : SENTENCE_FLAVOUR.quiet} Court is adjourned to the next match.</p>
      </div>
      <div class="verdict-card-slot">
        <canvas class="verdict-card" aria-label="Shareable verdict card"></canvas>
        <div class="verdict-card-actions">
          <button class="tribunal-btn" data-act="share">DOWNLOAD / SHARE THE VERDICT</button>
        </div>
      </div>
      <button class="tribunal-btn secondary" data-act="continue">LEAVE COURT</button>
    `;
    sfx('gavel');

    const canvas = verdict.querySelector('.verdict-card');
    const cardData = {
      caseNo,
      counts,
      losses: run.losses,
      houseTotal: run.houseScore,
      topExhibit: { letter: top.cls.letter, quote: top.e.first },
      url: location.host + location.pathname,
    };
    // fonts may still be loading the first time — draw, then redraw on ready
    drawVerdictCard(canvas, cardData);
    document.fonts?.ready?.then(() => drawVerdictCard(canvas, cardData));

    verdict.querySelector('[data-act="share"]').addEventListener('click', async e => {
      e.target.disabled = true;
      const outcome = await shareOrDownload(canvas, `the-house-guilty-${caseNo}.png`);
      e.target.textContent = outcome === 'shared' ? 'SHARED' : 'SAVED';
      setTimeout(() => { e.target.disabled = false; e.target.textContent = 'DOWNLOAD / SHARE THE VERDICT'; }, 2500);
    });
    verdict.querySelector('[data-act="continue"]').addEventListener('click', () => {
      root.hidden = true;
      onContinue({ counts, opinion });
    });
  }

  actions.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'present' || act === 'verdict') present();
    else if (act === 'skip') { while (presented < exhibits.length) present(); }
  });

  if (!exhibits.length) deliverVerdict();
}
