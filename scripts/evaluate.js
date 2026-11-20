import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { evaluateRuns } from '../src/detector.js';
import { collectNormalRuns } from '../src/telemetry.js';

const directory = process.argv[2] ?? 'artifacts/evaluation';
const { altered, scored, ...results } = evaluateRuns(collectNormalRuns());
const { sizes, thresholds, metrics } = results;
const names = { knn: '5-NN', baseline: 'Maximum standardized deviation' };
const percent = (value) => value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
const number = (value) => value.toFixed(6);
const methods = Object.keys(names);

const lines = [
  '# Crystal Escape Evaluation',
  '',
  `Normal runs in training, calibration, and evaluation numbered ${sizes.training}, ${sizes.calibration}, and ${sizes.evaluation} respectively. The held-out set also contained ${altered.length} labeled alterations.`,
  '',
  '| Method | Threshold | True alerts | False alarms | Misses | Correct non-alerts | Precision | Recall | False-alarm rate |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
];

for (const method of methods) {
  const row = metrics[method];
  lines.push(`| ${names[method]} | ${number(thresholds[method])} | ${row.trueAlerts} | ${row.falseAlarms} | ${row.missedAnomalies} | ${row.correctNonAlerts} | ${percent(row.precision)} | ${percent(row.recall)} | ${percent(row.falseAlarmRate)} |`);
}

lines.push('', '| Synthetic alteration | 5-NN alerts | Maximum deviation alerts |',
  '| --- | ---: | ---: |');
for (const [label, tally] of Object.entries(metrics.knn.byType)) {
  lines.push(`| ${label} | ${tally.detected}/${tally.total} | ${metrics.baseline.byType[label].detected}/${metrics.baseline.byType[label].total} |`);
}

lines.push('', '## First false alarm and first missed example per type', '',
  '| Method | Case | Run ID | Score |', '| --- | --- | --- | ---: |');
for (const method of methods) {
  const falseAlarm = scored.find((run) => run.label === 'normal' && run.alerts[method]);
  if (falseAlarm) lines.push(`| ${names[method]} | False alarm | ${falseAlarm.runId} | ${number(falseAlarm.scores[method])} |`);
  for (const label of Object.keys(metrics[method].byType)) {
    const miss = scored.find((run) => run.label === label && !run.alerts[method]);
    if (miss) lines.push(`| ${names[method]} | Missed ${label} | ${miss.runId} | ${number(miss.scores[method])} |`);
  }
}

function jsonLines(records) {
  return records.map((record) => JSON.stringify(record)).join('\n') + '\n';
}

await mkdir(directory, { recursive: true });
await Promise.all([
  writeFile(join(directory, 'metrics.json'), JSON.stringify(results, null, 2) + '\n'),
  writeFile(join(directory, 'summary.md'), lines.join('\n') + '\n'),
  writeFile(join(directory, 'scores.jsonl'), jsonLines(scored)),
  writeFile(join(directory, 'altered-events.jsonl'), jsonLines(altered.flatMap(({ events }) => events))),
]);

console.log(`Scored ${scored.length} evaluation runs. Results are in ${directory}.`);
