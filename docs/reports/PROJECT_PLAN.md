# Crystal Escape — Project Plan

## Objective

Build a small, turn-based browser game and use it as the application under test for CMPE 411 topic 14. A bot will play repeatable sessions; an anomaly detector will inspect the resulting telemetry. The final work must explain where the detector helped, where it failed, and how those conclusions were measured. The public repository is [bufubro-1/crystal-escape](https://github.com/bufubro-1/crystal-escape).

The game is a means to test and evaluate an AI-assisted test suite. The implementation will stay compact so the rules, tests, and detector can be explained in the final report.

## Product and testing approach

- **Game:** An 8 × 8 grid. The player collects three crystals and reaches the exit while avoiding walls and hazards under a turn limit. Each move has explicit, testable effects on position, score, health, and game state. A small set of fixed, solvable maps supports repeatable sessions.
- **Test levels:** Unit tests for pure game rules, bot and telemetry logic; browser end-to-end tests for visible controls, state, and outcomes. The final suite will contain at least 20 independent automated tests and run with `npm test`.
- **Test design:** Equivalence partitioning and boundary value analysis will cover movement, collection, health, and turn limits. State transition testing will cover start, active play, win, and loss. A requirements-to-tests matrix will make the techniques visible.
- **AI element:** A bot generates normal play traces. A lightweight unsupervised k-nearest-neighbor anomaly detector scores per-session telemetry. Its threshold will be calibrated on normal sessions and evaluated on separate normal and deliberately altered traces. Report both false alarms and missed anomalies; do not present injected faults as naturally discovered bugs.

## Technologies

| Area | Choice | Reason |
| --- | --- | --- |
| Browser game | HTML, CSS, and JavaScript modules | Small static app with no backend or build step. |
| Rule and bot tests | Node.js built-in test runner | Tests pure logic without browser timing. |
| Browser tests | Playwright Test with Chromium | Automates real keyboard interaction and visible outcomes. |
| Bot and detector | JavaScript running in Node.js | One language and reproducible seeded runs. |
| Telemetry and evidence | JSON Lines plus Markdown summaries | Easy to inspect, reproduce, and cite in the report. |
| Repository | GitHub, `main` branch | Required code hand-in and history of progress. |

Pin dependencies in a lockfile. Document setup, the single test command, and reproducible evaluation commands in an English README. The test and evaluation scripts must work without a paid API or network service after installation.

## Deliverables and milestones

| Due date (Europe/Istanbul) | Deliverable | Evidence of completion |
| --- | --- | --- |
| 30 October 2026, 23:59 | One-paragraph testing plan submitted on Learn | Scope, tools, and test levels stated in one paragraph. |
| 20 November 2026, Lab 3 | Running game and test suite | At least 10 automated tests demonstrated in the lab. |
| 11 December 2026, 23:59 | Final repository link and report PDF | At least 20 one-command tests, two levels, two design techniques, AI evaluation, README, and 8–12 page report in the Learn template. |

The final report and other written project artifacts will be in English. The report template and example are on Learn and must be obtained before report assembly. AI assistance used in code, tests, data, or writing must be declared in the report.

## Main risks and controls

- **Unstable tests:** Keep game transitions deterministic, use fixed map fixtures and seeds, and avoid arbitrary browser sleeps.
- **Weak AI evaluation:** Separate normal training, calibration, and evaluation data. Preserve seeds and labels; include false alarms, misses, and representative traces.
- **Scope growth:** Finish the minimum game and two test levels before presentation polish. Add features only when they improve a stated requirement or test scenario.
- **Template dependency:** Collect figures and results throughout the project, then fit them into the exact Learn report template when available.

The ordered work and completion criteria are in [DETAILED_PLAN.md](DETAILED_PLAN.md). The course brief is available locally at `docs/Project_Brief.pdf`.
