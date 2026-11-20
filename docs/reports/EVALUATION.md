# Telemetry Evaluation

## Reproduction

Run `npm ci`, `npx playwright install chromium`, `npm test`, `npm run bot`, and `npm run evaluate`. The measured environment was CachyOS Linux (x86-64), Node.js 26.13.0, npm 12.2.2, Playwright Test 1.64.1, and Chromium 156.0.8078.4 (Playwright revision 1248).

The suite reports 43 Node cases and 13 Chromium cases. Of the 43 Node cases, 28 cover game rules, five cover the bot and telemetry, and ten cover detector behavior. The six winning browser routes cover Quarry, Crossing, Grotto, Ridge, Spring, and Vault. Both full suite runs passed. The second ran from a clean public clone of implementation commit `e8a2fea78ea316e990f3515165fd4e6c01b2b87f`.

The clean workflow took 28 seconds on the measured connection, including a shallow public clone, `npm ci` with a fresh npm cache, the Chromium installer with an empty browser cache, starting the game and verifying its HTTP response, all tests, bot generation, and evaluation. Chromium used Playwright's Ubuntu 24.04 x64 fallback build on CachyOS. The two runs produced byte-identical event, summary, and score files.

To repeat the cold-cache measurement, set `npm_config_cache` and `PLAYWRIGHT_BROWSERS_PATH` to separate empty directories before cloning. Start the timer before `git clone --depth 1`. Run the README commands, verify the server response at `http://127.0.0.1:4173`, stop the server, and stop the timer after evaluation exits.

The report PDF is built from [REPORT.md](REPORT.md) with [report.css](report.css). With Pandoc and the installed Chromium available, render it from the repository root.

```sh
mkdir -p artifacts/report
pandoc docs/reports/REPORT.md --standalone --embed-resources --css=docs/reports/report.css -o artifacts/report/report.html
npx playwright pdf --paper-format A4 "file://$PWD/artifacts/report/report.html" docs/reports/Crystal_Escape_Report.pdf
```

The first sandboxed Playwright run could not bind the localhost port. Running with loopback access exposed the planned browser test failure before the UI script existed. The first bot test incorrectly assumed two particular seeds would always produce different moves. That assertion was revised to check variation across five seeds per map. A detector test also exposed a grid parity constraint during implementation of the synthetic jump. The injection now permits a bounded return jump. These were setup or implementation findings. Synthetic evaluation labels describe constructed trace changes.

## Bot, features, and split

The bot uses breadth-first search over the current rule state to move toward the closest remaining crystal, then the exit. It tries a route that avoids hazards first. A seeded pseudorandom generator selects a uniformly random direction on 20% of turns, including directions that may be blocked. The fixed action order breaks route ties. All attempts use the same rule module as the browser.

Each attempt produces a JSON Lines record with its run ID, map, seed, turn, action, positions, movement outcome, score, health, signed deltas, remaining crystals, status, and loss reason when applicable. The nine session-level features are total turns, wall or boundary attempts, total health lost, final score, a binary win flag, largest score increase, largest Manhattan movement in one turn, largest one-turn health gain, and longest consecutive wall/boundary streak. The gain feature starts at zero.

| Normal run group | Seeds per map | Maps | Runs | Wins |
| --- | --- | ---: | ---: | ---: |
| Training | 1–50 | 6 | 300 | 273 |
| Calibration | 51–75 | 6 | 150 | 135 |
| Evaluation | 76–100 | 6 | 150 | 141 |

The 600 normal traces contain 17,120 attempts. Split membership is assigned by the seed ranges before fitting. An evaluation source and every altered copy remain in evaluation.

## Models and threshold

For a feature value `x`, the standardized value is `(x − mean) / divisor`. Both the mean and population standard deviation come from the 300 normal training runs. The divisor is the standard deviation, or 1 for a constant feature. In this sample the highest one-turn movement and health gain are constant for all training sessions, so the model still sees changes in either feature.

