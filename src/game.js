import { BOARD_SIZE, maps, validateMap } from './maps.js';

export const TURN_LIMIT = 40;
export const DIRECTIONS = Object.freeze({
  up: Object.freeze([-1, 0]),
  down: Object.freeze([1, 0]),
  left: Object.freeze([0, -1]),
  right: Object.freeze([0, 1]),
});

export function createGame(mapId) {
  if (!Object.hasOwn(maps, mapId)) throw new Error(`Unknown map: ${mapId}`);
  const { rows } = maps[mapId];
  validateMap(rows);

  const tiles = rows.join('');
  const positionAt = (index) => ({ row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE });
  return {
    mapId,
    position: positionAt(tiles.indexOf('S')),
    crystals: Array.from(tiles.matchAll(/C/g), ({ index }) => positionAt(index)),
    turn: 0,
    score: 0,
    health: 3,
    status: 'active',
    reason: null,
  };
}

export function destination(position, direction) {
  const [rowDelta, colDelta] = DIRECTIONS[direction];
  return { row: position.row + rowDelta, col: position.col + colDelta };
}

export function tileAt(mapId, { row, col }) {
  return maps[mapId].rows[row]?.[col];
}

export function step(state, direction) {
  if (state.status !== 'active' || !Object.hasOwn(DIRECTIONS, direction)) {
    return { state, event: null };
  }

  const target = destination(state.position, direction);
  const tile = tileAt(state.mapId, target);
  const outcome = tile === undefined ? 'boundary' : tile === '#' ? 'wall' : 'moved';
  const next = { ...state, turn: state.turn + 1 };

  if (outcome === 'moved') {
    next.position = target;
    if (tile === 'C') {
      next.crystals = state.crystals.filter(({ row, col }) => row !== target.row || col !== target.col);
      if (next.crystals.length < state.crystals.length) next.score += 10;
    }
    if (tile === '!') next.health--;
    if (tile === 'E' && next.crystals.length === 0) {
      next.status = 'won';
      next.score += 20;
    }
  }

  if (next.health === 0) {
    next.status = 'lost';
    next.reason = 'health';
  } else if (next.status === 'active' && next.turn === TURN_LIMIT) {
    next.status = 'lost';
    next.reason = 'turn-limit';
  }

  return {
    state: next,
    event: {
      mapId: next.mapId,
      turn: next.turn,
      action: direction,
      from: state.position,
      to: next.position,
      outcome,
      score: next.score,
      scoreDelta: next.score - state.score,
      health: next.health,
      healthDelta: next.health - state.health,
      crystalsRemaining: next.crystals.length,
      status: next.status,
      reason: next.reason,
    },
  };
}
