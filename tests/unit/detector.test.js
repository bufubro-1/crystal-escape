import test from 'node:test';
import assert from 'node:assert/strict';
import { collectNormalRuns, summarize, validateTrace } from '../../src/telemetry.js';
import {
  alertFor, evaluateRuns, fitDetectors, makeAlterations, percentile95, splitRuns,
} from '../../src/detector.js';

const features = (turns, maxHealthGain = 0) => ({
  turns, invalidMoves: 0, damageTaken: 0, finalScore: 50, won: 1,
  maxScoreJump: 20, maxMovement: 1, maxHealthGain, maxInvalidStreak: 0,
});

const normal = collectNormalRuns();

test('D01 assigns 600 distinct map/seed pairs once, with all maps represented in each split', () => {
  const groups = splitRuns(normal);
  assert.deepEqual(Object.values(groups).map((runs) => runs.length), [300, 150, 150]);
  for (const [group, runs] of Object.entries(groups)) {
    const range = { training: [1, 50], calibration: [51, 75], evaluation: [76, 100] }[group];
    assert.equal(new Set(runs.map((run) => run.mapId)).size, 6);
    assert.deepEqual([Math.min(...runs.map((run) => run.seed)), Math.max(...runs.map((run) => run.seed))], range);
  }
  assert.equal(new Set(normal.map(({ mapId, seed }) => `${mapId}-${seed}`)).size, 600);
  assert.throws(() => splitRuns([...normal, { ...normal[0], group: 'evaluation', runId: 'copy' }]), /Duplicate/);
  assert.throws(() => splitRuns([{ ...normal[0], group: 'calibration' }]), /Wrong split/);
});

test('D02 standardizes with the training population SD and uses five nearest points', () => {
  const training = [0, 0, 0, 0, 0, 6].map((turns) => features(turns));
  const model = fitDetectors(training, [features(0), features(2)]);
  const atOrigin = model.score(features(0));
  assert.equal(atOrigin.knn, 0);
  assert.ok(Math.abs(atOrigin.baseline - 1 / Math.sqrt(5)) < 1e-12);

  const scores = model.score(features(2, 3));
  assert.ok(Math.abs(scores.knn - Math.hypot(2 / Math.sqrt(5), 3)) < 1e-12);
  assert.equal(scores.baseline, 3);
});

test('D03 the calibration percentile uses the nearest rank and ignores input order', () => {
  const scores = Array.from({ length: 20 }, (_, index) => 20 - index);
  assert.equal(percentile95(scores), 19);
  assert.equal(scores[0], 20);
});

test('D04 calibrates both method thresholds from normal calibration scores', () => {
  const training = Array.from({ length: 5 }, () => features(0));
  const calibration = Array.from({ length: 20 }, (_, index) => features(index, index === 19 ? 20 : 0));
  const model = fitDetectors(training, calibration);
  assert.deepEqual(model.thresholds, { knn: 18, baseline: 18 });
});

for (const [id, score, expected] of [['D05a', 1.99, false], ['D05b', 2, false], ['D05c', 2.01, true]]) {
  test(`${id} alert for score ${score} with threshold 2 is ${expected}`, () => {
    assert.equal(alertFor(score, 2), expected);
  });
}

test('D06 synthetic copies preserve source events and produce the intended telemetry changes', () => {
  const source = normal.find(({ mapId, seed }) => mapId === 'quarry' && seed === 76);
  const original = structuredClone(source);
  const altered = makeAlterations(source);
  assert.deepEqual(source, original);
  assert.deepEqual(altered.map(({ label }) => label), ['score-gain', 'position-jump', 'health-gain', 'blocked-streak']);

  for (const copy of altered) {
    assert.equal(copy.sourceRunId, source.runId);
    assert.equal(copy.seed, source.seed);
    assert.equal(copy.mapId, source.mapId);
    assert.ok(copy.affectedTurns.length > 0);
    assert.ok(copy.events.every((event) => event.runId === copy.runId));
    validateTrace(copy.events);
    assert.deepEqual(copy.features, summarize(copy.events));
  }
  assert.equal(altered[0].features.finalScore, source.features.finalScore + 5);
  assert.equal(altered[1].features.maxMovement, 2);
  assert.equal(altered[2].features.maxHealthGain, 1);
  assert.ok(altered[3].features.maxInvalidStreak >= 4);
});

test('D07 changing held-out features leaves fitted thresholds fixed and outputs two alerts per run', () => {
  const original = evaluateRuns(normal);
  const altered = normal.map((run) => run.group === 'evaluation' ? {
    ...run, features: { ...run.features, maxHealthGain: 10000 },
  } : run);
  const rerun = evaluateRuns(altered);
  assert.deepEqual(rerun.thresholds, original.thresholds);
  assert.equal(original.scored.length, 750);
  for (const row of rerun.scored.filter(({ label }) => label === 'normal')) {
    assert.deepEqual(row.alerts, { knn: true, baseline: true });
  }
  for (const row of original.scored) {
    for (const method of ['knn', 'baseline']) {
      assert.equal(row.alerts[method], row.scores[method] > original.thresholds[method]);
    }
  }
});

test('D08 all 600 alterations match their intended changes and map/seed provenance', () => {
  const heldOut = splitRuns(normal).evaluation;
  const featureAfter = {
    'score-gain': (source, copy) => copy.features.finalScore === source.features.finalScore + copy.magnitude,
    'position-jump': (source, copy) => copy.features.maxMovement === copy.magnitude,
    'health-gain': (source, copy) => copy.features.maxHealthGain === copy.magnitude,
    'blocked-streak': (source, copy) => copy.features.maxInvalidStreak >= copy.magnitude,
  };

  for (const source of heldOut) {
    for (const copy of makeAlterations(source)) {
      assert.equal(copy.sourceRunId, source.runId);
      assert.equal(copy.mapId, source.mapId);
      assert.equal(copy.seed, source.seed);
      assert.ok(copy.affectedTurns.length > 0, copy.runId);
      assert.ok(featureAfter[copy.label](source, copy), copy.runId);
    }
  }
});
