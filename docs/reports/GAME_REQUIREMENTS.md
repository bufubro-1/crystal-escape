# Crystal Escape Game Requirements

Positions use zero-based `{row, col}` coordinates in the rules and telemetry. The browser shows one-based row and column numbers.

| ID | Requirement |
| --- | --- |
| R1 | A session starts on the selected map's start tile with 0 score, 3 health, 0 used turns, 3 crystals remaining, and status `active`. Selecting a map or restarting starts a fresh session. |
| R2 | Arrow keys and WASD (either case) attempt movement one cell orthogonally. Each recognized attempt uses one turn. Other keys leave the state unchanged. The browser prevents default arrow scrolling during play when focus is outside the map selector. The map selector retains native keyboard controls. |
| R3 | An attempt into a wall or outside the board consumes a turn and leaves the player on the same tile without re-triggering tile effects. |
| R4 | Entering an uncollected crystal removes it and adds 10 points. Revisiting the tile adds no points. |
| R5 | Entering a hazard subtracts one health on each entry. Health reaching 0 ends the session as `lost`, with reason `health`. |
| R6 | Entering the exit with any crystal outstanding leaves play active, subject to the turn limit. Entering the exit after collecting all three crystals adds 20 points and ends the session as `won`. |
| R7 | When an attempt uses turn 40, the session ends as `lost` with reason `turn-limit` if it otherwise remains active. A win on turn 40 is valid. A hazard that reduces health to zero on turn 40 reports the health loss. |
| R8 | Move input in a terminal session leaves all state unchanged. Restart and map selection remain available. |
| R9 | The six fixed maps are each 8 × 8. Each contains exactly one start, one exit, exactly three crystals, at least one wall, and at least one hazard. Each cell contains one supported tile symbol. A session rejects an unknown map or a malformed fixture before play. Each shipped map has a legal winning route within the health and turn limits. |
| R10 | `createGame(mapId)` initializes state and `step(state, direction)` returns `{state, event}` without mutating its input. Recognized directions in the rule API are `up`, `down`, `left`, and `right`. Ignored or terminal input returns unchanged state and a null event. |
| R11 | One event per attempted move records map ID, one-based turn, action, before/after positions, movement outcome (`moved`, `wall`, `boundary`), resulting score and health, their signed deltas, crystals remaining, and status. Bot telemetry adds run ID and seed. |
| R12 | The browser shows the grid, position, score, health, turns remaining, crystals remaining, and outcome as text. It presents controls to select and restart each map. These controls work with the keyboard. |

Map notation uses `S` for start, `E` for exit, `C` for crystal, `#` for wall, `!` for hazard, and `.` for an empty tile. Start and exit are walkable. An attempt succeeds whenever its destination lies within the board and contains no wall.
