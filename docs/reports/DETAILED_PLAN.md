# Crystal Escape — Detailed Plan

This is the execution checklist for the [project plan](PROJECT_PLAN.md). Complete sections in order unless a task explicitly states that it can proceed in parallel. Update a task's status only after its completion criteria have been checked. Keep actual commands, test counts, and evaluation numbers in the repository rather than inventing results in this plan.

## 0. Planning and repository foundation

- [x] Confirm this plan and the project plan against the course brief and lecture announcements. Use the Learn report template if published.
- [x] Place the planning documents in the public `bufubro-1/crystal-escape` repository on `main`, then add an English README with the project's purpose, setup, and commands as those commands become available.
- [ ] Write and submit the one-paragraph testing plan by 30 October. It must state the game scope, unit and browser test levels, tools, and anomaly evaluation approach.

The course brief and Week 6 and Week 9 announcements were reviewed. Week 9 explicitly canceled the Lab 3 project check and confirmed the final deadline and Learn form. The [testing paragraph](TESTING_PLAN.md) is ready. Submission by 30 October has no available receipt. The project owner confirmed that no final-report template file was available and will handle the Learn submissions.

**Done when:** The repository contains the agreed planning documents and the plan paragraph is ready for the Learn submission. Use the official report template if it becomes available.

## 1. Define the game contract

- [x] Write numbered requirements (R1, R2, …) for controls, movement, scoring, hazards, win/loss rules, and telemetry. Create six handcrafted, solvable 8 × 8 map fixtures, each with a start, exit, exactly three crystals, walls, and hazards. Map cells cannot have conflicting contents.
- [x] Use these baseline rules: arrow keys or WASD attempt four-directional movement; each recognized move attempt consumes one turn, while other keys are ignored; blocked or out-of-bounds attempts leave position unchanged; first entry onto a crystal adds 10 points and removes it; entering a hazard removes one health; the player starts with three health; reaching the exit after all crystals are collected wins and adds 20 points; zero health or 40 turns ends the session in a loss. Reaching the exit early leaves play active. A valid win on turn 40 takes precedence over the turn-limit loss. No input changes a terminal game state.
- [x] Define a pure game interface: `createGame(mapId)` returns initial state; `step(state, direction)` returns a new state and turn event without mutating its input. Validate map fixtures before a session starts. State and events must expose enough information for tests and telemetry without exposing browser details.

**Done when:** A reader can predict the outcome of any move from the written rules, and every rule has a requirement ID. Map fixtures are known to be solvable.

## 2. Implement the smallest playable game

- [x] Build the rule module and fixed maps first; keep browser rendering and input handling separate.
- [x] Build a responsive single-page UI with a visible grid, score, health, turns remaining, crystal count, instructions, restart control, and distinct win/loss messages. Support arrow keys and WASD; prevent arrow keys from scrolling during play.
- [x] Expose stable labels or test IDs for important controls and status. Make the game playable with keyboard alone and show state changes in text as well as color.

**Done when:** Every map can be played and restarted in a browser, and the displayed status matches the rule state after each action.

## 3. Design and automate the core tests

- [x] Create a requirements-to-tests matrix with the requirement ID, test level, design technique, input, and expected result for each case. Cover legal moves, blocked moves, out-of-bounds moves, and ignored keys as equivalence partitions. Test the boundaries at two and three collected crystals, one and zero health, and turns 39 and 40. Cover active play, wins, losses, and ignored input in terminal states through state transition tests.
- [x] Add at least 14 Node unit tests for initialization, movement, blocked moves, collection once, score, hazards, exit gating, both loss conditions, restart state, terminal input, map validation, and immutability. Test both a valid win on turn 40 and a turn-limit loss when the win condition is unmet. Parameterize cases where it improves clarity, and count the cases the runner reports independently.
- [x] Add at least 6 Playwright browser tests for keyboard movement, counters, blocked movement, collection, restart, win, and loss across fixed maps. Start each test in a fresh browser context with deterministic game setup. Prefer accessible role or label locators and use test IDs where needed. Rely on Playwright's waiting assertions for visible outcomes.
- [x] Derive expected results from the written game requirements. If AI suggests tests, verify their assertions against those requirements and record which suggestions were kept, revised, or rejected and why.
- [x] Wire `npm test` to run both levels with one command. Pin Playwright and its browser setup in the README and run the suite twice to check repeatability.

