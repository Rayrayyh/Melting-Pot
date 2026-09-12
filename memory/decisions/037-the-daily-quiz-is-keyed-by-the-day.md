# 037 The daily quiz is keyed by the day

One quiz per Pot per day, the same questions for everyone, generated the first time anybody opens it and served to everybody after. 2026-09-12, owner chose "one per Pot per day" over personal sets.

**Why the day and not the notes:** a shared set is the point. The fingerprint is `daily:YYYY-MM-DD` cut in UTC (`lib/study/daily.ts`), stored in `study_sets` under the existing `(pot_id, kind, fingerprint)` uniqueness, so the store itself enforces one quiz per day with no new table. Deriving the fingerprint from the notes instead would hand the class a different quiz whenever anyone shared a note, and the record would stop meaning "today's quiz".

**Who pays:** the first opener of the day spends one build from their own `consume_ai_generation('daily')` quota (12/hour from migration 0046). The route re-checks the store between the quota and the work, which closes most of the simultaneous-opener race; two true simultaneous openers can still both spend, and the copy on the page says the first person in brings it. `regenerate` is deliberately ignored for daily: nobody rewrites a shared quiz. A maintainer who wants it gone removes the set, and the next opener brings a fresh one.

**Once per person:** `submit_daily_quiz` (migration 0048) mirrors `submit_practice_test` as it stands after 0036, with one added rule: a second sitting with a fresh attempt id raises `already_taken` instead of recording. A lost reply is still replayed by attempt id. Keys live on the server as for a practice test, so the daily quiz is always a secured set, and its first-pass answers feed `class_topic_evidence` (re-emitted in the same migration to read `kind in ('practice', 'daily')`).
