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

Organization is the product, not a feature bolted onto it. Rough text is mixed into a structured note, and image attachments are captioned or transcribed when that helps. Every model call runs through authenticated server routes, treats note and attachment contents as untrusted source material, and returns schema-constrained data for normalization before the student sees it. The student's original remains untouched and nothing is shared without approval.

The Pot home is also a study hub: raw notes, a class-wide summary, flashcards, and a practice test generated from shared material. A fast model handles organization, vision, summaries, and cards; a stronger one is reserved for writing practice tests. Both are named in configuration rather than in source. The deterministic organizer remains as a local fallback when neither is configured.

Generated material is stored per Pot and keyed by a fingerprint of the notes it was built from, so a class shares one deck rather than each student spending a generation on the same thing. Share a note, accept a correction, or remove one, and the fingerprint changes and the next request rebuilds. Nothing generated is ever put in an HTTP cache: the database is the only cache, and it is one a maintainer can look at and delete.

## Studying from what the class built

Flashcards and the practice test are learning flows, not lists. Cards come one at a time, flip on a click or the space bar, move with the arrow keys, and get marked known or still learning; the round ends on a summary that offers the hard ones again. Cards carry tags, and the deck filters by them.

A practice test is set up before it is written: five to twenty questions, three difficulties, the sections to draw from, and anything to concentrate on in your own words. It asks one question at a time with a navigator and answers you can change, reveals nothing until you hand it in, then marks with the correct answer, your answer, the explanation, and the note each question came from, and offers the ones you missed again. Nothing about how you are doing is written down anywhere.

Reading a note is study too. Notes highlight the terms they define or emphasise, worked out from the note itself rather than asked of a model, and selecting any passage offers to turn it into a flashcard that belongs to whoever wrote it.

## What is in the product

The dashboard is role aware. Students land on their own unfinished drafts and any corrections that came back asking for revision. Maintainers land on the queue of corrections waiting for their review across every Pot they maintain. Pot cards carry live member, note, and correction counts and a continue link back to the last note you read.

Search reaches notes, sections, study summaries, and flashcards across every Pot you belong to, filtered by kind and by Pot and ordered by recency or by how many times a note has been corrected.

Maintainers can take a note out of a Pot with a reason and put it back, delete a generated set, and delete cards. Removal is not deletion: the note leaves the feed, search, and study material, its page says who removed it and why, and every version and everyone credited stays on the record. Pot settings lists what is out with a way back. Deleting or archiving the Pot itself stays with the owner.

Inside a Pot: a shared feed with section filters, full text search across titles, content, contributors, and attachments, file uploads (images including phone camera HEIC, PDFs, documents) and links that stay connected from draft through publication, version history with the complete attribution trail, and maintainer tools for sections, roles, class code regeneration, and archiving with a way back. Light and dark themes throughout, reduced motion respected, and a landing page whose scroll sequence melts a messy note into an organized one.

Account settings hold the theme (follow your device, or pick a side) and, for the people who run a Pot, two-step sign in with an authenticator app such as Google Authenticator. That one is enforced rather than advertised: turning it on adds a code step to every later sign in, and the test suite proves it by playing the authenticator itself.

Sign in is an email and a password, behind a provider seam in `web/lib/auth`: everything the app needs from an identity provider is described in the product's own words, so moving to a hosted provider such as Clerk is an implementation behind that interface rather than a rewrite of every page. `docs/AUTH.md` explains the contract and what a swap actually costs.

## Screenshots

Role based dashboard with the maintainer review queue, Pot stats, and cross Pot activity:

![Dashboard](docs/screenshots/dashboard.png)

Review before sharing: the organized note beside the preserved original, with attachments and identity in view:

![Review before sharing](docs/screenshots/review-before-sharing.png)

Flashcards, one card at a time, with the deck filtered by tag:

![Flashcards](docs/screenshots/flashcards.png)

A practice test marked, with the answer, the explanation, and the note each question came from:

![Practice results](docs/screenshots/practice-results.png)

Pot settings with maintainer section management, in the dark theme:

![Settings in dark theme](docs/screenshots/settings-dark.png)

Account settings: theme, and two-step sign in for the person who runs the Pot:

![Account settings](docs/screenshots/account-settings.png)

## Built for the hackathon

Everything here was designed and built from scratch during the hackathon period. The repo is its own receipt: `docs/PLAN.md` holds the step by step execution plan with per step status, `docs/BUILDLOG.md` records what was built, found, and fixed in order, and `memory/` captures each architectural decision and hard won lesson at the moment it happened. The commit history walks through the whole build.

