import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../../src/game.js';
import { maps } from '../../src/maps.js';
import { playBot, summarize, validateTrace } from '../../src/telemetry.js';

test('T01 the same map and seed reproduce every event, and other seeds vary play', () => {
  for (const mapId of Object.keys(maps)) {
    const first = playBot(mapId, 21);
    assert.deepEqual(first, playBot(mapId, 21));
    const actionSequences = new Set([21, 22, 23, 24, 25].map((seed) =>
      playBot(mapId, seed).map(({ action }) => action).join(','),
    ));
    assert.ok(actionSequences.size > 1, `Expected exploratory variation on ${mapId}`);
  }
});

test('T02 every attempted move agrees with an independent replay through the rules', () => {
  for (const mapId of Object.keys(maps)) {
    for (const seed of [1, 21, 41]) {
      const trace = playBot(mapId, seed);
      validateTrace(trace);

      let state = createGame(mapId);
      for (const { runId, seed: loggedSeed, ...event } of trace) {
        assert.equal(runId, `${mapId}-${seed}`);
        assert.equal(loggedSeed, seed);
        const result = step(state, event.action);
        assert.deepEqual(event, result.event);
        state = result.state;
      }
      assert.equal(state.turn, trace.length);
      assert.ok(['won', 'lost'].includes(state.status));
    }
  }
});

test('T03 summary extracts jumps, damage, terminal values and the longest invalid streak', () => {
  const event = (outcome, scoreDelta, healthDelta, row, col, score, status = 'active') => ({
    outcome, scoreDelta, healthDelta, score, status, from: { row: 0, col: 0 }, to: { row, col },
  });
  const events = [
    event('wall', 0, 0, 0, 0, 0),
    event('boundary', 0, 0, 0, 0, 0),
    event('moved', 10, -1, 3, 4, 10),
    event('wall', 0, 1, 0, 0, 10),
    event('moved', 20, -1, 0, 1, 30, 'won'),
  ];
  assert.deepEqual(summarize(events), {
    turns: 5, invalidMoves: 3, damageTaken: 2, finalScore: 30, won: 1,
    maxScoreJump: 20, maxMovement: 7, maxHealthGain: 1, maxInvalidStreak: 2,
  });
});

test('T04 summary reports zero health gain when health never increases', () => {
  const events = [{ outcome: 'moved', scoreDelta: 0, healthDelta: -1, score: 0,
    status: 'lost', from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }];
  assert.equal(summarize(events).maxHealthGain, 0);
  assert.equal(summarize(events).won, 0);
});

test('T05 trace validation rejects a broken position chain and an inconsistent score', () => {
  const trace = playBot('quarry', 21);
  const broken = structuredClone(trace);
  broken[1].from = { row: 7, col: 7 };
  assert.throws(() => validateTrace(broken), /position/);
  const badScore = structuredClone(trace);
  badScore[0].score++;
  assert.throws(() => validateTrace(badScore), /score/);
  const wrongOutcome = structuredClone(trace);
  const moved = wrongOutcome.find((event) => event.outcome === 'moved');
  moved.outcome = 'wall';
  assert.throws(() => validateTrace(wrongOutcome), /movement outcome/);
});