See the [requirements-to-tests matrix](TEST_MATRIX.md) and [measured results](EVALUATION.md).

**Done when:** At least 20 automated tests pass from one command, two levels are visible, and the matrix shows at least two correctly applied design techniques.

## 4. Build the bot and telemetry pipeline

- [x] Implement a seeded bot that reads the same rule state as the UI. It should plan toward remaining crystals and then the exit, avoid known walls and hazards where possible, and allow seeded exploratory moves so normal sessions vary reproducibly.
- [x] Run the bot across fixed map/seed combinations. Log one event per attempted move as JSON Lines with run ID, map ID, seed, turn, action, position before/after, score and health changes, crystals remaining, and terminal status.
- [x] Summarize each run using total turns, invalid moves, damage taken, final score, win flag, largest score jump, largest one-turn movement, largest one-turn health gain, and longest streak of blocked or out-of-bounds moves. Use zero for health gain when health never increases. Check that normal events agree with the game state and that replaying the same map and seed reproduces the gameplay events.

**Done when:** A documented command creates reproducible traces and summaries for multiple maps and seeds. Bot and telemetry tests cover deterministic replay and feature extraction.

## 5. Implement and test anomaly detection

- [x] Implement a small unsupervised k-nearest-neighbor detector in JavaScript. Standardize each feature using the normal training mean and standard deviation, using a divisor of one for constant features. Score a run by the mean Euclidean distance to its five nearest normal training runs. Use the largest absolute standardized feature value as the score for a simple comparison method.
- [x] Assign each map and seed pair to exactly one group before scoring runs. Use normal sessions for training and calibration and reserve held-out sessions for evaluation. For each method, freeze its threshold at the 95th percentile of normal calibration scores before evaluation. Raise an alert when a score exceeds that method's threshold.
- [x] Create labeled evaluation copies with unexpected score gain, impossible position jumps, unexpected health gain, or prolonged blocked play. Preserve the original traces and record the source map, seed, anomaly type, and affected turns for each altered copy. Check that the copies retain the telemetry format and represent the intended changes. Add tests for feature calculation, split isolation, both scoring methods, scores below, at, and above the threshold, and alert output.

**Done when:** Documented commands reproduce scores and alerts for both methods, and tests verify that evaluation sessions are excluded from training and calibration.

## 6. Evaluate and report honestly

- [x] Evaluate both methods on the same held-out normal sessions and altered copies. Report true alerts, false alarms, missed anomalies, correct non-alerts, precision, recall, and false-alarm rate for each method. Report detections out of the total cases for each anomaly type. Inspect examples of false alarms and missed anomalies when they occur, explain likely causes, and discuss the limits of synthetic evaluation traces.
- [x] Record test count, commands, versions, seeds, map coverage, and any failures. Keep compact result tables or figures that can be placed in the report. Do not claim a game defect unless it was observed in the actual game.
- [x] Complete an English README that gets a fresh reader from installation to running the game, all tests, and detector evaluation in under five minutes. Time the documented workflow from a clean checkout.
- [x] Prepare an English 8–12 page PDF. Use the exact Learn report template if published. Trace game requirements to test techniques and cases. Explain the detector and comparison method, the reason for the calibration percentile, measured results, false alarms, misses, and limitations. Include an AI usage statement and be prepared to explain the code, tests, and evaluation if the instructor requests a walkthrough.
- [ ] Verify the README commands and reported results against the final commit pushed to the public repository. The instructor grades the last commit before the deadline. Submit the repository link and PDF by 11 December 2026 at 23:59 (Europe/Istanbul) through the form shared on Learn.

The [nine-page English report](Crystal_Escape_Report.pdf) uses a project layout because no Learn template file was available. The project owner handles the Learn submission.

**Done when:** The README workflow runs in under five minutes from a clean checkout, the final one-command suite has at least 20 passing tests at two levels, the PDF reports evidence from the final commit and follows the Learn template if supplied, and both deliverables are submitted before the deadline.