Built for the [Pixel Forge AI Hackathon](https://pixel-forge-ai-hackathon-08.devpost.com/). The project is open source under the MIT license (see `LICENSE`), hosted live at the URL above, and the three minute demo video is on the Devpost submission.

## Under the hood

Next.js 16 (App Router, TypeScript, Tailwind) in `web/`, on Supabase for Postgres, auth, and file storage, hosted on Netlify. Security is enforced in the database, not the client: row level security on every table, privileged transitions through security definer functions that re-validate the caller at time of use, database enforced rate limiting on every sensitive operation (sized so an entire class behind one school network can sign up together), and an API surface closed down to exactly what the app uses. Anonymous visitors can reach two functions: look up a class code and register. Shared notes and their versions can only be written through the reviewed publish paths.

The build is covered by 186 unit tests and 53 Playwright end to end tests over every core flow, plus two adversarial review passes whose confirmed findings, from access control holes to a diff that could hang a browser tab, were all fixed and are documented in the build log. Both study sessions are written as reducers, so how a deck is walked and how a test is marked are unit tests rather than browser tests. A Checks workflow runs lint, types, unit tests, and a production build on every push and pull request.

## Running it locally

```bash
cd web
pnpm install
cp .env.example .env.local   # add Supabase values and a server-only model key
pnpm dev
```

Apply every migration in `supabase/migrations/` in filename order. For a development database with sample data, the dev seed lives in 0006, 0009, and 0010; call the `dev_reseed` function to reset it. 0013 is the production data cleanup and is only for a database going live, and it drops the seed functions, so a development database should stop before it.

Tests: `pnpm test:unit` (vitest) and `pnpm test:e2e` (Playwright, expects the dev seed).

## Configuring the model

Three server-side variables, and it is all or nothing: `mixingConfigured()` in `lib/mix/server.ts` requires the key and both model names together. Leave any one of them empty and the deterministic organizer quietly carries every flow while the study tools report that mixing is unavailable. That fallback is deliberate, so a model outage never stops a class sharing anything, but it does mean a misconfiguration looks like the AI simply not being there.

```bash
MODEL_API_KEY=        # server only, never prefixed with NEXT_PUBLIC_
FAST_MODEL=           # organizing, reading images, summaries, decks
REASONING_MODEL=      # practice tests
```

**Where the key goes.** Locally, `web/.env.local`. On Netlify, Site configuration then Environment variables, scoped to *every* context you expect to use and marked secret. A key set only on the `production` context means deploy previews and branch deploys fall back to the deterministic organizer with nothing on screen saying why, which is a confusing way to demo. The key is read only on the server and never reaches the browser.

**Which provider.** The variable names are provider-neutral but the client is not. `lib/mix/server.ts` posts to Google's Gemini Interactions API at `generativelanguage.googleapis.com/v1beta/interactions`, sends the key as an `x-goog-api-key` header, and pins `Api-Revision: 2026-05-20`. So `MODEL_API_KEY` wants a Gemini API key from Google AI Studio. Pointing this at another provider takes an adapter, not just a different key.

**Which models.** Model identifiers belong to the provider and change on its schedule, so the app never names one in source: set both to whatever your provider currently publishes.

| Variable | What it drives | What it wants |
| --- | --- | --- |
| `FAST_MODEL` | organizing a note, reading image attachments, class summaries, flashcards | a fast, cheap model, a Flash tier. Most calls are this one |
| `REASONING_MODEL` | writing practice tests | a stronger model. Question quality and answer keys are where the difference shows |

A Flash-tier identifier such as `gemini-3.6-flash` is the shape `FAST_MODEL` expects.

Every request sets `store: false`, so prompts are not kept by the provider's stored-content path. Calls are bounded by a shared deadline that sits under the platform's function ceiling, and retry on capacity errors up to four attempts.

## Repo map

- `docs/SPEC.md`: the authoritative product spec
- `docs/PLAN.md`: the execution plan with per step status
- `docs/BUILDLOG.md`: what was built, found, and fixed, step by step
- `docs/AUTH.md`: the authentication seam and how to swap the provider
- `memory/`: decisions and lessons recorded as they happened
- `supabase/migrations/`: the full schema, security, and function history
- `web/`: the app

## License

MIT. See `LICENSE`.
