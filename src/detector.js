import { createGame, destination, DIRECTIONS, step, tileAt } from './game.js';
import { BOARD_SIZE, maps } from './maps.js';
import { FEATURES, SEEDS, summarize, validateTrace } from './telemetry.js';

const methods = ['knn', 'baseline'];
const neighborCount = 5;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function splitRuns(runs) {
  const groups = { training: [], calibration: [], evaluation: [] };
  const seen = new Set();
  for (const run of runs) {
    const pair = JSON.stringify([run.mapId, run.seed]);
    if (seen.has(pair)) throw new Error(`Duplicate map/seed pair: ${pair}`);
    seen.add(pair);
    const split = Object.entries(SEEDS).find(([, [first, last]]) =>
      Number.isInteger(run.seed) && run.seed >= first && run.seed <= last,
    )?.[0];
    if (!split || split !== run.group || !Object.hasOwn(maps, run.mapId)) {
      throw new Error(`Wrong split for ${pair}`);
    }
    groups[split].push(run);
  }
  return groups;
}

export function percentile95(scores) {
  if (!scores.length || scores.some((score) => !Number.isFinite(score))) {
    throw new Error('Calibration requires finite scores');
  }
  const sorted = scores.toSorted((a, b) => a - b);
  return sorted[Math.ceil(0.95 * sorted.length) - 1];
}

export const alertFor = (score, threshold) => score > threshold;

export function fitDetectors(training, calibration) {
  if (training.length < neighborCount) throw new Error('At least five training runs are required');

  function vector(features) {
    return FEATURES.map((name) => {
      const value = features[name];
      if (!Number.isFinite(value)) throw new Error(`Invalid feature: ${name}`);
      return value;
    });
  }

  const vectors = training.map(vector);
  const scaler = Object.freeze(FEATURES.map((feature, index) => {
    const values = vectors.map((row) => row[index]);
    const average = mean(values);
    const deviation = Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
    return Object.freeze({ feature, mean: average, sd: deviation, divisor: deviation || 1 });
  }));
  const standardize = (row) => row.map((value, index) => {
    const { mean: average, divisor } = scaler[index];
    return (value - average) / divisor;
  });
  const reference = vectors.map(standardize);

  function score(features) {
    const row = standardize(vector(features));
    const distances = reference.map((other) =>
      Math.hypot(...row.map((value, index) => value - other[index])),
    );
    distances.sort((a, b) => a - b);
    return {
      knn: mean(distances.slice(0, neighborCount)),
      baseline: Math.max(...row.map(Math.abs)),
    };
  }

  const calibrationScores = calibration.map(score);
  const thresholds = Object.freeze(Object.fromEntries(methods.map((method) =>
    [method, percentile95(calibrationScores.map((scores) => scores[method]))],
  )));
  return { score, thresholds, scaler };
}

function changeCounter(events, valueKey, deltaKey, index, amount) {
  for (const event of events.slice(index)) event[valueKey] += amount;
  events[index][deltaKey] += amount;
}

function injectJump(events, jumpLength, sourceRunId) {
  // A return jump may be necessary to rejoin the original route.
  const distanceTo = (row, col, point) => Math.abs(point.row - row) + Math.abs(point.col - col);
  for (let index = 0; index < events.length - 1; index++) {
    const event = events[index];
    const following = events[index + 1];
    if (event.outcome !== 'moved' || following.outcome !== 'moved') continue;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const returnDistance = distanceTo(row, col, following.to);
        if (distanceTo(row, col, event.from) !== jumpLength ||
            returnDistance === 0 || returnDistance > jumpLength ||
            tileAt(event.mapId, { row, col }) === '#') continue;

        const target = { row, col };
        event.to = target;
        following.from = target;
        return;
      }
    }
  }
  throw new Error(`No trace segment supports a jump of ${jumpLength}: ${sourceRunId}`);
}

