/**
 * Eyvan — 9x9 tahtada kale yarışı.
 *
 * Kurallar (Zet Zeka'nın Eyvan oyunundan uyarlanmıştır):
 * - Her oyuncunun bir kalesi (piyonu) vardır; kaleler tahtanın ortasındaki iki
 *   ok karesinden başlar ve rakibin tarafındaki iki köşe kalesinden BİRİNE
 *   ulaşan oyunu kazanır.
 * - Sıra gelince tek hamle: kaleyi bir kare yatay/dikey oynat VEYA bir sur
 *   yerleştir. Çapraz hamle yok, surdan atlamak yok.
 * - Surun iki boyu var: uzun sur iki birim, kısa sur bir birim kapatır.
 *   Konan sur kaldırılmaz (top karesi hariç).
 * - Surlar tahtayı ikiye bölemez: her iki oyuncunun da en az bir hedefe yolu
 *   açık kalmalı.
 * - Kale dar bir koridorda rakiple karşı karşıya kalıp başka hamlesi yoksa
 *   rakibin üzerinden atlar.
 * - At karesi: iki adım (tek seferlik). Top karesi: sahadaki ya da rakibin
 *   elindeki bir suru dışarı atma (tek seferlik).
 */

export const SIDE = 9;
export const CELL_COUNT = SIDE * SIDE;
export const V_COUNT = SIDE * (SIDE - 1);
export const H_COUNT = (SIDE - 1) * SIDE;

/** Kalelerin başlangıç kareleri: (3,4) ve (5,4) — ortadaki iki ok. */
export const START_CELLS: [number, number] = [3 * SIDE + 4, 5 * SIDE + 4];

/** Hedef köşeler: 0. oyuncu alt köşeler, 1. oyuncu üst köşeler. */
export const GOAL_CELLS: [number[], number[]] = [
  [8 * SIDE + 0, 8 * SIDE + 8],
  [0, 8],
];

/** At kareleri: (1,6) ve (7,2). Top kareleri: (1,2) ve (7,6). */
export const KNIGHT_CELLS = [1 * SIDE + 6, 7 * SIDE + 2];
export const CANNON_CELLS = [1 * SIDE + 2, 7 * SIDE + 6];

export const START_BIG = 9;
export const START_SMALL = 3;

export type Player = 0 | 1;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MatchMode = 'local' | 'ai';
export type WallOrient = 'v' | 'h';
export type Phase = 'move' | 'knight' | 'cannon';
export type Wall = { orient: WallOrient; r: number; c: number; size: 1 | 2 };
export type Segment = { orient: WallOrient; index: number };

export type Move =
  | { type: 'move'; to: number }
  | { type: 'wall'; wall: Wall }
  | { type: 'knight'; to: number }
  | { type: 'cannon'; target: 'board'; segment: Segment }
  | { type: 'cannon'; target: 'hand'; take: 'big' | 'small' }
  | { type: 'skip' };

export type LastMove = Move & { player: Player; bonus?: 'knight' | 'cannon' };

export type Round = {
  pawns: [number, number];
  /** v[r * 8 + c]: (r,c) ile (r,c+1) arasındaki dikey sur. */
  v: boolean[];
  /** h[r * 9 + c]: (r,c) ile (r+1,c) arasındaki yatay sur. */
  h: boolean[];
  big: [number, number];
  small: [number, number];
  /** Oyuncunun bir kez kullandığı at/top kareleri. */
  used: [number[], number[]];
  turn: Player;
  phase: Phase;
  finished: boolean;
  winner: Player | null;
  lastMove: LastMove | null;
};

export function newRound(first: Player = 0): Round {
  return {
    pawns: [...START_CELLS] as [number, number],
    v: Array(V_COUNT).fill(false),
    h: Array(H_COUNT).fill(false),
    big: [START_BIG, START_BIG],
    small: [START_SMALL, START_SMALL],
    used: [[], []],
    turn: first,
    phase: 'move',
    finished: false,
    winner: null,
    lastMove: null,
  };
}

export const rowOf = (cell: number) => Math.floor(cell / SIDE);
export const colOf = (cell: number) => cell % SIDE;
export const cellAt = (row: number, col: number) => row * SIDE + col;

