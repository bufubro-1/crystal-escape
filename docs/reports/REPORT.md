---
title: "Crystal Escape"
subtitle: "An empirical evaluation of AI-assisted game telemetry testing"
lang: en
---

**CMPE 411 · AI-Driven Software Testing and Quality Assurance**\
İstanbul Bilgi University · Fall 2026 · Topic 14\
Project repository [bufubro-1/crystal-escape](https://github.com/bufubro-1/crystal-escape)

### Abstract

Crystal Escape is a browser game used to evaluate a test suite and a bot-driven anomaly detector. The game is an 8 × 8 grid with six fixed maps. A player collects three crystals, avoids hazards, and reaches an exit within 40 turns. The same deterministic rules drive the browser and the bot. The suite runs 43 Node tests and 13 Playwright Chromium tests with one command. Equivalence partitioning, boundary value analysis, and state transition testing link the cases to numbered requirements.

A seeded bot generated 600 normal sessions. A five-nearest-neighbor detector and a maximum standardized deviation baseline were fitted on 300 normal sessions and calibrated on another 150. Both scored the same held-out 150 normal sessions and 600 altered copies. The 5-NN detector recovered 449 synthetic cases at 74.83% recall with five false alarms. The baseline recovered 300 at 50.00% recall with three false alarms. Both struggled with small changes in score, position, and health. These results measure detection of constructed trace changes under one bot policy.

| Unit tests | Browser tests | Fixed maps | Scored runs |
| ---: | ---: | ---: | ---: |
| 43 | 13 | 6 | 750 |

## 1. Application under test

Crystal Escape is a turn-based game with deterministic transitions and no backend. Arrow keys and WASD move the player in four directions. The player starts at the selected map's start tile with three health and can win by collecting all three crystals and entering the exit. Blocking, collision, collection, and terminal transitions are visible as differences in position, counters, and outcome text.

The browser renders the board and forwards normalized directional inputs to the rules. The rule module validates a fixture at initialization. It returns the new state together with a structured event per recognized move. The bot calls the same module. For ignored and terminal inputs, the event is null and the state is unchanged.

| Requirement | Observable contract |
| --- | --- |
| R1 | Start or restart with three health, three crystals, no score, and 40 turns available |
| R2–R3 | Recognized movement attempts use one turn. Walls and board edges hold the position. Other keys are ignored |
| R4 | A crystal scores 10 on first entry and disappears |
| R5 | A hazard removes one health on entry. Zero health is a loss |
| R6 | The exit keeps the game active while crystals remain. With all three, exit entry wins and awards 20 |
| R7–R8 | Turn 40 ends active play. A qualifying win takes precedence. Terminal moves have no effect |
| R9 | Each of six validated 8 × 8 fixtures has one start, one exit, and three crystals. All six can be won |
| R10–R12 | Rules are pure, attempted moves produce events, and the browser exposes labeled controls and text counters |

The visual board distinguishes crystals, walls, hazards, the exit, and the player by shape. Status and counters are announced as text. On a narrow screen, the board and controls stack. Reserving the map selector's native keyboard events allows the entire selection and restart flow to be operated from the keyboard.

## 2. Test design and traceability

The case matrix in `docs/reports/TEST_MATRIX.md` records each case's requirement, level, technique, inputs, and expected outcome. The matrix covers three course techniques.

### Equivalence partitioning

R2 and R3 define four classes with distinct effects. One legal move advances the player and the turn count. A wall and the board edge each consume a turn while holding the position. An unrecognized key leaves both unchanged. U02–U05 and B01–B02 use representatives from those classes. U03 starts on a hazard and then tries a blocked move. This catches accidental damage when a collision leaves the player on the same tile.

### Boundary value analysis

R5 uses the health boundary between one and zero. U07 ends with one health and active play. U08 takes the next hit and checks the health loss. R6 uses the crystal boundary at two versus three collected. U09 enters the exit with one crystal remaining and checks continued play. U10 collects all three and checks a total of 50 points. R7 uses turns 39 and 40. U11 reaches the normal loss boundary, U12 wins at turn 40, and U13 checks a health loss coinciding with turn 40.

### State transition testing

The initial state is active. Exit qualification leads from active to won. Zero health and turn exhaustion lead from active to lost. U14a and U14b attempt input in both terminal states and check that no event is emitted. B04 uses a keyboard-driven restart to verify a new active session with fresh counters. B07 exercises winning and restarting on each of the six maps.

| Cases | Technique | Failure caught |
| --- | --- | --- |
| U02–U05, B01–B02 | Equivalence partitioning | Ignored keys use turns, or blocked attempts change position |
| U07–U13, B05–B06 | Boundary values | A premature loss, a missed win, or a wrong loss reason |
| U14–U15, B04, B07 | State transitions | A terminal session accepts movement, or restart keeps old state |

## 3. Automation and repeatability

The Node unit tests exercise pure rules, telemetry, and model logic. The browser tests exercise the served game in Playwright with a fresh browser context for each case. They use roles and labels to read controls and state, and use waiting assertions on the rendered results. The map route fixtures are fixed strings that were derived from the layouts independently of the bot planner. Each browser route wins with three health and a score of 50. The routes take 7, 21, 21, 25, 29, and 25 moves on Quarry, Crossing, Grotto, Ridge, Spring, and Vault respectively.

| Test area | Runner | Cases |
| --- | --- | ---: |
| Pure game rules and map validation | Node test runner | 28 |
| Bot and event summaries | Node test runner | 5 |
| Scoring, thresholds, provenance, and split isolation | Node test runner | 10 |
| Keyboard, counters, restart, end states, and all-map wins | Playwright Chromium | 13 |
| Total | `npm test` | 56 |

The documented workflow uses `npm ci`, `npx playwright install chromium`, `npm start`, `npm test`, `npm run bot`, and `npm run evaluate`. Two one-command runs passed with the same counts. A timed clean public clone with empty npm and Chromium caches took **28 seconds** through the evaluation, including both downloads and an HTTP check of the running game. The measured environment was CachyOS Linux x86-64, Node.js 26.13.0, npm 12.2.2, Playwright Test 1.64.1, and Chromium revision 1248 (156.0.8078.4).

During development, the sandbox initially denied localhost binding. Tests ran with loopback access. A development assertion for seed variation assumed two particular seeds would always choose different moves. The revised test verifies deterministic replay and requires variation across five seeds per map. The final successful runs had zero failures.

## 4. Bot and telemetry

The bot searches from its current position for the nearest remaining crystal. Once all three are collected, it searches for the exit. The search tries paths that avoid hazards before permitting hazard tiles. A seeded random generator independently chooses exploration with probability 0.20 each turn. Exploratory moves select any of the four directions uniformly. This produces varying lengths, blocked attempts, and occasional damage even though the game rules are deterministic.

The event log records the run ID, map, seed, turn, action, positions before and after, movement outcome, score and health with signed deltas, remaining crystals, and terminal status. The log has one row per move attempt. In the 600 normal sessions it contained 17,120 events. Repeated generation produced byte-identical normal and altered log and result files. In the test suite, recorded normal actions are replayed through the rules and their complete events are checked.

The detector uses nine session features. The behavioral features are turn count, invalid attempts, total damage, final score, and a binary win flag. The four extreme-value features are largest score jump, largest one-turn Manhattan movement, largest one-turn positive health change, and longest invalid streak. Manhattan movement is the sum of absolute row and column differences. Health gain defaults to zero if no positive delta occurs.

| Split | Seeds per map | Number of maps | Normal sessions | Wins |
| --- | --- | ---: | ---: | ---: |
| Training | 1–50 | 6 | 300 | 273 |
| Calibration | 51–75 | 6 | 150 | 135 |
| Evaluation | 76–100 | 6 | 150 | 141 |

The seed ranges assign each map and seed to exactly one split before fitting. Each altered copy inherits its source map and seed and stays in evaluation. An automated split test rejects duplicate pairs. Another verifies that changing held-out feature values leaves both fitted thresholds unchanged.

## 5. Detector and validation protocol

Both methods standardize each feature by subtracting its normal training mean and dividing by its population standard deviation. When a feature is constant in training, the divisor is one. This avoids division by zero and preserves a measurable change in features such as one-turn movement and health gain.

The 5-NN method scores a session using the mean Euclidean distance to the five closest standardized training sessions. The comparison baseline takes the maximum absolute standardized feature deviation. It measures how unusual a single feature is relative to normal training. The 5-NN method additionally reflects whether the combination of features has close precedents in training.

The cutoff for each method is the nearest-rank 95th percentile of its 150 normal calibration scores. This picks the 143rd sorted value, allowing a small upper tail of normal calibration scores. A score must be strictly greater than the frozen cutoff to alert. This rule handles ties at the threshold and can be chosen without using the synthetic evaluation labels.

Each held-out session generated one labeled copy per anomaly family. Severity cycles by seed. There are 54 low, 48 middle, and 48 high cases of each family. The original normal sessions and the altered traces are available through separate generated outputs. Each copied run has source identity, label, magnitude, and an affected-turn list.

| Alteration | Magnitudes | Injection |
| --- | --- | --- |
| Unexpected score gain | +5, +15, +40 | Increase a crystal award and carry the offset forward |
| Impossible position jump | 2, 3, 5 tiles | Change one move's destination and rejoin the original route on the next move |
| Unexpected health gain | +1, +2, +4 | Raise health on a non-damaging turn and carry the offset forward |
| Prolonged blocked play | 4, 7, 12 attempts | Insert invalid moves, replay under the rules, and respect terminal conditions |

Tests check standardized scores against hand-computed values, thresholds below, equal to, and above the cutoff, alert fields, and the intended changes and provenance for all 600 copies.

## 6. Results

Both methods scored the same 750 examples. Precision is true alerts divided by all alerts. Recall is true alerts divided by all 600 altered cases. The false-alarm rate is false alerts divided by all 150 normal evaluation sessions.

| Method | Threshold | True alerts | False alarms | Misses | Correct non-alerts |
| --- | ---: | ---: | ---: | ---: | ---: |
| Five nearest neighbors | 1.338134 | 449 | 5 | 151 | 145 |
| Maximum standardized deviation | 3.441638 | 300 | 3 | 300 | 147 |

| Method | Precision | Recall | False-alarm rate |
| --- | ---: | ---: | ---: |
| Five nearest neighbors | 98.90% | 74.83% | 3.33% |
| Maximum standardized deviation | 99.01% | 50.00% | 2.00% |

| Synthetic alteration | 5-NN | Baseline | Low tier, 5-NN | Low tier, baseline |
| --- | ---: | ---: | ---: | ---: |
| Score gain | 99/150 | 50/150 | 3/54 | 1/54 |
| Position jump | 100/150 | 50/150 | 4/54 | 1/54 |
| Health gain | 100/150 | 50/150 | 4/54 | 1/54 |
| Blocked streak | 150/150 | 150/150 | 54/54 | 54/54 |

The 5-NN method found 149 additional altered cases and produced two additional false alarms. It detected all middle and high tiers. The baseline also detected all high-tier cases and each blocked streak. Most small score, movement, and health violations passed below both cutoffs. The underlying output is reproducible as `artifacts/evaluation/metrics.json` and `scores.jsonl`.

## 7. Error analysis

### Normal runs flagged by the detectors

Both methods flagged Crossing seed 100. Its two scores were 1.820354 and 3.753126, above the respective cutoffs. The bot won after 36 turns, with three wall collisions and two legal hazard entries. Crossing's events show the damage on turns 7 and 31. Common training runs took less damage. The combination of a long session, damage, and blocked attempts also moved the run away from nearby reference sessions.

Both methods flagged Spring seed 89. Its six invalid moves included three consecutive boundary attempts on turns 14–16. It timed out at move 40. The detector correctly identified unusual behavior relative to training, and the evaluation counted it as a false alarm because the unaltered trace obeyed the rules. The other 5-NN false alarms were Ridge 81, Ridge 89, and Vault 77. The baseline also flagged Ridge 81.

### Altered runs below the cutoffs

Quarry seed 76 completed a seven-move route with score 50. Adding five points to its first crystal increased that event from 10 to 15 and its final score to 55. The exit bonus still had the largest increment at 20. The 5-NN score was 0.853666, so the feature change was too small at its cutoff.

The position and health copies of the same run also passed below both thresholds. Their 5-NN scores were each 1.000000. In each case a single constant training feature changed by one standardized unit. The baseline stayed at 2.166032 in all three copies because the short run duration remained its most extreme standardized value.

| Quarry seed 76 alteration | 5-NN score | Baseline score | Outcome |
| --- | ---: | ---: | --- |
| +5 score | 0.853666 | 2.166032 | Miss by both |
| Two-tile movement | 1.000000 | 2.166032 | Miss by both |
| +1 health | 1.000000 | 2.166032 | Miss by both |

## 8. Limitations and AI usage

The evaluation isolates the fitting process from held-out pairs, but all groups use the same six maps and bot policy. It does not measure generalization to new maps, different game rules, or human play. The synthetic cases share sources, so the scored rows are dependent. Four out of every five scored runs are altered. Precision would usually be lower when anomalies are rare at comparable error rates.

The blocked-streak injection can also change the final score, duration, and win flag. Both models may be using those effects as well as the streak feature. Aggregation discards the order and exact cause of many events. The Quarry score miss illustrates how a legitimate exit bonus can hide the largest individual illegal pickup increase. An exact per-turn rule check is a direct way to diagnose illegal movement, positive health, or incorrect awards in these traces. Prolonged blocked play is possible under the rules, so a detector alert for a long streak still needs context.

The main qualitative result is that 5-NN provided wider coverage at a small increase in false alarms for the measured distribution. Rare but valid play generated alerts. Small synthetic rule violations often did not. The experiments only support conclusions about the recorded telemetry and injected changes.

### AI usage statement

OpenAI Codex assisted in drafting game, bot, and detector code, suggesting and implementing tests, writing the synthetic alteration code, and drafting the documentation and report. Assertions were checked against written requirements and fixed routes. The repository records which test suggestions were retained, revised, or rejected. All reported counts were produced by running the local suite and evaluator. The detector itself fits numerical telemetry locally and does not call an LLM or an external service.

### References and reproducible evidence

- CMPE 411, *Term Project Brief*, İstanbul Bilgi University, Fall 2026.
- Crystal Escape repository, [requirements, test matrix, and evaluation notes](https://github.com/bufubro-1/crystal-escape/tree/main/docs/reports).
- Microsoft, [Playwright browser installation documentation](https://playwright.dev/docs/browsers).
