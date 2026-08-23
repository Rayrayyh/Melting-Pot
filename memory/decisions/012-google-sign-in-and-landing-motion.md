# 012 Google sign in without Firebase, plus landing motion

Google sign in runs on Supabase Auth rather than Firebase, contributor activity landed on the Pot home, and the landing gained restrained motion.

## Firebase was asked for; Supabase Google OAuth was chosen

The owner asked to "add Firebase to the authentication / sign-up process" so
students could sign in with their Google account. The end they wanted was the
Google button. Firebase was the route they had in mind, not a requirement, and
they confirmed that when asked.

Firebase would have meant a second identity system beside Supabase Auth, which
is what every security rule in this project stands on. Bridging it (Supabase
third-party auth) means moving every RLS policy off `auth.uid()` and onto
Firebase JWT claims, and reworking `register_student`, `profiles`, and
`memberships`. Days of work on a live, merged, hardened app, with real risk to
the access-control guarantees that two adversarial review passes established.

Supabase Auth signs people in with Google natively. A Google user is an
ordinary Supabase user, so every policy, every security-definer RPC, and all
nineteen migrations keep working untouched. Same outcome for the student, an
hour of work, near-zero risk.

Recorded here because the request said Firebase and the code says Supabase, and
the next person reading this deserves to know that was deliberate and agreed
rather than an oversight. If Firebase ever becomes a hard requirement (a
sponsor prize, say), it is a separate project, not an edit.

## The button is gated behind an environment variable

Google OAuth needs credentials only the owner can create: their Google Cloud
project, their consent screen, their client secret. Until that exists, pressing
the button fails. So it is behind `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=on`, off by
default, and the live site shows no broken control. `docs/GOOGLE-SIGN-IN.md`
carries the console steps. An e2e test asserts the button is absent by default,
so the gate cannot rot.

## The profile trigger had to learn Google's field names

`handle_new_user` read only `raw_user_meta_data ->> 'display_name'`, which is
the key `register_student` writes. Google sends `full_name` and `name`, so
every OAuth signup would have landed in the app called "Student". Migration
0019 reads all three, falls back to the local part of the email, and only then
to the generic label, trimmed to the 80-character column limit.

## Contributor activity on the Pot home

Reference 03's caption asks the Pot home for contributor activity. It was the
one item missing: the page had per-note attribution and a member count, but
nothing showing who had actually put work in. `contributorActivity()` derives
it from the feed the page already loaded, so there is no second query and it
cannot drift from the notes below it. Ordering is by most recent contribution,
which is what makes it activity rather than a leaderboard.

Its e2e assertions deliberately do not check exact counts or order. Earlier
specs in a full run share extra notes into the same Pot, so hardcoding "4 chips,
Omar first" passed alone and failed in the suite. Ordering and counting are
unit-tested instead, where the input is fixed.

## Motion

The owner asked for micro animations and the CTA hover effect from
landonorris.com. That effect could not be read off the site (its CSS is not in
the fetched markup), so what shipped is the vertical roll it is known for: the
label lifts out of the top while a copy rises into its place. It is pure CSS
under `group/roll`, which means the global reduced-motion rule flattens it to
an instant swap with no extra handling.

`Reveal` lifts marketing sections into view once. It uses Framer Motion, which
writes inline styles that the global reduced-motion CSS cannot reach, so it
checks `useReducedMotion()` itself and keeps the same element type in both
branches to avoid a hydration mismatch.

Restraint is the rule from CLAUDE.md: no motion above the fold, nothing that
delays the hero, and hover lifts measured in a pixel or two.
