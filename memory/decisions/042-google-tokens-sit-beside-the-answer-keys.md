# 042 Google tokens sit beside the answer keys

A maintainer's Google authorization is stored in `google_tokens`, a table with row level security and no policies at all. 2026-09-12, owner chose full OAuth over the share link knowing the verification constraint.

**Why no policies:** the token is a secret, and the pattern for secrets already exists: `study_set_keys` has RLS enabled and zero policies, reachable only through security definer functions. `google_tokens` copies that exactly. `my_google_token()` returns the caller's own row, which is how a token reaches a server route and why it can never reach a browser: there is no other read path, and the comment in the function says so out loud. `forget_google_token()` is the disconnect button's whole job.

**Why a definer read is not a hole:** the caller's identity is re-derived inside the function from `auth.uid()` at call time (lesson 007: re-check authorization at time of use), the same gate every other definer function passes, including the assurance-level check the policies carry.

**Why the refresh lives in one place:** `lib/google/token.ts` is the only reader. A push that starts within a minute of expiry refreshes first and writes the fresh row back through the definer write, so the stored token is never left half-rotated. The refresh decision (`needsRefresh`) is pure and unit-tested, as are the redirect URL, the scope list, and the coursework body, which is where the feature's promises are easiest to assert: the link travels, the answers do not, and no due date exists anywhere in the request.
