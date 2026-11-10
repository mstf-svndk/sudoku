import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANNON_CELLS, GOAL_CELLS, KNIGHT_CELLS, START_CELLS, cellAt,
  applyMove, canPlaceWall, chooseAiMove, distance, knightTargets, legalMoves,
  newRound, pawnMoves, type Round, type Wall, withWall,
} from '../lib/eyvan/game.ts';

const at = (row: number, col: number) => cellAt(row, col);

void test('tahta kurulumu: kaleler ortadaki oklarda, hedefler karşı köşelerde', () => {
  const round = newRound();
  assert.deepEqual(START_CELLS, [at(3, 4), at(5, 4)]);
  assert.deepEqual(round.pawns, [at(3, 4), at(5, 4)]);
  assert.deepEqual(GOAL_CELLS[0], [at(8, 0), at(8, 8)]);
  assert.deepEqual(GOAL_CELLS[1], [at(0, 0), at(0, 8)]);
  // İki oyuncunun hedefe en kısa yolu eşit uzunlukta.
  assert.equal(distance(round, 0), 9);
  assert.equal(distance(round, 1), 9);
  assert.deepEqual(round.big, [9, 9]);
  assert.deepEqual(round.small, [3, 3]);
});

void test('kale bir kare yatay/dikey ilerler, sıra karşıya geçer', () => {
  const round = newRound();
  const moved = applyMove(round, { type: 'move', to: at(3, 5) });
  assert.deepEqual(moved.pawns, [at(3, 5), at(5, 4)]);
  assert.equal(moved.turn, 1);
  // Çapraz hamle yok.
  assert.equal(applyMove(round, { type: 'move', to: at(4, 5) }), round);
  // İki kare birden gidilmez.
  assert.equal(applyMove(round, { type: 'move', to: at(3, 6) }), round);
});

void test('sur kale geçişini kapatır ve stoktan düşer', () => {
  const round = newRound();
  const wall: Wall = { orient: 'v', r: 3, c: 4, size: 1 };
  const placed = applyMove(round, { type: 'wall', wall });
  assert.equal(placed.v[3 * 8 + 4], true);
  assert.deepEqual(placed.small, [2, 3]);
  assert.equal(placed.turn, 1);
  assert.deepEqual(pawnMoves(placed, 0).includes(at(3, 5)), false);
});

void test('aynı yere ikinci sur konmaz, stok bitince sur konmaz', () => {
  const round = newRound();
  const placed = withWall(round, { orient: 'h', r: 4, c: 4, size: 2 });
  assert.equal(canPlaceWall(placed, 0, { orient: 'h', r: 4, c: 5, size: 1 }), false);
  const drained: Round = { ...round, big: [0, 9], small: [0, 3] };
  assert.equal(canPlaceWall(drained, 0, { orient: 'v', r: 2, c: 2, size: 1 }), false);
});

void test('tahtayı ikiye bölen sur reddedilir (hedefe yol açık kalmalı)', () => {
  const base = newRound();
  let round = base;
  for (let c = 0; c < 8; c++) round = withWall(round, { orient: 'h', r: 7, c, size: 1 });
  // Son birim hariç her yer kapalı: alt köşelere yol kalmadı.
  assert.equal(canPlaceWall(round, 0, { orient: 'h', r: 7, c: 8, size: 1 }), false);
  // Kapalı değilken aynı hamle serbest.
  assert.equal(canPlaceWall(base, 0, { orient: 'h', r: 7, c: 8, size: 1 }), true);
});

void test('dar koridorda rakip kalenin üstünden atlanır', () => {
  const round: Round = { ...newRound(), pawns: [at(3, 4), at(3, 5)] };
  round.h = Array(72).fill(false);
  round.v = [...round.v];
  round.h[2 * 9 + 4] = true; // (2,4)-(3,4) kapalı
  round.h[3 * 9 + 4] = true; // (3,4)-(4,4) kapalı
  round.v[3 * 8 + 3] = true; // (3,3)-(3,4) kapalı
  // Tek açık yön rakibin kalesi: üstünden atlayıp arkasına konar.
  assert.deepEqual(pawnMoves(round, 0), [at(3, 6)]);
});

