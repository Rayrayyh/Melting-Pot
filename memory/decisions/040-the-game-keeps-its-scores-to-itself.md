# 040 The game keeps its scores to itself

The class game's scoreboard exists while the room exists and nowhere else. 2026-09-12, owner chose the game-only scoreboard with private personal results.

**Why ephemeral:** the product keeps score in two places, the private record and personal standing, and the live game is the one sanctioned exception. The exception stays narrow by construction: scores are computed inside `game_state` for members of a live room and never written to any column. When the room ends, the only trace is each player's own `study_attempts` row, written by the podium through `record_study_run` from the server's count (`my_game_result`), not the browser's. No rank is stored anywhere, and nobody's page shows yesterday's game.

**Why first write wins:** `submit_game_answer` inserts with `on conflict do nothing` and validates the deadline on the server's clock. A slower replay cannot push an answer later to game the speed bonus, because the replay simply does not land. Speed breaks ties inside the room; the board's tie-break outside the scores is join order, so a shared score never reshuffles two people.

**Why the answers table is dark:** `game_answers` has RLS and zero policies, the `study_set_keys` pattern. The state function reveals aggregates, per-choice counts and the reader's own result; one player's answers are nobody else's read, including a maintainer's.

**Why solo mode records nothing new:** playing a set alone rides `submit_practice_test` exactly as the practice page does, so a sitting is recorded once as a practice attempt and never twice.
