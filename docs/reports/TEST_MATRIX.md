# Requirements-to-Tests Matrix

Equivalence partitioning separates movement attempts into legal steps, wall collisions, out-of-bounds attempts, and ignored keys. Boundary value analysis checks the nearest discrete values on either side of the requirements for exiting, losing all health, and reaching the turn limit. State transition tests exercise the active, won, and lost states and verify that terminal moves leave state unchanged while restart creates a new active session.

EP = equivalence partitioning, BVA = boundary value analysis, ST = state transition testing, and CI = contract invariant.

| Case | Requirement | Level | Technique | Input | Expected result |
| --- | --- | --- | --- | --- | --- |
| U01 | R1 | Unit | ST | Create Quarry | Position (0,0), 0 score, 3 health, 0 turns, 3 crystals, active |
| U02 | R2 | Unit | EP | Right from Quarry start | Move to (0,1) and use one turn |
| U03 | R3, R5 | Unit | EP | Down onto Quarry hazard, then right into wall | Remain at (1,0) with 2 health after two turns |
| U04 | R3 | Unit | EP | Up from Quarry start | Remain at (0,0) after one turn |
| U05a | R2, R10 | Unit | EP | Pass `space` as direction | Same state, null event |
| U05b | R2, R10 | Unit | EP | Pass `toString` as direction | Same state, null event |
| U06 | R4 | Unit | ST | Right, left, right on Quarry | First entry removes one crystal and scores 10. Re-entry keeps score at 10 |
| U07 | R5 | Unit | BVA, ST | Enter the Quarry hazard twice | Health 1, active |
| U08 | R5 | Unit | BVA, ST | Enter the Quarry hazard three times | Health 0, lost by health |
| U09 | R6 | Unit | BVA, ST | Collect two Quarry crystals and bypass the third en route to the exit | One crystal remains, score 20, active at exit |
| U10 | R6 | Unit | BVA, ST | Collect all three Quarry crystals and enter exit | Zero crystals, score 50, won |
| U11 | R7 | Unit | BVA, ST | Blocked moves 39 and 40 | Active on 39, lost by turn limit on 40 |
| U12 | R6, R7 | Unit | BVA, ST | 33 blocked moves, then seven right moves | Valid win on turn 40, score 50 |
| U13 | R5, R7 | Unit | BVA, ST | 35 blocked moves, then reach zero health on move 40 | Lost by health on turn 40 |
| U14a | R8, R10 | Unit | ST | Move in a won game | Same state, null event |
| U14b | R8, R10 | Unit | ST | Move in a lost game | Same state, null event |
| U15 | R1, R10 | Unit | ST | Create again after movement, collection, and damage | Fresh counters and crystals with the original values |
| U16 | R10 | Unit | CI | Apply a collecting move to frozen state | New state with collected crystal. Previous state retains its values |
| U17 | R9 | Unit | EP | Create map ID `toString` | Unknown map error |
| U18a | R9 | Unit | EP | Pass seven map rows | Invalid map error |
| U18b | R9 | Unit | EP | Pass a nine-column row | Invalid map error |
| U18c | R9 | Unit | EP | Pass an unsupported tile | Invalid map error |
| U18d | R9 | Unit | EP | Pass two crystals | Invalid map error |
| U18e | R9 | Unit | EP | Pass zero exits | Invalid map error |
| U18f | R9 | Unit | EP | Pass two starts | Invalid map error |
| U18g | R9 | Unit | EP | Pass zero hazard tiles | Invalid map error |
| U18h | R9 | Unit | EP | Pass zero wall tiles | Invalid map error |
| U19 | R11 | Unit | CI | Step down onto the Quarry hazard | One event with the exact coordinates, health delta of −1, and unchanged score |
| B01 | R2, R12 | Browser | EP | Right arrow and uppercase D on Quarry | Row 1, column 3 with 38 turns remaining |
| B02 | R2, R3, R12 | Browser | EP | Escape, up arrow, D twice on Crossing | Escape uses no turn. Board edge and wall hold position and consume turns |
| B03 | R4, R12 | Browser | ST | D, A, D on Quarry | Tile stops being a crystal. Score 10 and two crystals remain |
| B04 | R1, R2, R12 | Browser | ST | Select Crossing by keyboard, collect a crystal, press Enter on Restart | Same map, original position and counters |
| B05 | R5, R8, R12 | Browser | BVA, ST | Enter Quarry hazard three times, then press up | Health loss appears. Position and turns remain at terminal values |
| B06 | R7, R12 | Browser | BVA, ST | 39 up attempts followed by the 40th | Active at one remaining turn. Turn-limit loss at zero |
| B07-quarry | R6, R8, R9, R12 | Browser | ST | `ddddddd`, then A and Restart | Win with score 50, three health, 33 turns left. A leaves the counter unchanged. Restart restores 40 turns |
| B07-crossing | R6, R8, R9, R12 | Browser | ST | `ssdddwwddassassdsdssd`, then A and Restart | Same checks with 19 turns left at the win |
| B07-grotto | R6, R8, R9, R12 | Browser | ST | `dawwwwwdssddsdddwwwwd`, then A and Restart | Same checks with 19 turns left at the win |
| B07-ridge | R6, R8, R9, R12 | Browser | ST | `saasaawwaasddssssaaassddd`, then A and Restart | Same checks with 15 turns left at the win |
| B07-spring | R6, R8, R9, R12 | Browser | ST | `wwddssdssswwwaaasaaawwsssassd`, then A and Restart | Same checks with 11 turns left at the win |
| B07-vault | R6, R8, R9, R12 | Browser | ST | `wdddwddddwwwwwaaassaawwaa`, then A and Restart | Same checks with 15 turns left at the win |
| B08 | R2, R5, R12 | Browser | CI | 360 × 420 viewport and down arrow | 64 cells, fit within 360 px, move to row 2, browser default scrolling prevented |

