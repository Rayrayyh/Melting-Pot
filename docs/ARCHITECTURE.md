# How MeltingPot is put together

Written for anyone who has to reason about who can reach what: a reviewer, a
future contributor, or the next security scan. It describes the system as it
is on 2026-09-03, not as it is planned.

## The shape

```
browser
  |  HTTPS, session cookie
  v
Next.js on Netlify  --- server components, server actions, proxy.ts
  |  PostgREST and GoTrue over HTTPS, the caller's own JWT
  v
Supabase: Postgres with row level security, Auth, Storage
  |  server side only, service role never leaves the build
  v
Google Gemini (organizing, flashcards, practice tests, teaching readout)
```

Nothing else is in the path. There is no queue, no worker, no cache layer, no
analytics vendor, and no third party script on any page.

## Trust boundaries

There are four, and each one re-checks rather than trusting the last.

1. **Public web to the app.** Anyone can reach the landing, the three
   marketing pages, the legal pages, the sign in and sign up pages and the
   join preview. `web/proxy.ts` holds the list of protected prefixes and
   bounces anonymous requests to sign in before a page renders.
2. **The app to the database.** Every query the browser or the server makes
   travels as the signed-in person's own JWT. The app has no privileged
   database connection at runtime: there is no service role key in the
   deployed environment, so nothing the app does can exceed what that person
   is allowed to do.
3. **Inside the database.** Row level security is on for every table in the
   `public` schema. Reads are policy-filtered by membership
   (`is_pot_member`) or by ownership (`author_id = auth.uid()`). Writes that
   matter do not go through table policies at all: they go through security
   definer functions that re-check membership, role, rate limit and payload
   shape, so a client cannot construct a write that skips a guard.
4. **The app to the model.** Model calls happen server side, in route
   handlers, with the key held in a Netlify environment variable. No key
   reaches the browser, and no model output is trusted as authority: an
   organized note is a suggestion the writer approves, and every generated
   note and study set records which engine produced it.

Second factor sits across boundaries two and three. Anyone who runs a Pot
can enrol TOTP; once enrolled, `has_required_aal()` is embedded inside
`is_pot_member` and `is_pot_maintainer`, so an aal1 session is refused by the
database as well as by the proxy.

## Components and what each can read

| Component | Runs where | Can read | Secrets it holds |
|---|---|---|---|
| Landing, marketing, legal | Server and browser | Nothing private | None |
| App pages (`/home`, `/p/...`, `/me/...`, `/study`) | Server components | Whatever the caller's policies allow | The session cookie only |
| Server actions (`app/**/actions.ts`, `app/actions/record.ts`) | Server | Same as above, as the caller | None |
| `proxy.ts` | Edge | Cookie presence and assurance level | None |
| Study and organize route handlers | Server | The Pot they were asked about, as the caller | The model API key |
| Supabase Auth | Supabase | Its own tables | Password hashes, TOTP secrets |
| Postgres functions (definer) | Supabase | Everything, by design | None; they check the caller first |

The publishable key in the browser bundle is the anonymous role key. It is
public on purpose and grants nothing on its own: `lib/security/rls.test.ts`
proves that by using it to attempt a read of all sixteen tables and getting
nothing back from any of them.

## Sensitive data paths

- **Sign up and sign in.** Sign up goes through `register_student`, a definer
  function, because hosted confirmations and the shared mailer make GoTrue
  signup unusable here (memory/lessons/003). It enforces the same five
  password rules the browser shows. Passwords are stored by Supabase Auth
  with bcrypt. Sign in is GoTrue with the session in an httpOnly cookie.
- **Changing a password.** `/me/settings` sets the new password and then
  revokes every other session, so a session opened with the old password
  does not survive the change.
- **A note.** Typed in the browser, autosaved to `contributions` as a draft
  readable only by its author, organized server side, approved by the author,
  then published by `share_contribution` into `shared_notes` and
  `note_versions`, readable by that Pot's members.
- **A correction.** Proposed by any member, readable by the proposer and the
  Pot's maintainers only, decided by `decide_proposal`, which writes a new
  version and credits all three people.
- **Study answers.** Answer keys live in `study_set_keys`, which no client
  can read. Marking happens in `submit_practice_test` on the server; the
  browser receives its own marks and never the key.
- **Attachments.** Uploaded to a Storage bucket scoped by Pot, rows in
  `attachments` policy-filtered to members, with the same shared or own-draft
  rule as contributions.
- **The private record and the class standing.** Days are counted from the
  caller's own rows. `own_standing` aggregates a class inside the database
  and returns only the caller's rank and counts, so no classmate's figures
  reach a browser.

## Preventing cross-tenant access

A Pot is the tenant. Three things keep them apart, and all three have to fail
before a leak is possible:

1. Every policy filters on `is_pot_member(pot_id)` or on ownership, so a URL
   carrying another Pot's id returns nothing and the page renders a 404.
2. Every definer function re-checks membership and role at the top, before it
   touches a row, and takes ids as arguments rather than reading them from
   anything the client controls indirectly.
3. Ids are UUIDs, so guessing one is not a route in.

What is tested: `lib/security/rls.test.ts` runs a real anonymous client
against the live project and asserts every table is closed, that the audit
table cannot be written, and that `own_standing` and `class_topic_evidence`
refuse. A signed-in cross-tenant case runs when `MP_TEST_EMAIL` and
`MP_TEST_PASSWORD` are set, and is skipped otherwise.

## What is recorded

`admin_events` keeps what a maintainer did in a Pot: joins, role changes,
removals, correction decisions, and notes, study sets or cards taken down or
put back. It is written by database triggers rather than by the app, so it
cannot be skipped by a path that forgot to log, and it has no insert or
update policy at all, so no client can forge or erase an entry. Maintainers
can read their own Pot's entries; nobody else can read any.

Authentication events (failed sign ins, token refreshes, factor enrolment)
stay in Supabase's own auth logs, which is where they belong: duplicating
them into application tables would mean the application holding a second
copy of something it cannot verify.

## Build and deploy

The repository is the source of truth. GitHub Actions runs lint, types, unit
tests and a production build on every push. The deploy is a zip upload to one
Netlify site, so the artifact that was tested is the artifact that ships.
Database changes are migrations in `supabase/migrations/`, applied in
filename order, one per change.