The 5-NN score is the mean Euclidean distance to the five nearest standardized training runs. The comparison score is the largest absolute standardized feature value. Each method uses the nearest-rank 95th percentile of its own 150 normal calibration scores, the 143rd value after sorting. This fixes an approximately 5% upper-tail allowance on the calibration sample while avoiding a threshold chosen on the synthetic labels. A score must strictly exceed its threshold. Ties at the cutoff can lower the observed alarm rate. Held-out alarm rates can also differ from calibration rates.

## Synthetic changes

The evaluator makes four copies of each held-out normal session and preserves the normal trace. The severity tier cycles by seed from 76 onward, yielding 54 low, 48 middle, and 48 high examples of each type. Altered traces contain 17,605 events. Each scored copy records its source run, map, seed, label, magnitude, and indices of changed turns, including changes in cumulative values and any shifted or removed tail events.

| Label | Magnitudes | Construction |
| --- | --- | --- |
| Score gain | +5, +15, +40 | Increase a crystal score delta and carry the extra points forward |
| Position jump | 2, 3, 5 tiles | Replace one destination and update the following move's origin to rejoin the original route. The following step can also be oversized |
| Health gain | +1, +2, +4 | Change a non-damaging turn to a positive health delta and carry the offset forward |
| Blocked streak | 4, 7, 12 attempts | Insert blocked attempts, replay the action sequence under the rule engine, and stop at the actual terminal turn |

## Held-out results

Both methods scored the same 150 normal and 600 synthetic runs. Counts in the table come from `npm run evaluate`.

| Method | Threshold | True alerts | False alarms | Misses | Correct non-alerts | Precision | Recall | False-alarm rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5-NN | 1.338134 | 449 | 5 | 151 | 145 | 98.90% | 74.83% | 3.33% |
| Maximum standardized deviation | 3.441638 | 300 | 3 | 300 | 147 | 99.01% | 50.00% | 2.00% |

| Type | 5-NN detections | Baseline detections | Low tier, 5-NN / baseline |
| --- | ---: | ---: | --- |
| Score gain | 99/150 | 50/150 | 3/54 and 1/54 |
| Position jump | 100/150 | 50/150 | 4/54 and 1/54 |
| Health gain | 100/150 | 50/150 | 4/54 and 1/54 |
| Blocked streak | 150/150 | 150/150 | 54/54 and 54/54 |

Precision divides true alerts by all alerts. Recall divides true alerts by all synthetic cases. The false-alarm rate divides false alarms by all normal evaluation runs.

### False alarms and misses

Both methods flagged normal Crossing seed 100 (scores 1.820354 and 3.753126). It won at turn 36 with three wall collisions and two legal hazard entries, on turns 7 and 31. The damage and long path are uncommon in training. Both also flagged Spring seed 89, which timed out after six blocked attempts, including three consecutive boundary attempts on turns 14–16. That trace matches the rules and shows how legitimate exploration can resemble the blocked anomaly. The remaining 5-NN alarms were Ridge 81, Ridge 89, and Vault 77. The baseline also flagged Ridge 81.

Both methods missed Quarry seed 76 with +5 score. The first pickup rose from 10 to 15, total score became 55, and the legal +20 exit bonus remained the largest increment. The 5-NN score was 0.853666. Both methods also missed the two-tile jump and +1 health copies of that run. In each case only one previously constant feature moved by one standardized unit, producing 5-NN distance 1.000000. The baseline stayed at 2.166032 in all three copies because the run's seven-turn duration remained its largest standardized deviation.

### Interpretation

On this evaluation set, 5-NN found 149 more synthetic examples at the cost of two more false alarms. It recovered all middle and high tiers. Both methods recovered every inserted blocked streak. Mild score, position, and health changes remained hard to flag at the frozen cutoffs. A turn-level check of exact rule invariants would help diagnose those violations from the raw events.

The open-loop alterations test detection of controlled discrepancies. Their synthetic prevalence is 80%, which inflates measured precision relative to a setting with rarer anomalies at comparable error rates. Each normal source has four variants, so the 750 scored rows are dependent. Every group contains the same six maps and bot policy, limiting what the rates say about new maps, human play, or naturally occurring defects. The blocked-streak manipulation can change the final score and outcome through the turn limit. Those correlated features may make that manipulation easier to detect than a streak of comparable length in ordinary play.