export type Step = { to: number; orient: WallOrient; index: number; row: number; col: number };

/** Bir kareden yön 0=yukarı, 1=sağ, 2=aşağı, 3=sol komşusuna geçiş bilgisi. */
export function stepInfo(cell: number, dir: number): Step | null {
  const row = rowOf(cell);
  const col = colOf(cell);
  const dr = [-1, 0, 1, 0][dir];
  const dc = [0, 1, 0, -1][dir];
  const nextRow = row + dr;
  const nextCol = col + dc;
  if (nextRow < 0 || nextRow >= SIDE || nextCol < 0 || nextCol >= SIDE) return null;
  if (dr === 0) {
    const c = Math.min(col, nextCol);
    return { to: cellAt(nextRow, nextCol), orient: 'v', index: row * (SIDE - 1) + c, row, col: c };
  }
  const r = Math.min(row, nextRow);
  return { to: cellAt(nextRow, nextCol), orient: 'h', index: r * SIDE + col, row: r, col };
}

export function isBlocked(round: Round, segment: Segment): boolean {
  return segment.orient === 'v' ? round.v[segment.index] === true : round.h[segment.index] === true;
}

export function openSteps(round: Round, cell: number): Step[] {
  const list: Step[] = [];
  for (let dir = 0; dir < 4; dir++) {
    const step = stepInfo(cell, dir);
    if (step && !isBlocked(round, step)) list.push(step);
  }
  return list;
}

/** Surun kapladığı birim kareler. */
export function segmentsOf(wall: Wall): Segment[] {
  const list: Segment[] = [];
  for (let k = 0; k < wall.size; k++) {
    if (wall.orient === 'v') list.push({ orient: 'v', index: (wall.r + k) * (SIDE - 1) + wall.c });
    else list.push({ orient: 'h', index: wall.r * SIDE + (wall.c + k) });
  }
  return list;
}

export function validWall(wall: Wall): boolean {
  if (wall.size !== 1 && wall.size !== 2) return false;
  if (!Number.isInteger(wall.r) || !Number.isInteger(wall.c)) return false;
  if (wall.orient === 'v')
    return wall.r >= 0 && wall.c >= 0 && wall.c <= SIDE - 2 && wall.r + wall.size <= SIDE;
  return wall.r >= 0 && wall.r <= SIDE - 2 && wall.c >= 0 && wall.c + wall.size <= SIDE;
}

export type Anchor = { orient: WallOrient; row: number; col: number };

export function wallAt(anchor: Anchor, size: 1 | 2, side: 'start' | 'end'): Wall | null {
  const shift = side === 'start' ? 0 : size - 1;
  const wall: Wall =
    anchor.orient === 'v'
      ? { orient: 'v', r: anchor.row - shift, c: anchor.col, size }
      : { orient: 'h', r: anchor.row, c: anchor.col - shift, size };
  return validWall(wall) ? wall : null;
}

export function withWall(round: Round, wall: Wall): Round {
  const v = [...round.v];
  const h = [...round.h];
  for (const segment of segmentsOf(wall))
    if (segment.orient === 'v') v[segment.index] = true;
    else h[segment.index] = true;
  return { ...round, v, h };
}

function withoutSegment(round: Round, segment: Segment): Round {
  const v = [...round.v];
  const h = [...round.h];
  if (segment.orient === 'v') v[segment.index] = false;
  else h[segment.index] = false;
  return { ...round, v, h };
}

/** Hedeflere (çok kaynaklı BFS) en kısa adım sayıları. Ulaşılamayan kare Infinity. */
export function distances(round: Round, player: Player): number[] {
  const dist = Array(CELL_COUNT).fill(Infinity) as number[];
  const queue: number[] = [];
  for (const goal of GOAL_CELLS[player]) {
    dist[goal] = 0;
    queue.push(goal);
  }
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const step of openSteps(round, cell)) {
      if (dist[step.to] > dist[cell] + 1) {
        dist[step.to] = dist[cell] + 1;
        queue.push(step.to);
      }
    }
  }
  return dist;
}

export function distance(round: Round, player: Player): number {
  return distances(round, player)[round.pawns[player]];
}

export function reachable(round: Round, player: Player): boolean {
  return Number.isFinite(distance(round, player));
}

