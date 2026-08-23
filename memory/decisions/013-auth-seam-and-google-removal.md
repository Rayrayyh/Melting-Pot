# 013 Auth seam, Google sign in removed

Google OAuth was taken out at the owner's direction and replaced with a provider seam in `web/lib/auth`, so Clerk can be dropped in later without touching call sites.

## What the owner asked, and what was built

"We won't use google/supabase auth, as it's not necessary. remove it, and build a
framework to use clerk later."

Read narrowly: remove the Google OAuth path, keep email and password working,
and put a seam in front of the provider. Read broadly it could have meant
removing Supabase Auth outright, which would have left a live app with no
authentication at all and every RLS policy pointing at an `auth.uid()` nobody
sets. That is not a state to ship, and the narrow reading is a strict prefix of
the broad one: the seam is step one of any Clerk migration either way. So the
seam was built and email and password kept working, with the ambiguity flagged
rather than guessed at silently.

## Why a seam rather than just deleting Google

The organizer already proved the pattern (decision 003): an interface in the
product's words, one live implementation, one stub, selection by environment
variable. Auth now matches. The alternative, calling `supabase.auth.*` from
components, is what made the Firebase question in decision 012 expensive to
answer: thirty call sites, no single place to reason about.

Fifteen files moved onto the seam. Exactly one direct auth call remains outside
`lib/auth`, and it is marked in the file: `proxy.ts`, where route gating is
bound up with the Supabase cookie refresh. Clerk replaces that whole file with
`clerkMiddleware()`, so abstracting it would have bought nothing.

## Shape

Server and client are separate interfaces. The server reads identity from the
request; the browser drives sign in, sign out, and second-factor setup. Keeping
them apart stops `next/headers` leaking into the client bundle.

Failures cross the seam as `AuthError` with a stable code, never as provider
message text. Before this, `auth-form.tsx` matched on Supabase's English
strings, which would have silently stopped working under any other provider.

The Clerk slot throws `not_configured` from every method rather than returning
null, so a half-finished swap fails loudly instead of quietly signing nobody
in. A unit test asserts that for all eleven methods, which also means adding a
method to the interface fails the test until the Clerk side is filled in.

## What was kept

Migration `0019_oauth_display_name.sql` stays, though the OAuth path it was
written for is gone. It teaches `handle_new_user` to read `full_name` and
`name` as well as `display_name`, and to fall back to the email local part
before the generic "Student". That is a general improvement, it is already
applied to production, and it is exactly what a Clerk integration will need.

## The real cost of the swap, recorded now so it is not a surprise

Steps one to three of a Clerk migration are an afternoon: install, implement the
two objects, replace the proxy. Step four is the work. Every RLS policy is
written against `auth.uid()` and every privileged operation runs through a
security-definer function that re-validates the caller. None of that works
until Postgres can identify a Clerk user, either through Supabase third-party
auth accepting Clerk JWTs, or by minting a Supabase session after Clerk signs
someone in, which needs a service-role key this deployment deliberately does
not hold. Cost step four before starting. `docs/AUTH.md` carries the detail.
