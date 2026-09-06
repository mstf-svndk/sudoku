import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZES,
  boxShape,
  generatePuzzle,
  countSolutions,
  solvableWithSingles,
  puzzleCode,
  parseCode,
  candidates,
  dailySeed,
  dayKey,
  symbol,
} from '../lib/sudoku.ts';
import {
  newSession,
  newPlayer,
  move,
  undo,
  isComplete,
  restoreSession,
  recordWin,
  emptyStats,
  restoreStats,
} from '../lib/game.ts';

for (const size of SIZES)
  for (let level = 0; level < 5; level++)
    void test(`${size}×${size}, level ${level}: valid unique puzzle and beginner logic`, () => {
      for (const seed of [1, 42, 20260906]) {
        const p = generatePuzzle(size, level, seed),
          [h, w] = boxShape(size),
          expected = Array.from({ length: size }, (_, i) => i + 1).join(',');
        const sorted = (a: number[]) => [...a].sort((a, b) => a - b).join(',');
        assert.equal(p.solution.length, size ** 2);
        assert.ok(p.givens.includes(0));
        assert.ok(p.givens.some(Boolean));
        for (let r = 0; r < size; r++)
          assert.equal(
            sorted(p.solution.slice(r * size, (r + 1) * size)),
            expected,
          );
        for (let c = 0; c < size; c++)
          assert.equal(
            sorted(p.solution.filter((_, i) => i % size === c)),
            expected,
          );
        for (let r = 0; r < size; r += h)
          for (let c = 0; c < size; c += w) {
            const b = [];
            for (let y = 0; y < h; y++)
              for (let x = 0; x < w; x++)
                b.push(p.solution[(r + y) * size + c + x]);
            assert.equal(sorted(b), expected);
          }
        assert.equal(countSolutions(p.givens, size), 1);
        assert.ok(p.givens.every((n, i) => !n || n === p.solution[i]));
        if (level <= 1) assert.ok(solvableWithSingles(p.givens, size));
      }
    });
