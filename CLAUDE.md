# MeltingPot

meltingpot.io is a responsive desktop-first web app where students in a class collaboratively build a shared vault of knowledge. A class space is a Pot. Students join with a six-character class code, write completely unformatted notes, an organizer structures them, and the student approves before anything is shared. Corrections to shared notes go through maintainer review. Entered in the Prometheus August AI Challenge, which asks for an educational tool where AI/ML is core to how people learn, teach, or absorb information, and requires an open-source repo (MIT license present), a hosted live URL, and a demo video.

**Submission deadline: Saturday 2026-08-29, 11:45pm PDT** (06:45 UTC on the 30th). The rules page separately says 11:59 PM with no extensions; the two disagree by fourteen minutes, so treat 11:45pm PDT as the wall. Scope decisions bend toward shipping before it.

The judging rubric is 100 points in four equal parts: Educational Impact, Creative Use of AI/ML (their words: "AI is core to the functionality, not just an afterthought"), Technical Execution (codebase, UI, UX), and Pitch & Demo. The demo video is capped at two minutes and anything longer is not watched. `memory/decisions/021` records how this project came to be entered here.

## Read these first

1. `docs/SPEC.md` - the authoritative product spec. It wins every conflict.
2. `docs/PLAN.md` - the step-by-step execution plan with per-step verification and status. Keep its status column current as steps land.
3. `memory/` - the knowledge base: `decisions/` (what was chosen and why) and `lessons/` (what was learned the hard way). Follow `memory/README.md` rules: one note per file, one-line summary at top, update instead of duplicating, delete wrong notes.
4. `docs/reference/REFERENCE_CAPTIONS.md` + the 16 PNGs - UX structure references. Captions say per image what to use and ignore.

The four historical vision PDFs and the pasted rules text were removed from the repo root before submission; `memory/decisions/001-source-of-truth.md` records why they were never the source of truth.

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

Deploys go to https://meltingpot-prometheus.netlify.app only (owner's standing instruction, 2026-08-29). Never deploy to meltingpotworks.netlify.app or meltingpot-io.netlify.app; those are earlier sites. Deploy the committed tree from a detached worktree via the Netlify MCP zip deploy with web/ as the package root, so uncommitted work never ships.

Database changes go through Supabase MCP migrations (`apply_migration`), one migration per schema change, mirrored into `supabase/migrations/` in the repo.

## Product rules that are easy to violate

- No login wall before showing the Pot: code -> Pot preview -> auth -> membership finalized.
- Never publish anything automatically. The contributor approves contributions; a maintainer approves corrections.
- Always store and show both raw and organized content. The original is never deleted or overwritten.
- Pot titles may duplicate; Pot IDs and class codes are unique; never use titles as identifiers.
- No Git terminology, no schools/organizations, no likes or leaderboards, no purple AI branding, no gradients, no chatbot UI.
- Two of these rules were lifted by the owner on 2026-08-19 and 2026-08-20. Flashcards and practice tests are real features now, built from shared notes. A contribution streak exists, but only as a private record of one person's own days: never compared to anyone, and a quiet stretch shows the run they already managed rather than a zero. Nothing else keeps score.
- Copy style: sentence case, natural language ("Share with class", "Send to maintainer"). No emojis. No em dashes, in UI copy and in this repo's docs alike.

## Design tokens (digest)

Cream paper background (#faf4e6), warm white surfaces, near-black ink, brand orange primary actions (#ab5a14 light, #f19a44 dark), deeper orange accents. Light is the default theme for everyone who has not chosen one, stamped before first paint; the landing header carries a one tap light/dark icon and settings holds the three way picker (`memory/decisions/020`). The brand mark is an orange pot with a lowercase m knockout and liquid blobs (web/components/brand/pot-mark.tsx, web/app/icon.svg); the gradient inside those SVGs is the one sanctioned gradient use. The mark carries no tile or background: the mouth and the m are masked holes, so it sits on any surface. Icons come from two sources, because a tab and a home screen want different artwork: web/app/icon.png is the tileless mark and feeds favicon.ico, and web/public/brand/app-icon-tile.png is the square cream tile and feeds apple-icon.png. After editing either, run `node scripts/build-icons.mjs` from `web/`. Avatars are a person icon in one of six decorative `--avatar-N` tints hashed from the display name, deliberately separate from the functional colors. Inter for UI, Fraunces for display headlines, Baloo 2 for the lowercase wordmark, Source Serif 4 for long-form note bodies. Phosphor icons. Flat cards, subtle borders, restrained shadows, rounded corners, pill buttons, generous whitespace. Functional color only for success, warning, error, additions, removals, pending review. Honor prefers-reduced-motion. The owner replaced the original forest-green palette on 2026-08-19; see memory/decisions/010.

## Working agreements

- Follow `docs/PLAN.md` step order; each step ends with lint + typecheck + build green, a commit, and a push to `claude/prometheus-august-challenge`.
- All work stays on `claude/prometheus-august-challenge` until the project is finished. Do not merge it into `main`, do not open follow-up pull requests to move it there, and do not ask again each round: the owner merges when they decide the project is done. `main` being behind is expected, not a problem to solve.
- Do not schedule recurring pull request check-ins or any other self-firing routine. Report on a PR when the owner asks, or when a GitHub event actually needs a decision.
- When something breaks, check `memory/lessons/` first, and record any new lesson worth keeping.
- Log every architectural or scope decision in `memory/decisions/` at the moment it is made.
