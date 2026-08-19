# MeltingPot

Everything your class knows, in one Pot.

MeltingPot is a shared vault of knowledge for a class. Students join with a six-character class code, write completely unformatted notes, MeltingPot organizes them into a clean structured note, and the student approves before anything is shared. Corrections to shared notes go through maintainer review. Every note keeps its original text, its full version history, and credit for everyone who touched it.

**Live:** https://meltingpot-io.netlify.app

## The core promise

Join a Pot. Write anything. MeltingPot organizes it. You approve what gets shared.

- No login wall: enter a code, see the Pot, then create an account.
- The composer takes anything: rough notes, fragments, half-remembered ideas. No templates, no formatting.
- Organization is honest. It restructures what you wrote, never invents content, and keeps your uncertainty visible ("i think" becomes a labeled "Still to confirm" note, not a confident claim).
- Nothing publishes automatically. The contributor approves contributions; a maintainer approves corrections. The product says it plainly: AI cannot publish this change. A maintainer must decide.
- The original is never deleted or overwritten. It sits one toggle away from every organized note, forever.

## Screenshots

Role-based dashboard with the maintainer review queue, Pot stats, and cross-Pot activity:

![Dashboard](docs/screenshots/dashboard.png)

Review before sharing: the organized note beside the preserved original, with attachments and identity in view:

![Review before sharing](docs/screenshots/review-before-sharing.png)

Pot settings with maintainer section management, in the dark theme:

![Settings in dark theme](docs/screenshots/settings-dark.png)

## What is inside

- Join by class code with a Pot preview before any account exists.
- A role-based dashboard: members lead with their drafts and requested revisions, maintainers lead with corrections waiting across every Pot they maintain.
- The contribution loop: write anything, optional section choice, staged organization, full review with inline editing, explicit "Share with class".
- The correction loop: sentence-level selection, before and after comparison with labeled additions and removals, maintainer workspace with accept, request revision, and decline, all three outcomes preserved with reasons.
- Version history with a full attribution trail: original contributor, correction contributor, reviewing maintainer.
- Search across titles, summaries, content, sections, contributors, and attachment names.
- Attachments: file uploads (images, PDFs, documents) and links, connected from draft through publication.
- Pot administration: sections, roster and roles, class code regeneration, archive with unarchive, delete.
- Light and dark themes, reduced motion support, and a landing page whose scroll sequence melts a messy note into an organized one.

## The AI seam

The organizer runs behind a provider interface (`web/lib/organizer`). The MVP ships a deterministic rule-based provider so every behavior above is honest and reproducible: it derives titles, splits structure, detects definitions and lists, extracts takeaways, and preserves uncertainty, without a network call. A `ClaudeOrganizer` provider is wired behind `NEXT_PUBLIC_ORGANIZER_PROVIDER=claude` as the drop-in upgrade path; the interface, the review gate, and the trust rails do not change when a real model takes over.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind) in `web/`
- Supabase: Postgres, Auth, Storage. Row level security on every table; privileged transitions run through security-definer RPC functions that re-validate the caller
- Netlify hosting
- Framer Motion and GSAP for three orchestrated motion moments; everything else is 150ms transitions

## Repo map

- `docs/SPEC.md` - the authoritative product spec
- `docs/PLAN.md` - the step-by-step execution plan with per-step status
- `docs/BUILDLOG.md` - what was built, found, and fixed, step by step
- `memory/` - decisions and lessons recorded as they happened
- `supabase/migrations/` - the full schema, RLS, and RPC history
- `web/` - the app

## Run it locally

```bash
cd web
pnpm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
pnpm dev
```

Apply the migrations in `supabase/migrations/` to a Supabase project in order (0001 through 0012; 0013 is the production data cleanup). For a seeded development database, also apply 0006, 0009, and 0010, then call the `dev_reseed` RPC.

Tests: `pnpm test:unit` (vitest) and `pnpm test:e2e` (Playwright; expects the dev seed).

## License

MIT. See `LICENSE`.
