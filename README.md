# Crystal Escape

Crystal Escape is an 8 × 8, turn-based browser game for CMPE 411 topic 14. A seeded bot plays six fixed maps, and two detectors score its telemetry for unusual runs.

## Run locally

Install Node.js 24 or later with npm and Git. On Linux, Chromium also needs its system libraries. See the [Playwright browser installation instructions](https://playwright.dev/docs/browsers#install-system-dependencies) if Chromium reports missing libraries.

```sh
git clone https://github.com/bufubro-1/crystal-escape.git
cd crystal-escape
npm ci
npx playwright install chromium
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). Move with the arrow keys or WASD, collect all three crystals, and reach the exit before your health or 40-turn budget runs out. Use the map selector or Restart to start a fresh session. Stop the game server with Ctrl+C before running the tests in the same terminal.

## Run the tests and evaluation

```sh
npm test
npm run bot
npm run evaluate
```

`npm test` runs the Node rule, telemetry, and detector cases and the Playwright Chromium cases. The browser suite starts its own local game server. The lockfile pins Playwright Test 1.64.1 and its compatible Chromium revision 1248 (156.0.8078.4). After setup, these commands run locally without an external service.

`npm run bot` writes normal events and summaries as JSON Lines under `artifacts/bot/`. `npm run evaluate` deterministically regenerates the same normal runs, fits the models using the training and calibration groups, and writes `metrics.json`, `summary.md`, `scores.jsonl`, and `altered-events.jsonl` under `artifacts/evaluation/`. Generated artifacts are ignored by Git. Append `-- <output-directory>` to either command to select a different directory.

The evaluation assigns seeds 1–50 to training, 51–75 to calibration, and 76–100 to evaluation separately on each map. It compares 5-nearest-neighbor distance with maximum standardized deviation at separate 95th-percentile calibration thresholds.

## Project evidence

- [Game requirements](docs/reports/GAME_REQUIREMENTS.md)
- [Requirements-to-tests matrix and AI-assisted test decisions](docs/reports/TEST_MATRIX.md)
- [Evaluation method and measured results](docs/reports/EVALUATION.md)
- [Final report (PDF)](docs/reports/Crystal_Escape_Report.pdf) and [editable report source](docs/reports/REPORT.md)
- [Project plan](docs/reports/PROJECT_PLAN.md) and [execution checklist](docs/reports/DETAILED_PLAN.md)
