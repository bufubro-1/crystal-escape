# Crystal Escape — Detailed Plan

This is the execution checklist for the [project plan](PROJECT_PLAN.md). Complete sections in order unless a task explicitly states that it can proceed in parallel. Update a task's status only after its completion criteria have been checked. Keep actual commands, test counts, and evaluation numbers in the repository rather than inventing results in this plan.

## 0. Planning and repository foundation

- [ ] Confirm this plan and the project plan against `docs/Project_Brief.pdf`; obtain the Learn report template when available.
- [ ] Place the planning documents in the public `bufubro-1/crystal-escape` repository on `main`, then add an English README with the project's purpose, setup, and commands as those commands become available.
- [ ] Write and submit the one-paragraph testing plan by 30 October. It must state the game scope, unit and browser test levels, tools, and anomaly evaluation approach.

**Done when:** The repository contains the agreed planning documents and the plan paragraph is ready for the Learn submission. The report template is tracked as an external dependency until supplied.

## 1. Define the game contract

- [ ] Write numbered requirements (R1, R2, …) for controls, movement, scoring, hazards, win/loss rules, and telemetry. Create six handcrafted, solvable 8 × 8 map fixtures, each with a start, exit, exactly three crystals, walls, and hazards. Map cells cannot have conflicting contents.
- [ ] Use these baseline rules: arrow keys or WASD attempt four-directional movement; each recognized move attempt consumes one turn, while other keys are ignored; blocked or out-of-bounds attempts leave position unchanged; first entry onto a crystal adds 10 points and removes it; entering a hazard removes one health; the player starts with three health; reaching the exit after all crystals are collected wins and adds 20 points; zero health or 40 turns ends the session in a loss. Reaching the exit early leaves play active. A valid win on turn 40 takes precedence over the turn-limit loss. No input changes a terminal game state.
- [ ] Define a pure game interface: `createGame(mapId)` returns initial state; `step(state, direction)` returns a new state and turn event without mutating its input. Validate map fixtures before a session starts. State and events must expose enough information for tests and telemetry without exposing browser details.

**Done when:** A reader can predict the outcome of any move from the written rules, and every rule has a requirement ID. Map fixtures are known to be solvable.

## 2. Implement the smallest playable game

- [ ] Build the rule module and fixed maps first; keep browser rendering and input handling separate.
- [ ] Build a responsive single-page UI with a visible grid, score, health, turns remaining, crystal count, instructions, restart control, and distinct win/loss messages. Support arrow keys and WASD; prevent arrow keys from scrolling during play.
- [ ] Expose stable labels or test IDs for important controls and status. Make the game playable with keyboard alone and show state changes in text as well as color.

**Done when:** Every map can be played and restarted in a browser, and the displayed status matches the rule state after each action.

## 3. Design and automate the core tests

- [ ] Create a requirements-to-tests matrix with the test level and design technique for each case. Use equivalence partitions for legal, blocked, out-of-bounds, and terminal inputs; boundary values for crystal count, health, and turn 39/40; state transitions for active, win, and loss.
- [ ] Add at least 14 Node unit tests for initialization, movement, blocked moves, collection once, score, hazards, exit gating, both loss conditions, restart state, terminal input, map validation, and immutability. Parameterize cases where it improves clarity, but count actual independently reported cases.
- [ ] Add at least 6 Playwright browser tests for keyboard movement, counters, blocked movement, collection, restart, win, and loss across fixed maps. Use deterministic setup or a documented test map selection; avoid time-based waits.
- [ ] Wire `npm test` to run both levels with one command. Pin Playwright and its browser setup in the README; run the suite twice to check repeatability.

**Done when:** At least 20 automated tests pass from one command, two levels are visible, and the matrix shows at least two correctly applied design techniques. At least 10 running tests must be ready for the 20 November lab.

## 4. Build the bot and telemetry pipeline

- [ ] Implement a seeded bot that reads the same rule state as the UI. It should plan toward remaining crystals and then the exit, avoid known walls and hazards where possible, and allow seeded exploratory moves so normal sessions vary reproducibly.
- [ ] Run the bot across fixed map/seed combinations. Log one event per attempted move as JSON Lines with run ID, map ID, seed, turn, action, position before/after, score and health changes, crystals remaining, and terminal status.
- [ ] Summarize each run into numeric features: total turns, invalid moves, damage taken, final score, win flag, largest score jump, and largest one-turn movement. Validate that logged events agree with the game state and that identical seeds yield identical traces.

**Done when:** A documented command creates reproducible traces and summaries for multiple maps and seeds. Bot and telemetry tests cover deterministic replay and feature extraction.

## 5. Implement and test anomaly detection

- [ ] Implement a small unsupervised k-nearest-neighbor detector in JavaScript. Scale numeric features using statistics from normal training runs only; handle constant features safely. Score a run by its mean distance to its five nearest normal training runs.
- [ ] Use disjoint seeded sessions for normal training, normal threshold calibration, and normal evaluation. Set the alert threshold to the 95th percentile of calibration scores; freeze it before evaluation.
- [ ] Build an evaluation-only trace alteration tool with labeled cases: unexpected score gain, impossible position jump, unexpected health gain, and prolonged blocked play. Keep original traces and altered copies separate. Add tests for feature calculation, split isolation, scoring, thresholding, and alert output.

**Done when:** The detector and evaluation tools run from documented commands, produce reproducible alert records, and do not use evaluation labels to set the threshold.

## 6. Evaluate and report honestly

- [ ] Evaluate on held-out normal and altered sessions. Record the number of true alerts, false alarms, missed anomalies, and correct non-alerts for each anomaly type. Inspect examples of both false alarms and misses; explain likely causes and limits of injected telemetry.
- [ ] Record test count, commands, versions, seeds, map coverage, and any failures. Keep compact result tables or figures that can be placed in the report. Do not claim a game defect unless it was observed in the actual game.
- [ ] Complete an English README that gets a fresh reader from installation to running the game, all tests, and detector evaluation in under five minutes, excluding network download time where necessary. Verify the steps from a clean checkout.
- [ ] Use the exact Learn report template for an English 8–12 page PDF. Trace game requirements to test techniques and cases; explain the anomaly method, threshold, evidence, false alarms, misses, limitations, and AI tool usage statement. Submit the repository link and PDF by 11 December.

**Done when:** The README commands work, the final one-command suite has at least 20 passing tests at two levels, all required evaluation evidence exists, and the report follows the supplied template.
