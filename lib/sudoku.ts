export const SIZES = [4, 6, 9, 12] as const;
export type Size = (typeof SIZES)[number];
export const LEVELS = ['İlk adım', 'Kolay', 'Orta', 'Zor', 'Uzman'] as const;
export type Mode = 'solo' | 'daily' | 'versus' | 'classroom';
export type Puzzle = {
  size: Size;
  level: number;
  seed: number;
  givens: number[];
  solution: number[];
};
export const boxShape = (size: Size): [number, number] =>
  size === 4 ? [2, 2] : size === 6 ? [2, 3] : size === 9 ? [3, 3] : [3, 4];
export const symbol = (n: number) =>
  n > 9 ? String.fromCharCode(55 + n) : String(n);
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
export function peers(a: number, b: number, size: Size) {
  const [h, w] = boxShape(size),
    ar = Math.floor(a / size),
    br = Math.floor(b / size),
    ac = a % size,
    bc = b % size;
  return (
    ar === br ||
    ac === bc ||
    (Math.floor(ar / h) === Math.floor(br / h) &&
      Math.floor(ac / w) === Math.floor(bc / w))
  );
}
export function candidates(
  board: number[],
  index: number,
  size: Size,
): number[] {
  const used = new Set(
    board.filter((_, i) => i !== index && peers(index, i, size)),
  );
  return range(size)
    .map((n) => n + 1)
    .filter((n) => !used.has(n));
}
/** MRV solver. A budget exhaustion conservatively returns 2, never accepts an unproven unique puzzle. */
export function countSolutions(
  input: number[],
  size: Size,
  budget = 100_000,
): number {
  const [h, w] = boxShape(size),
    board = [...input],
    full = (1 << size) - 1;
  const rows = Array(size).fill(0),
    cols = Array(size).fill(0),
    boxes = Array(size).fill(0);
  const box = (r: number, c: number) =>
    Math.floor(r / h) * (size / w) + Math.floor(c / w);
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    const r = Math.floor(i / size),
      c = i % size,
      b = box(r, c),
      bit = 1 << (board[i] - 1);
    if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }
  let nodes = 0;
  const visit = (): number => {
    if (++nodes > budget) return 2;
    let best = -1,
      mask = 0,
      min = size + 1;
    for (let i = 0; i < board.length; i++)
      if (!board[i]) {
        const r = Math.floor(i / size),
          c = i % size;
        const m = full & ~(rows[r] | cols[c] | boxes[box(r, c)]);
        let count = 0;
        for (let v = m; v; v &= v - 1) count++;
        if (!count) return 0;
        if (count < min) {
          min = count;
          best = i;
          mask = m;
          if (count === 1) break;
        }
      }
    if (best === -1) return 1;
    const r = Math.floor(best / size),
      c = best % size,
      b = box(r, c);
    let solutions = 0;
    while (mask && solutions < 2) {
      const bit = mask & -mask;
      mask ^= bit;
      board[best] = 32 - Math.clz32(bit);
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      solutions += visit();
      rows[r] ^= bit;
      cols[c] ^= bit;
      boxes[b] ^= bit;
      board[best] = 0;
    }
    return Math.min(2, solutions);
  };
  return visit();
}
export function solvableWithSingles(input: number[], size: Size) {
  const board = [...input];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < board.length; i++)
      if (!board[i]) {
        const options = candidates(board, i, size);
        if (!options.length) return false;
        if (options.length === 1) {
          board[i] = options[0];
          changed = true;
        }
      }
  }
  return board.every(Boolean);
}
export function generatePuzzle(
  size: Size,
  level: number,
  seed: number,
): Puzzle {
  if (
    !SIZES.includes(size) ||
    !Number.isInteger(level) ||
    level < 0 ||
    level > 4 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new Error('Geçersiz bulmaca ayarı.');
  const rand = random(seed),
    [h, w] = boxShape(size);
  const rows = shuffle(range(size / h), rand).flatMap((b) =>
    shuffle(range(h), rand).map((r) => b * h + r),
  );
  const cols = shuffle(range(size / w), rand).flatMap((b) =>
    shuffle(range(w), rand).map((c) => b * w + c),
  );
  const nums = shuffle(
    range(size).map((n) => n + 1),
    rand,
  );
  const solution = rows.flatMap((r) =>
    cols.map((c) => nums[(w * (r % h) + Math.floor(r / h) + c) % size]),
  );
  const givens = [...solution],
    target = Math.floor(size * size * [0.28, 0.4, 0.51, 0.61, 0.69][level]);
  let removed = 0;
  for (const i of shuffle(range(size * size), rand)) {
    if (removed >= target) break;
    const prev = givens[i];
    givens[i] = 0;
    if (
      countSolutions(givens, size, 4000) === 1 &&
      (level > 1 || solvableWithSingles(givens, size))
    )
      removed++;
    else givens[i] = prev;
  }
  return { size, level, seed, givens, solution };
}
export const puzzleCode = (p: Pick<Puzzle, 'size' | 'level' | 'seed'>) =>
  `1.${p.size}.${p.level}.${p.seed.toString(36)}`;
export function parseCode(code: string) {
  const match = /^1\.(4|6|9|12)\.([0-4])\.([0-9a-z]{1,7})$/.exec(code);
  if (!match) return null;
  const seed = parseInt(match[3], 36);
  if (seed > 0xffffffff) return null;
  return { size: Number(match[1]) as Size, level: Number(match[2]), seed };
}
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function dailySeed(date = new Date()) {
  return Number(dayKey(date).replaceAll('-', ''));
}
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