void test('Difficulty removes monotonically more clues with the same seed', () => {
  for (const size of SIZES) {
    let previous = size ** 2;
    for (let level = 0; level < 5; level++) {
      const count = generatePuzzle(size, level, 42).givens.filter(
        Boolean,
      ).length;
      assert.ok(count <= previous);
      previous = count;
    }
  }
});
void test('Deterministic puzzles and safe share codes', () => {
  for (const size of SIZES) {
    const p = generatePuzzle(size, 2, 0xffffffff);
    assert.deepEqual(generatePuzzle(size, 2, 0xffffffff), p);
    assert.deepEqual(parseCode(puzzleCode(p)), {
      size,
      level: 2,
      seed: 0xffffffff,
    });
  }
  for (const code of [
    '',
    '2.9.1.a',
    '1.16.1.a',
    '1.9.7.a',
    '1.9.1.zzzzzzz',
    '../x',
    '1.9.1.<script>',
  ])
    assert.equal(parseCode(code), null);
});
void test('Daily challenge resets at Istanbul midnight', () => {
  assert.equal(dayKey(new Date('2026-09-05T20:59:59Z')), '2026-09-05');
  assert.equal(dailySeed(new Date('2026-09-05T21:00:00Z')), 20260906);
  assert.equal(dailySeed(new Date('2026-09-06T20:59:59Z')), 20260906);
});
void test('Candidate elimination respects rectangular boxes', () => {
  const p = generatePuzzle(6, 1, 47);
  for (let i = 0; i < 36; i++)
    if (!p.givens[i])
      assert.ok(candidates(p.givens, i, 6).includes(p.solution[i]));
  assert.deepEqual(
    [symbol(9), symbol(10), symbol(11), symbol(12)],
    ['9', 'A', 'B', 'C'],
  );
});
void test('Moves, fixed clues, notes, erase and undo preserve board history', () => {
  const p = generatePuzzle(6, 1, 11),
    initial = newPlayer(p),
    i = p.givens.indexOf(0),
    given = p.givens.findIndex(Boolean);
  assert.equal(move(initial, p, given, 0), initial);
  assert.equal(move(initial, p, -1, 2), initial);
  assert.equal(move(initial, p, i, 7), initial);
  const noted = move(initial, p, i, 2, true);
  assert.deepEqual(noted.notes[i], [2]);
  assert.equal(noted.values[i], 0);
  assert.deepEqual(move(noted, p, i, 2, true).notes[i], []);
  const written = move(noted, p, i, p.solution[i]);
  assert.deepEqual(written.notes[i], []);
  assert.deepEqual(undo(written).notes[i], [2]);
  assert.equal(undo(written).values[i], 0);
  assert.equal(move(written, p, i, 0).values[i], 0);
  assert.deepEqual(initial.notes[i], []);
});
void test('Completion checks all cells and all values', () => {
  const p = generatePuzzle(4, 0, 10),
    player = newPlayer(p);
  assert.equal(isComplete(player, p), false);
  let solved = player;
  for (let i = 0; i < p.givens.length; i++)
    if (!p.givens[i]) solved = move(solved, p, i, p.solution[i]);
  assert.ok(isComplete(solved, p));
  assert.equal(
    isComplete({ ...solved, values: solved.values.map(() => 1) }, p),
    false,
  );
});
void test('Race players start on identical independent boards', () => {
  const s = newSession(6, 2, 200, 'versus');
  assert.equal(s.players.length, 2);
  assert.deepEqual(s.players[0].values, s.players[1].values);
  assert.notEqual(s.players[0].values, s.players[1].values);
  const i = s.puzzle.givens.indexOf(0);
  const changed = move(s.players[0], s.puzzle, i, s.puzzle.solution[i]);
  assert.notDeepEqual(changed.values, s.players[1].values);
});
void test('Reload restores notes and history, pauses started games and rejects corrupt data', () => {
  const s = newSession(9, 1, 19);
  const i = s.puzzle.givens.indexOf(0);
  s.players[0] = move(s.players[0], s.puzzle, i, 3, true);
  s.started = true;
  s.elapsed = 39;
  const restored = restoreSession(JSON.stringify(s));
  assert.ok(restored);
  assert.equal(restored.paused, true);
  assert.deepEqual(restored.players, s.players);
  assert.equal(restored.elapsed, 39);
  for (const raw of [
    '{',
    'null',
    '{}',
    JSON.stringify({ ...s, elapsed: -1 }),
    JSON.stringify({ ...s, players: [] }),
    JSON.stringify({ ...s, mode: 'x' }),
  ])
    assert.equal(restoreSession(raw), null);
  const corrupt = structuredClone(s);
  corrupt.players[0].values[s.puzzle.givens.findIndex(Boolean)] = 0;
  assert.equal(restoreSession(JSON.stringify(corrupt)), null);
});
void test('Stored solution cannot replace regenerated authoritative solution', () => {
  const s = newSession(4, 1, 7);
  s.puzzle.solution.fill(1);
  const restored = restoreSession(JSON.stringify(s));
  assert.ok(restored);
  assert.notDeepEqual(restored.puzzle.solution, s.puzzle.solution);
});
void test('Rewards deduplicate puzzles and maintain daily streak', () => {
  const p = generatePuzzle(4, 1, 1),
    first = recordWin(emptyStats, p, 0, 42, '2026-09-06');
  assert.equal(first.stars, 3);
  assert.equal(first.streak, 1);
  assert.equal(recordWin(first, p, 0, 40, '2026-09-07'), first);
  const second = recordWin(first, generatePuzzle(4, 1, 2), 1, 30, '2026-09-07');
  assert.equal(second.stars, 5);
  assert.equal(second.streak, 2);
  assert.equal(
    recordWin(second, generatePuzzle(4, 1, 3), 3, 35, '2026-09-09').streak,
    1,
  );
  assert.deepEqual(restoreStats('broken'), emptyStats);
  assert.deepEqual(restoreStats(JSON.stringify(second)), second);
});
void test('Invalid generator settings fail safely', () => {
  assert.throws(() => generatePuzzle(9, 9, 1));
  assert.throws(() => generatePuzzle(9, 1, -1));
  assert.throws(() => generatePuzzle(9, 1, NaN));
});
