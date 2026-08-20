# The product says mixing; it never says the model's name

User-facing copy, source identifiers, and environment variable names carry no
vendor name. Model identifiers live in configuration only.

## Why

Naming the model in the interface makes the product feel like a wrapper around
someone else's tool rather than a thing a class built together. "Gemini will use
the latest shared notes" told a student nothing they needed and everything they
did not care about. What matters to them is that their class's notes went in and
a test came out.

"Mixing" was chosen because the Pot metaphor already carries it: notes go in the
pot, and what comes out is mixed from what the class put there. It is a verb
about their material, not a brand.

## What changed

- `lib/gemini` is `lib/mix`. `GeminiError` is `MixError`, `GEMINI_FLASH_MODEL`
  is `FAST_MODEL`, `GEMINI_REASONING_MODEL` is `REASONING_MODEL`.
- `GEMINI_API_KEY` is `MODEL_API_KEY`.
- The two model identifiers are no longer defaults in source. They are read from
  the environment and nothing else, because a model identifier belongs to the
  provider, changes on their schedule, and should never need a code change to
  follow. `mixingConfigured()` treats a missing model name exactly like a
  missing key, so the app falls back to the deterministic organizer rather than
  calling a guess.
- Every error message a person can read now names the mixer or nothing at all.

## What deliberately still says it

- `supabase/migrations/0020_gemini_attachment_analysis.sql` and a comment in
  0021. Both are applied migrations. Renaming an applied migration file breaks
  the mirror between the repo and what the project actually ran, which is worth
  more than the word.
- `docs/BUILDLOG.md` and `memory/decisions/014`. Both are records of what
  happened, and rewriting a record to match today's naming makes it a worse
  record.
- The values in `.env.example` and in the deployment's environment, which are
  the provider's own model identifiers. There is no way to name a model without
  naming it.

## The one step this cannot do for itself

Netlify will not reveal the value of a secret variable, so `MODEL_API_KEY`
cannot be copied across from the old name by anything that cannot read it. It
has to be added to the site by hand, with the same value, before the next
deploy. `FAST_MODEL` and `REASONING_MODEL` are not secret and were set from
here.
