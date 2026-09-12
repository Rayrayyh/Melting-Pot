# 035 Focus is a cover, not a page

Focus mode is two things that share one rule: nothing new to fill in, and nothing that can eat the work. In the composer it is a cover, not a route. In the study workspace it is a timed session. 2026-09-12, owner-requested, shape chosen by the owner as both halves.

**Why a cover and not a page:** the draft lives in the composer's state and its autosave loop saves it there. A focus route would move the words across a boundary, and the thing focus promises is that nothing happens to them. The cover renders the same controlled `TextArea` over a `fixed inset-0` layer; Esc and Back remove it and not one character has moved. The layer carries `data-no-shortcuts`, because a global letter shortcut firing while someone writes in cover mode would be exactly the distraction focus exists to remove.

**Why the timer reads the clock:** the focus session anchors its countdown to `Date.now()` at start and reads what is left off the clock, never off accumulated ticks. A phone that locks, a tab the browser sleeps, a laptop that dozes: the interval stops, the session does not lose or gain minutes. Finishing records the run; leaving early records nothing, and says so.

**Consequences:**
- A finished focus session lands in `study_attempts` through `record_study_run` (decision 033), so it counts for the record exactly like a marked test.
- The optional "what are you working on" line is 120 characters, stored in the attempt's `detail`, shown to nobody but the reader (and their Pot's maintainers through the study overview, which counts runs without displaying labels).