void test('at karesi iki adım hakkı verir, bir kez kullanılır', () => {
  let round: Round = { ...newRound(), pawns: [at(1, 5), at(5, 4)] };
  const landed = applyMove(round, { type: 'move', to: at(1, 6) });
  assert.equal(KNIGHT_CELLS.includes(at(1, 6)), true);
  assert.equal(landed.phase, 'knight');
  assert.equal(landed.turn, 0);
  assert.ok(landed.used[0].includes(at(1, 6)));
  const targets = knightTargets(landed, 0);
  assert.ok(targets.length > 0);
  const jumped = applyMove(landed, { type: 'knight', to: targets[0] });
  assert.equal(jumped.phase, 'move');
  assert.equal(jumped.turn, 1);
  // Aynı kareye ikinci kez gelince bonus yok.
  round = { ...landed, turn: 0, phase: 'move', pawns: [at(1, 5), at(5, 4)] };
  const again = applyMove(round, { type: 'move', to: at(1, 6) });
  assert.equal(again.phase, 'move');
  assert.equal(again.turn, 1);
});

void test('top karesi sahadaki suru kaldırır', () => {
  let round: Round = { ...newRound(), pawns: [at(7, 5), at(5, 4)] };
  round = withWall(round, { orient: 'v', r: 6, c: 3, size: 1 });
  const landed = applyMove(round, { type: 'move', to: at(7, 6) });
  assert.equal(CANNON_CELLS.includes(at(7, 6)), true);
  assert.equal(landed.phase, 'cannon');
  const cleared = applyMove(landed, { type: 'cannon', target: 'board', segment: { orient: 'v', index: 6 * 8 + 3 } });
  assert.equal(cleared.v[6 * 8 + 3], false);
  assert.equal(cleared.turn, 1);
});

void test('top karesi rakibin elinden de sur alabilir', () => {
  let round: Round = { ...newRound(), pawns: [at(7, 5), at(5, 4)] };
  const landed = applyMove(round, { type: 'move', to: at(7, 6) });
  const stolen = applyMove(landed, { type: 'cannon', target: 'hand', take: 'big' });
  assert.deepEqual(stolen.big, [9, 8]);
  assert.equal(stolen.turn, 1);
  round = landed;
  assert.equal(round.phase, 'cannon');
});

void test('hedef köşeye ulaşan oyunu kazanır', () => {
  const round: Round = { ...newRound(), pawns: [at(8, 1), at(5, 4)] };
  const won = applyMove(round, { type: 'move', to: at(8, 0) });
  assert.equal(won.finished, true);
  assert.equal(won.winner, 0);
  assert.equal(applyMove(won, { type: 'move', to: at(8, 0) }), won);
});

void test('yapay zekâ her seviyede yasal hamle üretir', () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const round = newRound();
    const start = Date.now();
    const move = chooseAiMove(round, difficulty, () => 0);
    const elapsed = Date.now() - start;
    assert.ok(move, `${difficulty} hamle döndürmedi`);
    assert.notEqual(applyMove(round, move!), round, `${difficulty} yasadışı hamle: ${JSON.stringify(move)}`);
    assert.ok(elapsed < 2000, `${difficulty} çok yavaş: ${elapsed}ms`);
  }
});

void test('yapay zekâ sur koyunca hedefe yol açık kalır', () => {
  let round = newRound();
  for (let i = 0; i < 12 && !round.finished; i++) {
    const move = chooseAiMove(round, 'medium', () => 0);
    if (!move) break;
    round = applyMove(round, move);
    assert.ok(Number.isFinite(distance(round, 0)), 'taraf 0 hedefsiz kaldı');
    assert.ok(Number.isFinite(distance(round, 1)), 'taraf 1 hedefsiz kaldı');
  }
});

void test('tüm yasal hamleler uygulanabilir', () => {
  const round = newRound();
  const moves = legalMoves(round);
  assert.ok(moves.length > 100, `beklenen çok hamle, gelen ${moves.length}`);
  for (const move of moves) assert.notEqual(applyMove(round, move), round);
});

void test('yapay zekâ iki tarafta da oynayınca oyun tıkanmadan biter', () => {
  let round = newRound();
  let plies = 0;
  while (!round.finished && plies < 400) {
    const move = chooseAiMove(round, 'easy', () => 0.5);
    assert.ok(move, `${plies}. hamlede hamle kalmadı`);
    const next = applyMove(round, move);
    assert.notEqual(next, round, `${plies}. hamle yasadışı: ${JSON.stringify(move)}`);
    round = next;
    plies += 1;
    assert.ok(Number.isFinite(distance(round, 0)) && Number.isFinite(distance(round, 1)), 'yol kapandı');
  }
  assert.ok(round.finished, `${plies} hamlede oyun bitmedi`);
  assert.ok(round.winner === 0 || round.winner === 1);
  assert.ok(GOAL_CELLS[round.winner].includes(round.pawns[round.winner]), 'kazanan hedefte değil');
});
