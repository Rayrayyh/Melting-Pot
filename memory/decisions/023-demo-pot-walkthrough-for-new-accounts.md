# 023 A demo Pot and a guided walkthrough for brand new accounts

Owner's idea, 2026-08-29: a new account lands in a seeded demo Pot and is walked through what each part of the product does, instead of arriving at an empty dashboard. Not built yet.

## The idea

When someone creates an account and signs in for the first time, they are joined to a demo Pot
(the working example is Human Biology, previously called Biology 101 in mockups) that already
holds notes, contributors, sections and at least one open correction. On top of that seeded Pot
they get a walkthrough that explains what everything does: the feed, contributing a raw note,
the organizer's pass, approving before it is shared, suggesting a correction on someone else's
note, maintainer review, and the study material built from shared notes.

## Why it matters

Every loop in this product needs other people's material to make sense. A first-time user with an
empty account cannot see what a correction is, cannot see version history, and cannot generate
flashcards, so the parts that make MeltingPot different are exactly the parts a new account
cannot reach. A seeded demo Pot removes that cold start, and it also gives the landing page's
claim something real to land on immediately after sign up.

## Open questions, to settle before building

- Is the demo Pot shared by everyone or seeded per account? Shared is cheaper but means strangers
  see each other's practice edits; per account costs a seed on every signup.
- Can the user contribute to it for real, or is it read-only with the walkthrough simulating writes?
- How does it end: does the user leave it, does it stay in their Pot list, or does it disappear
  once they join a real class?
- Walkthrough mechanism: a coach-mark overlay, a checklist in the dashboard, or an inline
  first-run state per surface. A checklist survives interruption better than an overlay.
- Interaction with the existing rule that nothing is ever published automatically: the walkthrough
  must not approve anything on the user's behalf.

## Constraints it must respect

- No automatic publishing. The contributor still approves their own contribution.
- The demo Pot must not pollute a real class's data or a real person's contribution streak.
- Skippable, and never blocking. Someone who arrived with a class code should be able to go
  straight to that class.
