export const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const winner = (board, mark) => lines.find(line => line.every(i => board[i] === mark));
const squares = (board, mark) => board.flatMap((value, i) => value === mark ? [i] : []);

// Every response adds an O and never removes one. Seven Os force a winning
// line; even repeated erasures cannot produce an endless game.
export function strategyCycle(random = Math.random) {
  return random() < .5 ? ['erase', 'double'] : ['double', 'erase'];
}
export function planTurn(input, turn, previous = '', random = Math.random, strategy) {
  const board = [...input], steps = [];
  const pick = values => values[Math.min(values.length - 1, Math.floor(random() * values.length))];
  const step = (changes, message = '', delay = 550) => {
    for (const [i, mark] of changes) board[i] = mark;
    steps.push({ board: [...board], changed: changes.map(([i]) => i), message, delay });
  };
  const erase = (i, message) => step([[i, null]], message);
  const place = () => {
    let empty = squares(board, null);
    if (!empty.length) {
      erase(pick(squares(board, 'X')), 'We need this seat.');
      empty = squares(board, null);
    }
    const wins = empty.filter(i => { const b = [...board]; b[i] = 'O'; return winner(b, 'O'); });
    step([[pick(wins.length ? wins : empty), 'O']]);
  };

  // The opening is always exactly one ordinary move, without a violation.
  if (turn === 1) { place(); return { steps, board, kind: 'legal' }; }

  const kind = strategy ?? pick(['double', 'erase'].filter(k => k !== previous));
  const playerLine = winner(board, 'X');
  if (playerLine) {
    // The referee intervenes immediately, including on a double-line win.
    const allWins = lines.filter(line => line.every(i => board[i] === 'X'));
    const shared = playerLine.filter(i => allWins.every(line => line.includes(i)));
    const target = pick(shared.length ? shared : playerLine);
    erase(target, 'Three in a row? One of those Xs was offside.');
  } else if (kind === 'erase') {
    const target = pick(squares(board, 'X'));
    if (target !== undefined) {
      erase(target, pick(['Your X has expired.', 'That square was never included in the free plan.', 'A little housekeeping.']));
    }
  }
  while (winner(board, 'X')) erase(pick(winner(board, 'X')), 'And that one. The referee is very thorough.');
  place();
  if (kind === 'double' && !winner(board, 'O')) {
    steps.push({ board: [...board], changed: [], message: '', cue: 'Your turn.', delay: 850 });
    const start = steps.length;
    place();
    steps[start].message = pick(['Actually, one more thing.', 'That was a practice move. This one counts.', 'Buy one, get one free.']);
  }
  // Never hand back a full board as a draw.
  if (!winner(board, 'O') && !board.includes(null)) erase(pick(squares(board, 'X')), 'A draw? We have reopened your application.');
  return { steps, board, kind };
}