/** Rakibin en kısa yolundaki kareler (kale → hedef sırasıyla). */
export function pathToGoal(round: Round, player: Player): number[] {
  const goals = new Set(GOAL_CELLS[player]);
  const start = round.pawns[player];
  const previous = new Map<number, number>();
  const seen = new Set<number>([start]);
  const queue = [start];
  let hit: number | null = null;
  for (let head = 0; head < queue.length && hit === null; head++) {
    const cell = queue[head];
    if (goals.has(cell)) hit = cell;
    for (const step of openSteps(round, cell)) {
      if (!seen.has(step.to)) {
        seen.add(step.to);
        previous.set(step.to, cell);
        queue.push(step.to);
      }
    }
  }
  if (hit === null) return [];
  const path: number[] = [];
  let cursor: number | undefined = hit;
  while (cursor !== undefined && cursor !== start) {
    path.push(cursor);
    cursor = previous.get(cursor);
  }
  path.push(start);
  return path.reverse();
}

/** Kalenin gidebileceği kareler; kuşatma altındaysa rakip kalenin üstünden atlar. */
export function pawnMoves(round: Round, player: Player = round.turn): number[] {
  const from = round.pawns[player];
  const opponent = round.pawns[player === 0 ? 1 : 0];
  const free = openSteps(round, from)
    .filter((step) => step.to !== opponent)
    .map((step) => step.to);
  if (free.length) return free;
  // Kural: gidecek başka yer yoksa rakip kalenin üzerinden atlanır.
  const jumps: number[] = [];
  for (let dir = 0; dir < 4; dir++) {
    const step = stepInfo(from, dir);
    if (!step || step.to !== opponent || isBlocked(round, step)) continue;
    const landing = stepInfo(opponent, dir);
    if (landing && !isBlocked(round, landing) && landing.to !== from) jumps.push(landing.to);
  }
  return jumps;
}

/** At karesi bonusu: iki adımda ulaşılabilen kareler (rakibin kalesi hariç). */
export function knightTargets(round: Round, player: Player = round.turn): number[] {
  const from = round.pawns[player];
  const opponent = round.pawns[player === 0 ? 1 : 0];
  const seen = new Set<number>([from]);
  const targets = new Set<number>();
  let frontier = [from];
  for (let depth = 0; depth < 2; depth++) {
    const next: number[] = [];
    for (const cell of frontier) {
      for (const step of openSteps(round, cell)) {
        if (step.to === opponent) continue;
        if (seen.has(step.to)) continue;
        seen.add(step.to);
        next.push(step.to);
        targets.add(step.to);
      }
    }
    frontier = next;
  }
  return [...targets].sort((a, b) => a - b);
}

export function boardSegments(round: Round): Segment[] {
  const list: Segment[] = [];
  round.v.forEach((set, index) => {
    if (set) list.push({ orient: 'v', index });
  });
  round.h.forEach((set, index) => {
    if (set) list.push({ orient: 'h', index });
  });
  return list;
}

export function cannonOptions(round: Round, player: Player = round.turn): Move[] {
  const opponent: Player = player === 0 ? 1 : 0;
  const moves: Move[] = boardSegments(round).map((segment) => ({
    type: 'cannon' as const,
    target: 'board' as const,
    segment,
  }));
  if (round.big[opponent] > 0) moves.push({ type: 'cannon', target: 'hand', take: 'big' });
  if (round.small[opponent] > 0) moves.push({ type: 'cannon', target: 'hand', take: 'small' });
  return moves;
}

export function canPlaceWall(round: Round, player: Player, wall: Wall): boolean {
  if (!validWall(wall)) return false;
  if (wall.size === 2 ? round.big[player] <= 0 : round.small[player] <= 0) return false;
  for (const segment of segmentsOf(wall)) if (isBlocked(round, segment)) return false;
  const next = withWall(round, wall);
  return reachable(next, 0) && reachable(next, 1);
}

