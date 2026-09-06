import {
  generatePuzzle,
  parseCode,
  puzzleCode,
  type Mode,
  type Puzzle,
  type Size,
} from './sudoku.ts';
export type Snapshot = { values: number[]; notes: number[][] };
export type Player = Snapshot & { history: Snapshot[]; hints: number };
export type Session = {
  version: 1;
  id: string;
  puzzle: Puzzle;
  mode: Mode;
  players: Player[];
  elapsed: number;
  started: boolean;
  paused: boolean;
};
export function newPlayer(p: Puzzle): Player {
  return {
    values: [...p.givens],
    notes: p.givens.map(() => []),
    history: [],
    hints: 0,
  };
}
export function newSession(
  size: Size,
  level: number,
  seed: number,
  mode: Mode = 'solo',
): Session {
  const puzzle = generatePuzzle(size, level, seed);
  return {
    version: 1,
    id: `${puzzleCode(puzzle)}-${mode}`,
    puzzle,
    mode,
    players: Array.from({ length: mode === 'versus' ? 2 : 1 }, () =>
      newPlayer(puzzle),
    ),
    elapsed: 0,
    started: false,
    paused: false,
  };
}
export const isComplete = (p: Player, puzzle: Puzzle) =>
  p.values.every((v, i) => v === puzzle.solution[i]);
export function move(
  player: Player,
  puzzle: Puzzle,
  index: number,
  value: number,
  noteMode = false,
): Player {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= puzzle.givens.length ||
    puzzle.givens[index] ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > puzzle.size
  )
    return player;
  if (
    (!noteMode || !value) &&
    player.values[index] === value &&
    (!player.notes[index].length || value !== 0)
  )
    return player;
  const values = [...player.values],
    notes = player.notes.map((n) => [...n]);
  if (noteMode && value) {
    if (values[index]) return player;
    notes[index] = notes[index].includes(value)
      ? notes[index].filter((n) => n !== value)
      : [...notes[index], value].sort((a, b) => a - b);
  } else {
    values[index] = value;
    notes[index] = [];
  }
  return {
    ...player,
    values,
    notes,
    history: [
      ...player.history,
      { values: player.values, notes: player.notes },
    ].slice(-80),
  };
}
export function undo(player: Player): Player {
  const prev = player.history.at(-1);
  return prev
    ? { ...player, ...prev, history: player.history.slice(0, -1) }
    : player;
}
export function restoreSession(raw: string): Session | null {
  try {
    if (raw.length > 1_000_000) return null;
    const data = JSON.parse(raw);
    if (
      data?.version !== 1 ||
      !['solo', 'daily', 'versus', 'classroom'].includes(data.mode) ||
      typeof data.id !== 'string' ||
      typeof data.started !== 'boolean' ||
      typeof data.paused !== 'boolean' ||
      !Number.isInteger(data.elapsed) ||
      data.elapsed < 0 ||
      data.elapsed > 31536000
    )
      return null;
    const spec = parseCode(puzzleCode(data.puzzle));
    if (!spec) return null;
    const puzzle = generatePuzzle(spec.size, spec.level, spec.seed),
      length = spec.size ** 2;
    const validSnapshot = (p: Snapshot) =>
      p &&
      Array.isArray(p.values) &&
      p.values.length === length &&
      p.values.every(
        (v, i) =>
          Number.isInteger(v) &&
          v >= 0 &&
          v <= spec.size &&
          (!puzzle.givens[i] || v === puzzle.givens[i]),
      ) &&
      Array.isArray(p.notes) &&
      p.notes.length === length &&
      p.notes.every(
        (n) =>
          Array.isArray(n) &&
          n.length <= spec.size &&
          n.every((v) => Number.isInteger(v) && v > 0 && v <= spec.size),
      );
    if (
      !Array.isArray(data.players) ||
      data.players.length !== (data.mode === 'versus' ? 2 : 1) ||
      !data.players.every(
        (p: Player) =>
          validSnapshot(p) &&
          Number.isInteger(p.hints) &&
          p.hints >= 0 &&
          Array.isArray(p.history) &&
          p.history.length <= 80 &&
          p.history.every(validSnapshot),
      )
    )
      return null;
    return { ...data, puzzle, paused: data.started };
  } catch {
    return null;
  }
}
export type Stats = {
  completed: string[];
  stars: number;
  lastDay: string;
  streak: number;
  best: number | null;
};
export const emptyStats: Stats = {
  completed: [],
  stars: 0,
  lastDay: '',
  streak: 0,
  best: null,
};
export function restoreStats(raw: string | null): Stats {
  try {
    const d = JSON.parse(raw || 'null');
    if (
      d &&
      Array.isArray(d.completed) &&
      d.completed.length <= 2000 &&
      d.completed.every((s: unknown) => typeof s === 'string') &&
      Number.isInteger(d.stars) &&
      d.stars >= 0 &&
      typeof d.lastDay === 'string' &&
      Number.isInteger(d.streak) &&
      d.streak >= 0 &&
      (d.best === null || (Number.isInteger(d.best) && d.best >= 0))
    )
      return d;
  } catch {
    /* Invalid device data starts fresh. */
  }
  return { ...emptyStats };
}
export function recordWin(
  stats: Stats,
  puzzle: Puzzle,
  hints: number,
  elapsed: number,
  day: string,
): Stats {
  const code = puzzleCode(puzzle);
  if (stats.completed.includes(code)) return stats;
  const yesterday = new Date(`${day}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return {
    completed: [...stats.completed, code].slice(-2000),
    stars: stats.stars + (hints === 0 ? 3 : hints <= 2 ? 2 : 1),
    lastDay: day,
    streak:
      stats.lastDay === day
        ? stats.streak
        : stats.lastDay === yesterday.toISOString().slice(0, 10)
          ? stats.streak + 1
          : 1,
    best: stats.best === null ? elapsed : Math.min(stats.best, elapsed),
  };
}
