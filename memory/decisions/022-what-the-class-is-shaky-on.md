# The teacher gets a readout, and the model never touches the numbers

Built 2026-08-23 for the Prometheus challenge (`memory/decisions/021`), whose
rubric asks whether a tool helps someone **teach**, not only learn.

Everything before this pointed at the student: their own record, their own
streak, their own practice. `memory/decisions/012` let a maintainer see who had
practiced and what they scored, which answers "is anyone working" but not the
question a teacher actually has, which is "what is my class not getting".

## The split that makes it trustworthy

`class_topic_evidence` (migration 0039) is a plain SQL aggregate over answers
people really gave: for each note a question was written from, how many
first-pass answers it drew and how many missed. The model is handed that table
and asked only to read it. It never counts anything, so it cannot miscount
anything.

That boundary is the feature. A readout that invented "68% of your class is
struggling with osmosis" would be worse than useless to a teacher, because
they would act on it. The counts are the database's, the interpretation is the
model's, and the page says which is which and names the model that did it.
The counts are printed underneath the reading so the claim can be checked
without taking anyone's word for it.

## What it refuses to do

- **No student is named, counted, or compared.** The RPC returns topics and
  totals, and there is no shape of its output that could be turned back into
  a person. There is no ranking of people anywhere in it.
- **It stays quiet on thin evidence.** Below 20 first-pass answers from 2
  people it says so instead of guessing. One person having a bad afternoon
  must never reach a teacher as a fact about their class.
- **First pass only**, matching 0036. A retry is someone coming back to a
  topic, which is the behaviour this product wants; counting it here would
  make a class that revises look worse than one that never returns.
- **No fallback.** Every other model call in this app degrades to something
  rule-based, because a class must never be blocked from sharing. This one
  does not: a made-up interpretation of real numbers is the single thing this
  feature must never produce. When the model is unreachable the counts stand
  alone and the page says why.

## Order

Strengths first, gaps second. A readout that opens on failures reads as a
report card for a class, which is the thing this product has refused to build
from the beginning. Opening on what has landed makes the gaps read as work to
do rather than a verdict.
