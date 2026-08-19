# MeltingPot

meltingpot.io is a responsive desktop-first web app where students in a class collaboratively build a shared vault of knowledge. A class space is a Pot. Students join with a six-character class code, write completely unformatted notes, an organizer structures them, and the student approves before anything is shared. Corrections to shared notes go through maintainer review. Built for a hackathon that requires meaningful AI integration, an open-source repo (MIT license present), and a hosted live URL.

## Read these first

1. `docs/SPEC.md` - the authoritative product spec. It wins every conflict.
2. `docs/PLAN.md` - the step-by-step execution plan with per-step verification and status. Keep its status column current as steps land.
3. `memory/` - the knowledge base: `decisions/` (what was chosen and why) and `lessons/` (what was learned the hard way). Follow `memory/README.md` rules: one note per file, one-line summary at top, update instead of duplicating, delete wrong notes.
4. `docs/reference/REFERENCE_CAPTIONS.md` + the 16 PNGs - UX structure references. Captions say per image what to use and ignore.

The four PDFs in the repo root are historical vision docs. Do not build from them (see `memory/decisions/001-source-of-truth.md`).

## Stack

Next.js (App Router, TypeScript, Tailwind) in `web/`, Supabase (Postgres + Auth + Storage) with RLS enabled on every table, Netlify for hosting, Framer Motion (+ GSAP where a timeline helps) for restrained animation. The AI organizer is a deterministic provider behind an interface (`memory/decisions/003-ai-organizer.md`); no live model calls in the MVP.

## Commands

Run these from `web/`:

- `pnpm dev` - dev server (Turbopack)
- `pnpm build` - production build; must pass before every push
- `pnpm lint` and `pnpm typecheck` - fast checks; run before every commit
- `pnpm test:unit` - vitest unit tests
- `pnpm test:e2e` - Playwright end-to-end flows on port 3111 (launches the container Chromium via launchOptions.executablePath; never run `playwright install`)

Next is v16: `proxy.ts` instead of `middleware.ts`, `params`/`searchParams` are async, docs bundled at `web/node_modules/next/dist/docs/`. See `memory/lessons/002`.

Database changes go through Supabase MCP migrations (`apply_migration`), one migration per schema change, mirrored into `supabase/migrations/` in the repo.

## Product rules that are easy to violate

- No login wall before showing the Pot: code -> Pot preview -> auth -> membership finalized.
- Never publish anything automatically. The contributor approves contributions; a maintainer approves corrections.
- Always store and show both raw and organized content. The original is never deleted or overwritten.
- Pot titles may duplicate; Pot IDs and class codes are unique; never use titles as identifiers.
- No Git terminology, no schools/organizations, no streaks/likes/gamification, no flashcards or quizzes beyond placeholders, no purple AI branding, no gradients, no chatbot UI.
- Copy style: sentence case, natural language ("Share with class", "Send to maintainer"). No emojis. No em dashes, in UI copy and in this repo's docs alike.

## Design tokens (digest)

Cream paper background (#faf4e6), warm white surfaces, near-black ink, brand orange primary actions (#e0761a light, #f19a44 dark), deeper orange accents. The brand mark is an orange pot with a lowercase m knockout and liquid blobs (web/components/brand/pot-mark.tsx, web/app/icon.svg); the gradient inside those SVGs is the one sanctioned gradient use. Inter for UI, Fraunces for display headlines, Baloo 2 for the lowercase wordmark, Source Serif 4 for long-form note bodies. Phosphor icons. Flat cards, subtle borders, restrained shadows, rounded corners, pill buttons, generous whitespace. Functional color only for success, warning, error, additions, removals, pending review. Honor prefers-reduced-motion. The owner replaced the original forest-green palette on 2026-08-19; see memory/decisions/010.

## Working agreements

- Follow `docs/PLAN.md` step order; each step ends with lint + typecheck + build green, a commit, and a push to `claude/meltingpot-mvp-build-57aw4u`.
- When something breaks, check `memory/lessons/` first, and record any new lesson worth keeping.
- Log every architectural or scope decision in `memory/decisions/` at the moment it is made.
