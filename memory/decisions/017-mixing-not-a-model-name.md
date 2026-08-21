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

## The second pass, when the owner asked again

The first pass left the migrations and `.env.example` alone, on the grounds
that renaming an applied migration breaks the mirror between the repo and what
the project ran. The owner asked again, so the reasoning got a second look and
most of it did not survive it:

- **The migration file was renamed** to `0020_attachment_analysis.sql`, and the
  comments in it and in 0021 reworded. The mirror argument was weaker than it
  sounded. Supabase records a migration under the name passed to
  `apply_migration`, not under the filename here; these files are a mirror kept
  by hand, and a comment is never executed at all. Nothing about what ran
  changed.
- **`.env.example` no longer names a model.** Both identifiers are blank with a
  comment saying to use whatever the provider publishes. Blank is honest rather
  than lossy: unset already reads the same as an unset key, so the deterministic
  organizer carries every flow, which is exactly what a half-configured checkout
  should do.
- `memory/decisions/014` was updated, because that line describes how the app
  behaves today rather than what happened once.

## What still says it, and why that is right

- `docs/BUILDLOG.md` and this note. Both are records. The build log contains a
  correction about which Flash version was current, and this note contains the
  old-to-new mapping someone will need when they meet a stale environment
  variable. Removing the word from either makes it a worse record, and from
  this note makes it meaningless.
- The deployment's own environment, where the values are the provider's model
  identifiers. There is no way to name a model without naming it, which is the
  whole reason those two identifiers live in configuration and not in source.

## The one step this cannot do for itself

Netlify will not reveal the value of a secret variable, so `MODEL_API_KEY`
cannot be copied across from the old name by anything that cannot read it. It
has to be added to the site by hand, with the same value, before the next
deploy. `FAST_MODEL` and `REASONING_MODEL` are not secret and were set from
here.

## Retrying a full pot

`generateStructured` retries on capacity: 429, any 5xx, and a connection that
failed outright. Four attempts, waits of roughly 0.4s, 0.9s and 2s with jitter
so a class that all pressed the button together does not come back in lockstep,
and `Retry-After` is honoured when the mixer sends one.

Two things it deliberately does not do.

**It does not extend the budget.** All four attempts share the same 60 second
ceiling one attempt used to have. These run as serverless functions with a hard
timeout, so a retry past that ceiling would not buy another chance; it would be
killed further from home, after the class had been kept waiting longer. Each
attempt gets whatever is left, and a wait is only taken if there is still budget
to use it for.

That works because capacity refusals come back fast. A full mixer answers in a
few hundred milliseconds, since nothing is queued behind the refusal. Slow calls
are not the ones being retried, which is also why the waits are short.

**It does not retry a reply that arrived and said nothing usable.** That is not
a capacity problem, and asking again spends a whole generation to find that out.
The caller falls back to the deterministic organizer, which is what that
fallback is for.

A refusal about the request itself is never retried either. Bad credentials, a
malformed body or a missing model do not become correct by being asked again.
