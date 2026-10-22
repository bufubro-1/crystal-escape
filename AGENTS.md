# Crystal Escape — Working Instructions

## Project purpose

Crystal Escape is the application under test for CMPE 411 topic 14: a small browser game with a bot that plays it and flags unusual telemetry. The project is judged primarily on test design, automation quality, the AI element, and honest evaluation—not on game size. The course brief is `docs/Project_Brief.pdf`.

## Sources of truth and workflow

1. Use `docs/reports/PROJECT_PLAN.md` for the overall goal, technologies, milestones, and deliverables.
2. Use `docs/reports/DETAILED_PLAN.md` for ordered implementation tasks and their completion criteria. Update the plans when a decision changes, then continue from the affected task.
3. Keep the game small and deterministic enough for repeatable automated tests. Separate game rules from browser rendering so the rules can be tested without a browser.
4. Work in small, reviewable increments. Record actual test and evaluation results; do not mark a task complete solely because code was written.

## Course requirements

- Provide at least 20 automated tests, runnable with one documented command, across at least two levels.
- Apply and explain at least two course test design techniques, tracing tests to written game requirements.
- Implement an AI-based anomaly detector for telemetry produced by a game-playing bot. Document its method, threshold choice, correct detections, missed detections, and false alarms.
- Provide a README that lets a reader install and run the project in under five minutes.
- Submit a repository link and an 8–12 page PDF report that follows the Learn template exactly. Include an AI usage statement and only claim results supported by evidence.

## Language and boundaries

- Write project plans, README, test descriptions, evidence summaries, and report text in English. Conversation with the project owner may be in Turkish.
- Do not start game implementation as part of the documentation setup. Begin implementation from the detailed plan after these planning documents are reviewed.
- Do not add unrelated features, paid services, or a backend unless the project owner changes the plan.
- Keep generated logs, screenshots, and reports clearly distinguished from source files; preserve the commands and seeds needed to reproduce measured results.

## Repository

The public repository is `https://github.com/bufubro-1/crystal-escape`. The default branch is `main`. Do not commit credentials, local caches, dependencies, or transient test artifacts.
