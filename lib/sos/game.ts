export const SIDE = 5;
export type Mark = 'S' | 'O';
export type Player = 0 | 1;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MatchMode = 'local' | 'ai';
export type Target = 3 | 5 | 10;
export type Move = { index: number; mark: Mark };
export type LastMove = Move & { player: Player; points: number; lines: number[][] };
export type Round = {
  board: (Mark | null)[];
  scores: [number, number];
  turn: Player;
  lastMove: LastMove | null;
  finished: boolean;
  winner: Player | null;
};
export type Match = {
  mode: MatchMode;
  difficulty: Difficulty;
  target: Target;
  wins: [number, number];
  roundNumber: number;
  round: Round;
  champion: Player | null;
};

export function newRound(first: Player = 0): Round {
  return {
    board: Array(SIDE * SIDE).fill(null),
    scores: [0, 0],
    turn: first,
    lastMove: null,
    finished: false,
    winner: null,
  };
}

export function newMatch(
  mode: MatchMode,
  difficulty: Difficulty,
  target: Target,
): Match {
  return {
    mode,
    difficulty,
    target,
    wins: [0, 0],
    roundNumber: 1,
    round: newRound(),
    champion: null,
  };
}

const directions = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function linesAt(board: (Mark | null)[], index: number): number[][] {
  const row = Math.floor(index / SIDE);
  const col = index % SIDE;
  const lines: number[][] = [];
  for (const [dr, dc] of directions) {
    for (let position = 0; position < 3; position++) {
      const startRow = row - position * dr;
      const startCol = col - position * dc;
      const endRow = startRow + 2 * dr;
      const endCol = startCol + 2 * dc;
      if (
        Math.min(startRow, endRow) < 0 ||
        Math.max(startRow, endRow) >= SIDE ||
        Math.min(startCol, endCol) < 0 ||
        Math.max(startCol, endCol) >= SIDE
      ) continue;
      const cells = [0, 1, 2].map(
        (offset) => (startRow + offset * dr) * SIDE + startCol + offset * dc,
      );
      if (board[cells[0]] === 'S' && board[cells[1]] === 'O' && board[cells[2]] === 'S')
        lines.push(cells);
    }
  }
  return lines;
}

export function place(round: Round, move: Move): Round {
  if (
    round.finished ||
    !Number.isInteger(move.index) ||
    move.index < 0 ||
    move.index >= SIDE * SIDE ||
    round.board[move.index] !== null ||
    (move.mark !== 'S' && move.mark !== 'O')
  ) return round;
  const board = [...round.board];
  board[move.index] = move.mark;
  const lines = linesAt(board, move.index);
  const scores: [number, number] = [...round.scores];
  scores[round.turn] += lines.length;
  const finished = board.every(Boolean);
  const winner = finished
    ? scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1
    : null;
  return {
    board,
    scores,
    turn: lines.length ? round.turn : round.turn === 0 ? 1 : 0,
    lastMove: { ...move, player: round.turn, points: lines.length, lines },
    finished,
    winner,
  };
}

export function play(match: Match, move: Move): Match {
  if (match.champion !== null) return match;
  const round = place(match.round, move);
  if (round === match.round) return match;
  const wins: [number, number] = [...match.wins];
  if (round.finished && round.winner !== null) wins[round.winner] += 1;
  return {
    ...match,
    round,
    wins,
    champion: wins[0] >= match.target ? 0 : wins[1] >= match.target ? 1 : null,
  };
}

export function nextRound(match: Match): Match {
  if (!match.round.finished || match.champion !== null) return match;
  const roundNumber = match.roundNumber + 1;
  return {
    ...match,
    roundNumber,
    round: newRound(roundNumber % 2 === 0 ? 1 : 0),
  };
}

function moves(round: Round): Move[] {
  return round.board.flatMap((mark, index) =>
    mark === null ? [{ index, mark: 'S' as const }, { index, mark: 'O' as const }] : [],
  );
}

function evaluate(round: Round, ai: Player): number {
  const other: Player = ai === 0 ? 1 : 0;
  return (round.scores[ai] - round.scores[other]) * 10 +
    (round.finished && round.winner === ai ? 8 : 0) -
    (round.finished && round.winner === other ? 8 : 0);
}

function search(round: Round, ai: Player, depth: number): number {
  if (depth === 0 || round.finished) return evaluate(round, ai);
  const maximizing = round.turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  // Scoring moves matter most; cap branches so classroom boards remain responsive.
  const candidates = moves(round)
    .map((move) => ({ move, result: place(round, move) }))
    .sort((a, b) => b.result.lastMove!.points - a.result.lastMove!.points)
    .slice(0, 10);
  for (const { result } of candidates) {
    const value = search(result, ai, depth - 1);
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

export function chooseAiMove(
  round: Round,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Move | null {
  const available = moves(round);
  if (round.finished || !available.length) return null;
  if (difficulty === 'easy')
    return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  const ai = round.turn;
  let best = -Infinity;
  let selected: Move[] = [];
  for (const move of available) {
    const result = place(round, move);
    const gained = result.lastMove!.points;
    const value = difficulty === 'medium'
      ? gained * 20 + (result.finished ? evaluate(result, ai) : 0)
      : search(result, ai, 2) + gained * 2;
    if (value > best) {
      best = value;
      selected = [move];
    } else if (value === best) selected.push(move);
  }
  return selected[Math.min(selected.length - 1, Math.floor(random() * selected.length))];
}