export function legalMoves(round: Round, player: Player = round.turn): Move[] {
  if (round.finished) return [];
  if (round.phase === 'knight')
    return [...knightTargets(round, player).map((to) => ({ type: 'knight' as const, to })), { type: 'skip' }];
  if (round.phase === 'cannon') return [...cannonOptions(round, player), { type: 'skip' }];
  const moves: Move[] = pawnMoves(round, player).map((to) => ({ type: 'move' as const, to }));
  for (let r = 0; r <= SIDE - 2; r++)
    for (let c = 0; c <= SIDE - 2; c++) {
      for (const size of [2, 1] as const) {
        const vertical: Wall = { orient: 'v', r, c, size };
        const horizontal: Wall = { orient: 'h', r, c, size };
        if (canPlaceWall(round, player, vertical)) moves.push({ type: 'wall', wall: vertical });
        if (canPlaceWall(round, player, horizontal)) moves.push({ type: 'wall', wall: horizontal });
      }
    }
  if (!moves.length) moves.push({ type: 'skip' });
  return moves;
}

function endTurn(round: Round, player: Player, move: Move, bonus?: 'knight' | 'cannon'): Round {
  return {
    ...round,
    phase: 'move',
    turn: player === 0 ? 1 : 0,
    lastMove: { ...move, player, ...(bonus ? { bonus } : {}) },
  };
}

function settle(round: Round, player: Player, move: Move): Round {
  const cell = round.pawns[player];
  if (GOAL_CELLS[player].includes(cell))
    return { ...round, phase: 'move', finished: true, winner: player, lastMove: { ...move, player } };
  if (
    KNIGHT_CELLS.includes(cell) &&
    !round.used[player].includes(cell) &&
    knightTargets(round, player).length > 0
  ) {
    const used: [number[], number[]] = [[...round.used[0]], [...round.used[1]]];
    used[player].push(cell);
    return { ...round, used, phase: 'knight', lastMove: { ...move, player, bonus: 'knight' } };
  }
  if (CANNON_CELLS.includes(cell) && !round.used[player].includes(cell) && cannonOptions(round, player).length) {
    const used: [number[], number[]] = [[...round.used[0]], [...round.used[1]]];
    used[player].push(cell);
    return { ...round, used, phase: 'cannon', lastMove: { ...move, player, bonus: 'cannon' } };
  }
  return endTurn(round, player, move);
}

export function applyMove(round: Round, move: Move): Round {
  if (round.finished) return round;
  const player = round.turn;

  if (round.phase === 'knight') {
    if (move.type === 'skip') return endTurn(round, player, move, 'knight');
    if (move.type !== 'knight' || !knightTargets(round, player).includes(move.to)) return round;
    const pawns: [number, number] = [...round.pawns];
    pawns[player] = move.to;
    return settle({ ...round, pawns, phase: 'move' }, player, move);
  }

  if (round.phase === 'cannon') {
    if (move.type === 'skip') return endTurn(round, player, move, 'cannon');
    if (move.type !== 'cannon') return round;
    if (move.target === 'hand') {
      const opponent: Player = player === 0 ? 1 : 0;
      const big: [number, number] = [...round.big];
      const small: [number, number] = [...round.small];
      const takeBig = move.take === 'big' ? big[opponent] > 0 : false;
      if (!takeBig && small[opponent] <= 0) return round;
      if (takeBig) big[opponent] -= 1;
      else small[opponent] -= 1;
      return endTurn({ ...round, big, small, phase: 'move' }, player, move, 'cannon');
    }
    if (!isBlocked(round, move.segment)) return round;
    return endTurn(
      withoutSegment({ ...round, phase: 'move' }, move.segment),
      player,
      move,
      'cannon',
    );
  }

  if (move.type === 'skip') return endTurn(round, player, move);

  if (move.type === 'move') {
    if (!pawnMoves(round, player).includes(move.to)) return round;
    const pawns: [number, number] = [...round.pawns];
    pawns[player] = move.to;
    return settle({ ...round, pawns }, player, move);
  }

  if (move.type === 'wall') {
    if (!canPlaceWall(round, player, move.wall)) return round;
    const big: [number, number] = [...round.big];
    const small: [number, number] = [...round.small];
    if (move.wall.size === 2) big[player] -= 1;
    else small[player] -= 1;
    return endTurn(withWall({ ...round, big, small }, move.wall), player, move);
  }

  return round;
}

/* ------------------------------------------------------------------ */
/* Yapay zekâ                                                          */
/* ------------------------------------------------------------------ */

