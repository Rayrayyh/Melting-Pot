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

### Lessons
- 001 Reading the spec PDFs in this container requires poppler, not pypdf
- 002 Next 16 conventions (proxy.ts, async params) and Playwright executablePath in this container
