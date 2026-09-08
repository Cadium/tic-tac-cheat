// The House's connective patter — the status line between the referee's own
// pronouncements. Deadpan bureaucrat throughout; the composure band decides how
// thin the veneer is.

import { pick } from '../engine/board.js';

const LINES = {
  yourMove: {
    smug: ['Your move, hotshot.', 'Take your time. The outcome is the same.', 'Whenever you’re ready.'],
    annoyed: ['Your move. Do try something new.', 'Go on, then.', 'Your move. I’m watching this one.'],
    sweating: ['Your move. No funny business.', 'Play. Please.', 'Your move. Let’s keep this civil.'],
    unhinged: ['MOVE.', 'Just pick a square. Any square. It won’t matter.', 'Your move. I have lawyers.'],
    unravelling: ['do whatever you want', 'the board is a suggestion at this point', 'your move. or don’t. i’ve stopped keeping score honestly'],
  },
  thinking: {
    smug: ['Let me think…', 'Consulting the rulebook.', 'One moment. Due diligence.'],
    annoyed: ['Reviewing the tape.', 'Checking something.', 'Give me a second.'],
    sweating: ['Hold on.', 'Let me just… hold on.', 'Consulting the other rulebook.'],
    unhinged: ['Rewriting the rulebook.', 'Amending the constitution.', 'Calling an emergency session.'],
    unravelling: ['…', 'improvising', 'don’t look at the board right now'],
  },
  won: {
    clean: ['A perfectly ordinary victory. Suspicious.', 'A clean win. For once you can’t prove anything.'],
    dirty: [
      'A triumph of talent. And editing.',
      'I would like to thank the referee. Me.',
      'A fair result, according to me.',
      'The House wins. This has been reviewed and upheld by the House.',
    ],
  },
  nearMiss: {
    smug: ['Three in a row? Let’s have a closer look at that.', 'Cute. Under review.'],
    annoyed: ['No. Not today.', 'I saw that. Everyone saw that. It still doesn’t count.'],
    sweating: ['That’s— no. There’s a rule. There’s definitely a rule.', 'Flag on the play. I’m the flag.'],
    unhinged: ['ABSOLUTELY NOT.', 'That line has been declared non-existent, retroactively, forever.'],
    unravelling: ['you were never here. that X was never here. i was never here.'],
  },
  appeal: {
    smug: 'Appeal denied. A processing fee of one point was awarded to the House.',
    annoyed: 'Appeal denied. The fee has been increased for wasting the House’s time.',
    sweating: 'Appeal denied. Further appeals may be considered harassment of the House.',
    unhinged: 'Appeal denied. The appeals office is now a broom cupboard. The point is still ours.',
    unravelling: 'appeal received. shredded. point taken. we good?',
  },
};

const bandKey = band => (LINES.yourMove[band] ? band : 'smug');

export const houseVoice = {
  yourMove: (band, turn) =>
    turn <= 1 ? 'Your move, hotshot.' : rand(LINES.yourMove[bandKey(band)]),
  thinking: band => rand(LINES.thinking[bandKey(band)]),
  won: (band, dirty) => rand(dirty ? LINES.won.dirty : LINES.won.clean),
  nearMiss: band => rand(LINES.nearMiss[bandKey(band)]),
  appeal: band => LINES.appeal[bandKey(band)],
};

function rand(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// re-exported so tests / callers can supply a seeded rng if they want determinism
export const voiceWith = rng => ({
  yourMove: (band, turn) => (turn <= 1 ? 'Your move, hotshot.' : pick(rng, LINES.yourMove[bandKey(band)])),
  thinking: band => pick(rng, LINES.thinking[bandKey(band)]),
  won: (band, dirty) => pick(rng, dirty ? LINES.won.dirty : LINES.won.clean),
  nearMiss: band => pick(rng, LINES.nearMiss[bandKey(band)]),
  appeal: band => LINES.appeal[bandKey(band)],
});