type Search = { deadline: number; nodes: number };

function evaluate(round: Round, ai: Player): number {
  if (round.finished) return round.winner === ai ? 100000 : -100000;
  const other: Player = ai === 0 ? 1 : 0;
  const mine = distance(round, ai);
  const theirs = distance(round, other);
  const walls = (round.big[ai] * 1.1 + round.small[ai] * 0.6) - (round.big[other] * 1.1 + round.small[other] * 0.6);
  return (theirs - mine) * 14 + walls + (round.turn === ai ? 2 : -2);
}

function wallCandidates(round: Round, player: Player, cap: number): Move[] {
  const opponent: Player = player === 0 ? 1 : 0;
  const path = pathToGoal(round, opponent);
  const seen = new Set<string>();
  const walls: Wall[] = [];
  for (const cell of path.slice(0, 7)) {
    for (let dir = 0; dir < 4; dir++) {
      const step = stepInfo(cell, dir);
      if (!step) continue;
      for (const [size, side] of [
        [2, 'start'],
        [2, 'end'],
        [1, 'start'],
      ] as const) {
        const wall = wallAt(step, size, side);
        if (!wall) continue;
        const key = `${wall.orient}${wall.r}:${wall.c}:${wall.size}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (canPlaceWall(round, player, wall)) walls.push(wall);
      }
    }
    if (walls.length >= cap * 3) break;
  }
  return walls.slice(0, cap).map((wall) => ({ type: 'wall' as const, wall }));
}

function generateMoves(round: Round, cap: number): Move[] {
  if (round.finished) return [];
  const player = round.turn;
  if (round.phase === 'knight')
    return [...knightTargets(round, player).map((to) => ({ type: 'knight' as const, to })), { type: 'skip' }];
  if (round.phase === 'cannon') return [...cannonOptions(round, player)];
  const moves: Move[] = pawnMoves(round, player).map((to) => ({ type: 'move' as const, to }));
  moves.push(...wallCandidates(round, player, cap));
  if (!moves.length) moves.push({ type: 'skip' });
  return moves;
}

function search(round: Round, ai: Player, depth: number, ctx: Search, cap: number): number {
  if (depth <= 0 || round.finished) return evaluate(round, ai);
  ctx.nodes += 1;
  if (ctx.nodes > 18000 || Date.now() > ctx.deadline) return evaluate(round, ai);
  const maximizing = round.turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  const moves = generateMoves(round, cap);
  for (const move of moves) {
    const next = applyMove(round, move);
    if (next === round) continue;
    const value = search(next, ai, depth - 1, ctx, Math.max(4, cap - 2));
    if (maximizing) best = Math.max(best, value);
    else best = Math.min(best, value);
  }
  if (!Number.isFinite(best)) return evaluate(round, ai);
  return best;
}

export function chooseAiMove(
  round: Round,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Move | null {
  if (round.finished) return null;
  const ai = round.turn;
  const cap = difficulty === 'hard' ? 14 : difficulty === 'medium' ? 10 : 6;
  const moves = generateMoves(round, cap);
  if (!moves.length) return null;

  if (difficulty === 'easy') {
    const quiet = moves.filter((move) => move.type === 'move' || move.type === 'knight' || move.type === 'cannon');
    if (quiet.length && random() < 0.72) return quiet[Math.min(quiet.length - 1, Math.floor(random() * quiet.length))];
    return moves[Math.min(moves.length - 1, Math.floor(random() * moves.length))];
  }

  const depth = difficulty === 'hard' ? 3 : 1;
  const ctx: Search = { deadline: Date.now() + (difficulty === 'hard' ? 900 : 260), nodes: 0 };
  let bestValue = -Infinity;
  let best: Move[] = [];
  for (const move of moves) {
    const next = applyMove(round, move);
    if (next === round) continue;
    const value = search(next, ai, depth - 1, ctx, Math.max(4, cap - 4));
    if (value > bestValue + 0.001) {
      bestValue = value;
      best = [move];
    } else if (Math.abs(value - bestValue) <= 2) best.push(move);
  }
  if (!best.length) return moves[0];
  return best[Math.min(best.length - 1, Math.floor(random() * best.length))];
}
