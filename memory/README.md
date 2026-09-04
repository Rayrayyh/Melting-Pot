# Memory

This directory is the project's knowledge base. It makes the repo, not chat history, the durable memory across build sessions.

## Rules

- One lesson or decision per file, with a one-line summary as the first line after the title.
- Record corrections and confirmed approaches alike, and always say why they mattered.
- Do not save what the repo or chat history already records. Specs live in `docs/SPEC.md`; the plan lives in `docs/PLAN.md`. Memory holds the things those files do not: decisions with their reasoning, and lessons learned the hard way.
- Update an existing note rather than creating a duplicate.
- Delete notes that turn out to be wrong.
- File naming: `NNN-short-slug.md`, numbered in creation order. Numbers are never reused after deletion.

## Layout

- `decisions/` - choices that were made, by whom, and why. Read these before changing architecture, scope, or design direction.
- `lessons/` - things learned during the build (environment quirks, failed approaches, confirmed techniques). Read these before debugging something that feels environment-shaped.

## Index

### Decisions
- 001 Source of truth precedence: SPEC.md wins; repo PDFs are historical
- 002 Stack and hosting: Next.js + Supabase (RLS on) + Netlify, Framer Motion/GSAP
- 003 AI organizer: deterministic implementation now, provider interface for a real model later
- 004 Auth and join flow: Supabase Auth, join-before-signup with pending membership, privileged ops server-side
- 005 Dashboard-first and brand: role-based dashboard, landing secondary, Phosphor icons, light + dark, clean production, one deploy
- 006 Process directives: fully autonomous long runs, frontend-design skill, iterate with bug and visual passes, log everything in the repo
- 007 body_text joins blocks with newlines so correction selections never span blocks
- 008 Production deployment: meltingpot-io.netlify.app, web/ as package root, Next runtime plugin required for zip deploys, clean database
- 009 Rate limiting and endpoint closure in the database: fixed-window limits sized for classroom NAT, anon locked to two RPCs, authenticated keeps only used write verbs
- 010 Orange brand rework: cream paper, orange primary, pot-and-m mark, Fraunces display, pill buttons; supersedes the green palette
- 011 Account surface and two-step sign in: profile at the foot of the nav, theme and security in /me/settings, enrolment paired with a real login challenge, landing open to signed-in people, mark with no tile
- 012 Google sign in on Supabase Auth rather than Firebase (asked for, declined with reasons), gated behind an env flag; contributor activity on the Pot home; restrained landing motion
- 012 Maintainers see study results by owner decision: first passes only, alphabetical, no ranking and no single overall score
- 013 Auth seam in lib/auth: Google OAuth removed, provider selection by env, Clerk slot present and unimplemented, one marked exception in proxy.ts
- 014 Generated study material is stored per Pot keyed by a fingerprint of its sources; removal is never deletion
- 015 The light-mode brand orange had to darken to be readable, measured rather than guessed
- 016 A correction is organized before it is sent, not when it is accepted, so the proposer sees their own work first
- 017 The product says mixing and never the model's name; identifiers live in configuration only
- 017 The loading mark is the pot, stirring, drawn as a pure function of one clock
- 018 Changing a setting looks things up quietly and never rebuilds the page
- 018 The maintainer's page is the Pot's record, not just its queue: Review, Contributions, History, Removed
- 019 A flashcard is one card with two faces turning on its axis, not two cards crossfading
- 019 The organizer may disagree with a note, but never edit it
- 020 Dark is the default theme, and one stored choice covers every surface
- 021 The project is entered in the Prometheus August AI Challenge, and the earlier record is not rewritten
- 022 The teacher gets a readout of what the class is shaky on, and the model never touches the numbers
- 023 A demo Pot and a guided walkthrough for brand new accounts (idea, not built)
- 024 The landing hero shows the product: cropped tilted Pot page mock replaces the illustration
- 025 The landing scrolls natively: the Lenis wheel hijack removed after owner testing found it jittery
- 026 An outside scan set the header work, and the CSP ships permissive on purpose
- 027 Two interactions borrowed from other sites, translated rather than copied
- 028 Section two names the problem and opens three doors: demo Pot, class code, create a Pot
- 029 The sidebar folds on the kolejain curve, the Pots list slides across sidebars, the select, the notification hover and the scrollbar are drawn by the app
- 030 The record of days is quiet: the on-load modal is gone, the card carries the feature, days are cut where the reader is
- 031 The comparison rule is lifted: each person sees their own standing in a class, always said as what they are ahead of; no names, no list
- 032 The celebration returns as the stir, fired by the completion screens and never by a page load
### Lessons
- 001 Reading the spec PDFs in this container requires poppler, not pypdf
- 002 Next 16 conventions (proxy.ts, async params) and Playwright executablePath in this container
- 003 Supabase hosted defaults: confirmations on + mailer limit force RPC registration; default privileges grant new functions to anon
- 004 Browser TLS is blocked by the egress proxy here; dev routes browser Supabase calls through a Next rewrite
- 005 RLS is authorization, not a query filter; queries still filter user_id themselves
- 006 E2e suites reseed via guarded dev_reseed in global setup; lazily-created resources need in-flight guards
- 007 Re-check authorization at time of use: RPC membership guards, WITH CHECK on mutable columns, matching policy pairs, server-side staleness checks
- 008 One flag driving two buttons takes the way out away; cancel is never the thing to disable
- 009 An identity transform still captures `position: fixed`, so a full-screen overlay rendered in place is not full screen
- 010 The left of X-Forwarded-For belongs to the caller, not to you
- 011 Re-emitting a plpgsql function body discards every guard you did not look at
- 012 A rebuild under a running server looks exactly like an app bug

## A note on the numbering

The rule above says numbers are never reused. Four were, on days when two
decisions were written in parallel: 012, 017, 018 and 019 each name two files.
They are listed twice above, in filename order, and the files are not being
renumbered because other documents already cite them by number. The rule
stands; these four are the exceptions, recorded rather than tidied away.