function injectBlockedMoves(source, count) {
  const { mapId, events } = source;
  const actions = Object.keys(DIRECTIONS);
  const originalActions = events.map((event) => event.action);
  const insertion = events.findIndex(({ from }) => actions.some((action) => {
    const tile = tileAt(mapId, destination(from, action));
    return tile === undefined || tile === '#';
  }));
  if (insertion === -1) throw new Error(`No position supports blocked moves: ${source.runId}`);
  const blockedAction = actions.find((action) => {
    const tile = tileAt(mapId, destination(events[insertion].from, action));
    return tile === undefined || tile === '#';
  });
  originalActions.splice(insertion, 0, ...Array(count).fill(blockedAction));

  let state = createGame(mapId);
  const altered = [];
  for (const action of originalActions) {
    if (state.status !== 'active') break;
    const next = step(state, action);
    altered.push(next.event);
    state = next.state;
  }
  return altered;
}

function withoutIdentity({ runId, seed, ...event }) {
  return event;
}

export function makeAlterations(source) {
  if (source.group !== 'evaluation') throw new Error('Alterations require a held-out source');
  const tier = (source.seed - SEEDS.evaluation[0]) % 3;
  const variants = {
    'score-gain': [5, 15, 40][tier],
    'position-jump': [2, 3, 5][tier],
    'health-gain': [1, 2, 4][tier],
    'blocked-streak': [4, 7, 12][tier],
  };
  const original = source.events.map(withoutIdentity);

  return Object.entries(variants).map(([label, magnitude]) => {
    let events = structuredClone(original);
    if (label === 'score-gain') {
      const crystal = events.findIndex((event) => event.scoreDelta === 10);
      changeCounter(events, 'score', 'scoreDelta', Math.max(0, crystal), magnitude);
    } else if (label === 'position-jump') {
      injectJump(events, magnitude, source.runId);
    } else if (label === 'health-gain') {
      changeCounter(events, 'health', 'healthDelta', events.findIndex((event) => event.healthDelta === 0), magnitude);
    } else {
      events = injectBlockedMoves(source, magnitude);
    }

    const affectedTurns = Array.from({ length: Math.max(events.length, original.length) }, (_, index) =>
      JSON.stringify(events[index]) === JSON.stringify(original[index]) ? null : index + 1,
    ).filter((turn) => turn !== null);
    const runId = `${source.runId}-${label}`;
    const trace = events.map((event) => ({ runId, seed: source.seed, ...event }));
    validateTrace(trace);
    return {
      group: 'evaluation', runId, sourceRunId: source.runId, mapId: source.mapId, seed: source.seed,
      label, magnitude, affectedTurns, events: trace, features: summarize(trace),
    };
  });
}

function performance(scored, method) {
  const result = { trueAlerts: 0, falseAlarms: 0, missedAnomalies: 0, correctNonAlerts: 0 };
  const byType = {};
  for (const run of scored) {
    const alert = run.alerts[method];
    if (run.label === 'normal') {
      result[alert ? 'falseAlarms' : 'correctNonAlerts']++;
      continue;
    }
    result[alert ? 'trueAlerts' : 'missedAnomalies']++;
    const count = byType[run.label] ??= { detected: 0, total: 0 };
    count.total++;
    count.detected += Number(alert);
  }
  const rate = (success, total) => total ? success / total : null;
  const { trueAlerts, falseAlarms, missedAnomalies, correctNonAlerts } = result;
  return {
    ...result, byType,
    precision: rate(trueAlerts, trueAlerts + falseAlarms),
    recall: rate(trueAlerts, trueAlerts + missedAnomalies),
    falseAlarmRate: rate(falseAlarms, falseAlarms + correctNonAlerts),
  };
}

export function evaluateRuns(runs) {
  const { training, calibration, evaluation } = splitRuns(runs);
  const features = (group) => group.map((run) => run.features);
  const { score, thresholds, scaler } = fitDetectors(features(training), features(calibration));
  const altered = evaluation.flatMap(makeAlterations);
  const scored = [...evaluation, ...altered].map(({ events, ...run }) => {
    const scores = score(run.features);
    return {
      label: 'normal', ...run, scores,
      alerts: Object.fromEntries(methods.map((method) =>
        [method, alertFor(scores[method], thresholds[method])],
      )),
    };
  });

  return {
    thresholds, scaler, altered, scored,
    sizes: { training: training.length, calibration: calibration.length, evaluation: evaluation.length },
    metrics: Object.fromEntries(methods.map((method) => [method, performance(scored, method)])),
  };
}
