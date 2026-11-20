import { createGame, destination, DIRECTIONS, step, tileAt, TURN_LIMIT } from './game.js';
import { BOARD_SIZE, maps } from './maps.js';

const actions = Object.keys(DIRECTIONS);
const samePosition = (a, b) => a.row === b.row && a.col === b.col;
const distance = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const blocked = (outcome) => outcome === 'wall' || outcome === 'boundary';

export const FEATURES = [
  'turns', 'invalidMoves', 'damageTaken', 'finalScore', 'won',
  'maxScoreJump', 'maxMovement', 'maxHealthGain', 'maxInvalidStreak',
];

export const SEEDS = Object.freeze({
  training: [1, 50],
  calibration: [51, 75],
  evaluation: [76, 100],
});

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

function planMove(state, avoidHazards) {
  const { mapId, position, crystals } = state;
  const queue = [{ position, firstMove: null }];
  const key = ({ row, col }) => row * BOARD_SIZE + col;
  const seen = new Set([key(position)]);

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const action of actions) {
      const target = destination(current.position, action);
      const tile = tileAt(mapId, target);
      if (!tile || tile === '#' || (avoidHazards && tile === '!') || seen.has(key(target))) continue;

      const firstMove = current.firstMove ?? action;
      const reachedGoal = crystals.length
        ? crystals.some((crystal) => samePosition(crystal, target))
        : tile === 'E';
      if (reachedGoal) return firstMove;

      queue.push({ position: target, firstMove });
      seen.add(key(target));
    }
  }
  return null;
}

export function playBot(mapId, seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('Seed must be an unsigned 32-bit integer');
  }

  const random = seededRandom(seed);
  const runId = `${mapId}-${seed}`;
  let state = createGame(mapId);
  const events = [];

  while (state.status === 'active') {
    const plan = random() < 0.2 ? null : planMove(state, true) ?? planMove(state, false);
    const action = plan ?? actions[Math.floor(random() * actions.length)];
    const next = step(state, action);
    events.push({ runId, seed, ...next.event });
    state = next.state;
  }
  return events;
}

export function summarize(events) {
  if (!events.length) throw new Error('Cannot summarize an empty trace');
  const final = events.at(-1);
  const summary = {
    turns: events.length,
    invalidMoves: 0,
    damageTaken: 0,
    finalScore: final.score,
    won: Number(final.status === 'won'),
    maxScoreJump: 0,
    maxMovement: 0,
    maxHealthGain: 0,
    maxInvalidStreak: 0,
  };
  let streak = 0;

  for (const event of events) {
    if (blocked(event.outcome)) summary.invalidMoves++;
    streak = blocked(event.outcome) ? streak + 1 : 0;
    summary.damageTaken += Math.max(0, -event.healthDelta);
    summary.maxScoreJump = Math.max(summary.maxScoreJump, event.scoreDelta);
    summary.maxMovement = Math.max(summary.maxMovement, distance(event.from, event.to));
    summary.maxHealthGain = Math.max(summary.maxHealthGain, event.healthDelta);
    summary.maxInvalidStreak = Math.max(summary.maxInvalidStreak, streak);
  }
  return summary;
}

export function validateTrace(events) {
  if (!Array.isArray(events) || !events.length || events.length > TURN_LIMIT) {
    throw new Error('Invalid trace length');
  }
  const { runId, seed, mapId } = events[0];
  const start = createGame(mapId);
  let previous = { to: start.position, score: start.score, health: start.health, crystalsRemaining: 3 };
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  const validCoordinate = (value) => count(value) && value < BOARD_SIZE;
  const validPosition = (position) => position &&
    validCoordinate(position.row) && validCoordinate(position.col);

  for (const [index, event] of events.entries()) {
    function require(condition, field) {
      if (!condition) throw new Error(`Invalid trace ${runId} turn ${index + 1}: ${field}`);
    }

    require(typeof runId === 'string' && runId.length && count(seed) && seed <= 0xffffffff &&
      event.runId === runId && event.seed === seed && event.mapId === mapId, 'run identity');
    require(event.turn === index + 1 && Object.hasOwn(DIRECTIONS, event.action), 'turn or action');
    require(validPosition(event.from) && validPosition(event.to) &&
      samePosition(previous.to, event.from), 'position chain');
    require((blocked(event.outcome) && samePosition(event.from, event.to)) ||
      (event.outcome === 'moved' && !samePosition(event.from, event.to)), 'movement outcome');
    require(count(event.score) && Number.isSafeInteger(event.scoreDelta) &&
      previous.score + event.scoreDelta === event.score, 'score and delta');
    require(count(event.health) && Number.isSafeInteger(event.healthDelta) &&
      previous.health + event.healthDelta === event.health, 'health and delta');
    require(count(event.crystalsRemaining) && event.crystalsRemaining <= previous.crystalsRemaining &&
      previous.crystalsRemaining - event.crystalsRemaining <= 1, 'crystals remaining');
    if (index === events.length - 1) {
      require((event.status === 'won' && event.reason === null && !event.crystalsRemaining) ||
        (event.status === 'lost' && ['health', 'turn-limit'].includes(event.reason)), 'terminal status');
    } else {
      require(event.status === 'active' && event.reason === null, 'active status');
    }
    previous = event;
  }
}

export function collectNormalRuns() {
  const runs = [];
  for (const [group, [first, last]] of Object.entries(SEEDS)) {
    for (const mapId of Object.keys(maps)) {
      for (let seed = first; seed <= last; seed++) {
        const events = playBot(mapId, seed);
        validateTrace(events);
        runs.push({ group, mapId, seed, runId: events[0].runId, events, features: summarize(events) });
      }
    }
  }
  return runs;
}
