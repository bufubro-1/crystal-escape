import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../../src/game.js';
import { maps, validateMap } from '../../src/maps.js';

function play(state, directions) {
  for (const direction of directions) state = step(state, direction).state;
  return state;
}

const start = () => createGame('quarry');
const rights = (count) => Array(count).fill('right');

test('U01 initializes Quarry at the start with fresh counters', () => {
  const state = start();
  assert.deepEqual(state.position, { row: 0, col: 0 });
  assert.deepEqual(
    [state.score, state.health, state.turn, state.crystals.length, state.status],
    [0, 3, 0, 3, 'active'],
  );
});

test('U02 moves one tile and consumes one turn', () => {
  const { state, event } = step(start(), 'right');
  assert.deepEqual(state.position, { row: 0, col: 1 });
  assert.equal(state.turn, 1);
  assert.equal(event.outcome, 'moved');
});

test('U03 a wall blocks movement and does not reapply the current hazard', () => {
  const state = step(start(), 'down').state;
  const result = step(state, 'right');
  assert.deepEqual(result.state.position, { row: 1, col: 0 });
  assert.equal(result.state.turn, 2);
  assert.equal(result.state.health, 2);
  assert.equal(result.event.outcome, 'wall');
});

test('U04 an out-of-bounds move consumes a turn without moving', () => {
  const { state, event } = step(start(), 'up');
  assert.deepEqual(state.position, { row: 0, col: 0 });
  assert.equal(state.turn, 1);
  assert.equal(event.outcome, 'boundary');
});

for (const [id, invalid] of [['U05a', 'space'], ['U05b', 'toString']]) {
  test(`${id} ignores unsupported direction ${invalid}`, () => {
    const state = start();
    assert.deepEqual(step(state, invalid), { state, event: null });
  });
}

test('U06 collecting a crystal removes it and scores 10 only once', () => {
  const first = step(start(), 'right');
  assert.equal(first.state.score, 10);
  assert.equal(first.state.crystals.length, 2);
  const revisit = play(first.state, ['left', 'right']);
  assert.equal(revisit.score, 10);
  assert.equal(revisit.crystals.length, 2);
});

test('U07 hazard entries subtract health and play stays active at one health', () => {
  const state = play(start(), ['down', 'up', 'down']);
  assert.equal(state.health, 1);
  assert.equal(state.status, 'active');
});

test('U08 entering a hazard at one health ends play', () => {
  const state = play(start(), ['down', 'up', 'down', 'up', 'down']);
  assert.equal(state.health, 0);
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, 'health');
});

test('U09 an exit entry with two collected crystals keeps play active', () => {
  const state = play(start(), [
    ...rights(4), 'down', 'right', 'right', 'up', 'right',
  ]);
  assert.deepEqual(state.position, { row: 0, col: 7 });
  assert.equal(state.crystals.length, 1);
  assert.equal(state.score, 20);
  assert.equal(state.status, 'active');
});

test('U10 an exit entry with three collected crystals wins and adds 20', () => {
  const state = play(start(), rights(7));
  assert.equal(state.crystals.length, 0);
  assert.equal(state.score, 50);
  assert.equal(state.status, 'won');
});

test('U11 turn 39 remains active and turn 40 loses without a win', () => {
  const penultimate = play(start(), Array(39).fill('up'));
  assert.equal(penultimate.turn, 39);
  assert.equal(penultimate.status, 'active');
  const { state } = step(penultimate, 'up');
  assert.equal(state.turn, 40);
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, 'turn-limit');
});

test('U12 a qualifying exit entry on turn 40 wins', () => {
  const state = play(start(), [...Array(33).fill('up'), ...rights(7)]);
  assert.equal(state.turn, 40);
  assert.equal(state.status, 'won');
  assert.equal(state.score, 50);
});

test('U13 a zero-health loss on turn 40 reports the health reason', () => {
  const state = play(start(), [
    ...Array(35).fill('up'), 'down', 'up', 'down', 'up', 'down',
  ]);
  assert.equal(state.turn, 40);
  assert.equal(state.health, 0);
  assert.equal(state.reason, 'health');
});

for (const [id, status, moves] of [
  ['U14a', 'won', rights(7)],
  ['U14b', 'lost', Array(40).fill('up')],
]) {
  test(`${id} movement leaves a ${status} session unchanged`, () => {
    const state = play(start(), moves);
    assert.equal(state.status, status);
    assert.deepEqual(step(state, 'left'), { state, event: null });
  });
}

test('U15 starting again restores the original state and crystals', () => {
  const old = play(start(), ['right', 'left', 'down']);
  const fresh = createGame(old.mapId);
  assert.notEqual(fresh.crystals, old.crystals);
  assert.equal(old.crystals.length, 2);
  assert.deepEqual(fresh, start());
});

test('U16 a step preserves all input fields and positions', () => {
  const state = start();
  const before = structuredClone(state);
  Object.freeze(state.position);
  Object.freeze(state.crystals);
  Object.freeze(state);
  const next = step(state, 'right').state;
  assert.deepEqual(state, before);
  assert.notEqual(next, state);
  assert.equal(next.crystals.length, 2);
});

test('U17 rejects unknown map IDs', () => {
  assert.throws(() => createGame('toString'), /Unknown map/);
});

for (const [id, description, change] of [
  ['U18a', 'number of rows', (rows) => rows.pop()],
  ['U18b', 'number of columns', (rows) => { rows[0] += '.'; }],
  ['U18c', 'unknown tile', (rows) => { rows[7] = '?.......'; }],
  ['U18d', 'number of crystals', (rows) => { rows[0] = 'S..C.C.E'; }],
  ['U18e', 'missing exit', (rows) => { rows[0] = 'SC.C.C..'; }],
  ['U18f', 'duplicate start', (rows) => { rows[7] = 'S.......'; }],
  ['U18g', 'missing hazard', (rows) => {
    rows.splice(0, rows.length, ...rows.map((row) => row.replaceAll('!', '.')));
  }],
  ['U18h', 'missing wall', (rows) => {
    rows.splice(0, rows.length, ...rows.map((row) => row.replaceAll('#', '.')));
  }],
]) {
  test(`${id} map validation rejects ${description}`, () => {
    const rows = [...maps.quarry.rows];
    change(rows);
    assert.throws(() => validateMap(rows), /Invalid map/);
  });
}

test('U19 records one complete move event with signed state deltas', () => {
  const { event } = step(start(), 'down');
  assert.deepEqual(event, {
    mapId: 'quarry',
    turn: 1,
    action: 'down',
    from: { row: 0, col: 0 },
    to: { row: 1, col: 0 },
    outcome: 'moved',
    score: 0,
    scoreDelta: 0,
    health: 2,
    healthDelta: -1,
    crystalsRemaining: 3,
    status: 'active',
    reason: null,
  });
});
