import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseAiMove, linesAt, newMatch, newRound, nextRound, place, play } from '../lib/sos/game.ts';
import { LETTERS, WORDS, cleanWord, pickWord, validCustomWord } from '../lib/word-hunt.ts';

void test('SOS counts horizontal, vertical and diagonal lines completed by one move', () => {
  const board = newRound().board;
  // S at center completes three independent S-O-S sequences.
  board[10] = 'S'; board[11] = 'O';
  board[2] = 'S'; board[7] = 'O';
  board[0] = 'S'; board[6] = 'O';
  const round = place({ ...newRound(), board }, { index: 12, mark: 'S' });
  assert.equal(round.scores[0], 3);
  assert.equal(round.turn, 0);
  assert.equal(round.lastMove?.lines.length, 3);
  assert.equal(linesAt(round.board, 12).length, 3);
});

void test('invalid or occupied cells leave the round unchanged', () => {
  const round = newRound();
  assert.equal(place(round, { index: -1, mark: 'S' }), round);
  const played = place(round, { index: 0, mark: 'O' });
  assert.equal(played.turn, 1);
  assert.equal(place(played, { index: 0, mark: 'S' }), played);
});

void test('match wins, draws, next round and champion follow the target', () => {
  let match = newMatch('local', 'medium', 3);
  for (let game = 0; game < 3; game++) {
    // One remaining cell creates SOS for player one and ends the round.
    const board = Array(25).fill('O') as ('S' | 'O' | null)[];
    board[0] = 'S'; board[1] = 'O'; board[2] = null;
    match = { ...match, round: { ...newRound(), board, scores: [2, 0] } };
    match = play(match, { index: 2, mark: 'S' });
    assert.equal(match.round.winner, 0);
    assert.equal(match.wins[0], game + 1);
    if (game < 2) match = nextRound(match);
  }
  assert.equal(match.champion, 0);
  assert.equal(nextRound(match), match);
  assert.equal(play(match, { index: 3, mark: 'S' }), match);
  const draw = place({ ...newRound(), board: [...Array(24).fill('O'), null], scores: [1, 1] }, { index: 24, mark: 'O' });
  assert.equal(draw.winner, null);
});

void test('AI levels choose valid moves and harder levels take immediate SOS', () => {
  const board = newRound().board;
  board[0] = 'S'; board[1] = 'O';
  const round = { ...newRound(1), board };
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const move = chooseAiMove(round, level, () => 0);
    assert.ok(move);
    assert.equal(round.board[move.index], null);
  }
  assert.deepEqual(chooseAiMove(round, 'medium', () => 0), { index: 2, mark: 'S' });
  assert.deepEqual(chooseAiMove(round, 'hard', () => 0), { index: 2, mark: 'S' });
});

void test('word library supports Turkish letters and validates two-player words', () => {
  assert.ok(LETTERS.includes('İ') && LETTERS.includes('I') && LETTERS.includes('Ğ'));
  assert.equal(cleanWord('  gökkuşağı  '), 'GÖKKUŞAĞI');
  assert.equal(validCustomWord('GÖKKUŞAĞI'), true);
  assert.equal(validCustomWord('x3!'), false);
  assert.ok(WORDS.every(({ word }) => Array.from(word).every((letter) => LETTERS.includes(letter))));
  assert.notEqual(pickWord('Bilim', 'ROBOT', () => 0).word, 'ROBOT');
});
