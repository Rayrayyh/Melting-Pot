# 033 Every study run lands in one place

A run that is not a marked set (a focus session, a blurt, a Feynman walk-through, a game result, the daily quiz) records itself through one RPC, `record_study_run(p_attempt_id, p_pot_id, p_kind, p_detail)`, into the same `study_attempts` table the record already reads. 2026-09-12, owner-approved feature work.

**Why:** the private record counts a day from `study_attempts.created_at`. A second table would mean a second source for "what counts", and the record, standing, and admin overview would each have to learn about it. One table, one nullable `set_id` (four of the new kinds have no set behind them), one `detail` jsonb for kind-specific counts, one idempotent write keyed by a client-generated attempt id, the same rule `submit_practice_test` already follows.

**The closed kind list:** `focus, blurt, feynman, game` in the function, `daily` in `study_attempts.kind`'s check for the marked daily quiz. A new kind of run means a migration, not a string from the browser. The kind list is a boundary, not a suggestion.

**Consequences:**
- `study_attempts.set_id` is nullable and `detail` jsonb (≤4000 bytes) exists, from migration 0046.
- `record_study_run` promotes `detail.correct`/`detail.total` into the existing columns when a game or quiz carries them, so the record and admin overview read every scored run the same way.
- `first_pass` means the first run of that kind in that Pot by that person, the rule 0036 set for a whole test.
- `admin_study_overview` carries a `runs` object with per-kind counts, re-emitted from 0031 with every guard carried (lesson 011).
- `consume_ai_generation` gains `graph => 20` and `daily => 12`; `study_sets.kind` gains `graph` and `daily` so both can live in the same cached set table with the same fingerprint discipline.
- Nothing counts that did not land in `study_attempts`. No client table writes were opened up to make any of this work.