## Bot and detector checks

The evaluation checks below trace to the [bot and detector tasks](DETAILED_PLAN.md) and to R11 for the event contract.

| Case | Level | Technique | Input | Expected result |
| --- | --- | --- | --- | --- |
| T01 | Unit | CI | Repeat seed 21 on every map, then sample seeds 21–25 | Exact event replay and at least two distinct action sequences per map |
| T02 | Unit | CI | Replay recorded actions for three seeds on six maps | Every logged field matches the corresponding rule transition and the run is terminal |
| T03 | Unit | CI | Five hand-worked events with jumps, damage, and blocked turns | All nine features equal independently computed values |
| T04 | Unit | BVA | Health only decreases | Largest one-turn gain is zero |
| T05 | Unit | EP | Break the position chain, score delta, or outcome in valid traces | Each malformed trace is rejected |
| D01 | Unit | EP, CI | 600 normal pairs and duplicate or incorrectly assigned fixtures | 300/150/150 without overlap. Invalid assignments rejected |
| D02 | Unit | CI | Five identical training rows plus one outlier. Query constant and varying features | Independent expected 5-NN and max-deviation scores |
| D03 | Unit | BVA | 20 reverse-ordered calibration scores | Nearest-rank 95th percentile is 19 |
| D04 | Unit | CI | Hand-worked training and calibration scores | Each fitted threshold is 18 |
| D05a | Unit | BVA | Score 1.99 at threshold 2 | No alert |
| D05b | Unit | BVA | Score 2 at threshold 2 | No alert |
| D05c | Unit | BVA | Score 2.01 at threshold 2 | Alert |
| D06 | Unit | CI | Four copies of held-out Quarry seed 76 | Intended feature changes and metadata, valid traces, unchanged source events |
| D07 | Unit | CI | Replace held-out health-gain features after splitting | Thresholds stay fixed and each method emits a threshold-consistent Boolean |
| D08 | Unit | CI | All six maps and held-out seeds 76–100 | All 600 copies have correct source map/seed and the intended feature change |

## AI-assisted test decisions

Codex proposed and drafted cases while implementing the numbered requirements. The task prompt was to finish the repository checklist in `DETAILED_PLAN.md`, which already specified the required movement partitions, state transitions, and boundaries. Assertions were reviewed against `GAME_REQUIREMENTS.md` and fixed layouts.

| Proposal | Decision | Reason |
| --- | --- | --- |
| Assert the legal step, wall collision, board edge, and ignored input separately | Kept | R2 and R3 define different effects on position and turns |
| Check only that move 40 loses | Revised | R7 explicitly permits a win on turn 40. U12 covers it and U13 covers a coincident zero-health loss |
| Assume changing the seed changes every individual action sequence | Revised | Different seeds can take the same legal route. T01 asserts exact replay per seed and variation over five seeds |
| Assert arrow interception from an immediate zero-scroll read | Revised | Browsers can schedule scrolling after the event. B08 also observes cancellation of the actual key event |
| Use the bot planner to calculate browser win fixtures | Rejected | The independent fixed route strings exercise shipped layouts without deriving expected outcomes from the implementation |
| Add time-based waits around browser assertions | Rejected | Waiting assertions verify observable state and avoid timing assumptions |
