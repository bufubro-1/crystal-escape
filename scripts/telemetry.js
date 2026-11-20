import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectNormalRuns } from '../src/telemetry.js';

const directory = process.argv[2] ?? 'artifacts/bot';
const runs = collectNormalRuns();
await mkdir(directory, { recursive: true });

function jsonLines(records) {
  return records.map((record) => JSON.stringify(record)).join('\n') + '\n';
}

await Promise.all([
  writeFile(join(directory, 'events.jsonl'), jsonLines(runs.flatMap(({ events }) => events))),
  writeFile(join(directory, 'summaries.jsonl'), jsonLines(runs.map(({ events, ...run }) => run))),
]);
console.log(`Wrote ${runs.length} normal traces and summaries to ${directory}`);
