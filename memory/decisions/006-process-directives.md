# 006 Process directives from the owner

Summary: Build fully autonomously in long uninterrupted runs, follow the Anthropic frontend-design skill for all UI work, keep iterating with bug and visual passes, and log deductions, actions, and steps in the repo.

## The directives (owner's message, 2026-08-19)

- Act fully autonomously; no questions, no stopping for review from now on. Use best judgment, deep reasoning, and logic.
- Run long working sessions (at least 90 minutes) covering the full build plus testing iteration on my own work.
- Keep iterating: repeated bug passes, visual UI and UX fixes, flaw hunting; do not stop at "tests pass".
- Store deductions, actions, and steps in the repository as they happen: `docs/BUILDLOG.md` is the running log, `memory/` holds the durable lessons and decisions distilled from it.
- Use the frontend-design skill from the Anthropic skills GitHub repo for UI work. Its application to this product is written down in `docs/DESIGN-DIRECTION.md`.
- Dashboard remains the priority surface; the landing page is secondary (reaffirmed; see decision 005).

## Why it mattered

These override the default cadence of pausing for review between steps. Verification shifts from "ask the owner" to "prove it yourself": screenshots, e2e runs, and adversarial passes recorded in the build log.
