# MeltingPot

Everything your class knows, in one Pot.

**Live:** https://meltingpot-io.netlify.app

## The problem

Every class generates knowledge constantly, and almost all of it evaporates. One student writes brilliant notes nobody else sees. Another understands Tuesday's lecture but not Thursday's. The group chat has the answer somewhere, forty scrolls up. The tools that promise to fix this all fail the same way: they demand structure up front, and tired students between classes will not fill in templates.

MeltingPot starts from the opposite bet. Write anything. A student pastes rough, unformatted, half-remembered notes exactly as they come out, and MeltingPot organizes them into a clean structured note with a title, a summary, and key takeaways. The student reads the organized version next to their untouched original and decides whether to share it with the class. Nothing is ever published without a person saying so.

A class space is called a Pot. A teacher creates one and gets a six character class code; students type the code and are reading the class vault before they ever make an account. When someone spots a mistake in a shared note, they select the sentence, propose a fix, and a maintainer reviews it. Accepted corrections become a new version that credits the original author, the person who fixed it, and the reviewer. The original text of every note survives forever, one toggle away.

## Try it in two minutes

1. Open the [live site](https://meltingpot-io.netlify.app). Create a Pot as a teacher, or join one with a code if you have it.
2. Paste something messy into "Write anything". Genuinely messy: lowercase, fragments, an "i think..." you are not sure about. Watch it become a structured note, with your uncertainty kept visible as a labeled "Still to confirm" line instead of being laundered into a confident claim.
3. Share it, then open it from the feed and suggest a correction to one sentence. Review it from the maintainer side and accept it. Open the note's history to see both versions and everyone credited.

## Where the AI lives

Organization is the product, not a feature bolted onto it. Gemini Flash organizes rough text and uses vision to caption or transcribe image attachments when useful. Every model call runs through authenticated server routes, treats note and attachment contents as untrusted source material, and returns schema-constrained data for normalization before the student sees it. The student's original remains untouched and nothing is shared without approval.

The Pot home is also a study hub: raw notes, a class-wide summary, flashcards, and a practice test generated from shared material. Flash handles organization, vision, summaries, and cards; a stronger configurable Gemini model is reserved for practice generation. The deterministic organizer remains as a local fallback when Gemini is not configured.

## What is in the product

The dashboard is role aware. Students land on their own unfinished drafts and any corrections that came back asking for revision. Maintainers land on the queue of corrections waiting for their review across every Pot they maintain. Pot cards carry live member, note, and correction counts and a continue link back to the last note you read.

Inside a Pot: a shared feed with section filters, full text search across titles, content, contributors, and attachments, file uploads (images including phone camera HEIC, PDFs, documents) and links that stay connected from draft through publication, version history with the complete attribution trail, and maintainer tools for sections, roles, class code regeneration, and archiving with a way back. Light and dark themes throughout, reduced motion respected, and a landing page whose scroll sequence melts a messy note into an organized one.

Account settings hold the theme (follow your device, or pick a side) and, for the people who run a Pot, two-step sign in with an authenticator app such as Google Authenticator. That one is enforced rather than advertised: turning it on adds a code step to every later sign in, and the test suite proves it by playing the authenticator itself.

## Screenshots

Role based dashboard with the maintainer review queue, Pot stats, and cross Pot activity:

![Dashboard](docs/screenshots/dashboard.png)

Review before sharing: the organized note beside the preserved original, with attachments and identity in view:

![Review before sharing](docs/screenshots/review-before-sharing.png)

Pot settings with maintainer section management, in the dark theme:

![Settings in dark theme](docs/screenshots/settings-dark.png)

Account settings: theme, and two-step sign in for the person who runs the Pot:

![Account settings](docs/screenshots/account-settings.png)

## Built for the hackathon

Everything here was designed and built from scratch during the hackathon period. The repo is its own receipt: `docs/PLAN.md` holds the step by step execution plan with per step status, `docs/BUILDLOG.md` records what was built, found, and fixed in order, and `memory/` captures each architectural decision and hard won lesson at the moment it happened. The commit history walks through the whole build.

Built for the [Pixel Forge AI Hackathon](https://pixel-forge-ai-hackathon-08.devpost.com/). The project is open source under the MIT license (see `LICENSE`), hosted live at the URL above, and the three minute demo video is on the Devpost submission.

## Under the hood

Next.js 16 (App Router, TypeScript, Tailwind) in `web/`, on Supabase for Postgres, auth, and file storage, hosted on Netlify. Security is enforced in the database, not the client: row level security on every table, privileged transitions through security definer functions that re-validate the caller at time of use, database enforced rate limiting on every sensitive operation (sized so an entire class behind one school network can sign up together), and an API surface closed down to exactly what the app uses. Anonymous visitors can reach two functions: look up a class code and register. Shared notes and their versions can only be written through the reviewed publish paths.

The build is covered by 34 unit tests and 40 Playwright end to end tests over every core flow, plus two adversarial review passes whose confirmed findings, from access control holes to a diff that could hang a browser tab, were all fixed and are documented in the build log.

## Running it locally

```bash
cd web
pnpm install
cp .env.example .env.local   # add Supabase values and a server-only Gemini key
pnpm dev
```

Apply the migrations in `supabase/migrations/` to a Supabase project in order (0001 through 0019). For a development database with sample data, the dev seed lives in 0006, 0009, and 0010; call the `dev_reseed` function to reset it. 0013 is the production data cleanup and is only for a database going live.

Tests: `pnpm test:unit` (vitest) and `pnpm test:e2e` (Playwright, expects the dev seed).

## Repo map

- `docs/SPEC.md`: the authoritative product spec
- `docs/PLAN.md`: the execution plan with per step status
- `docs/BUILDLOG.md`: what was built, found, and fixed, step by step
- `memory/`: decisions and lessons recorded as they happened
- `supabase/migrations/`: the full schema, security, and function history
- `web/`: the app

## License

MIT. See `LICENSE`.
