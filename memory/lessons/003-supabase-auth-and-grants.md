# 003 Supabase hosted-project auth defaults and function grant gotchas

Summary: New hosted projects ship with email confirmations ON and a mailer limit that rejects the second signup in an hour; and default privileges silently grant EXECUTE on every new function to anon and authenticated.

## Findings (all verified against project evcfmwxzxwmeiczfupsw on 2026-08-19)

1. `POST /auth/v1/signup` on a fresh project returns `confirmation_sent_at` with no session: confirmations are on by default and the MCP toolset has no way to change auth config.
2. The second signup within the hour fails outright with "email rate limit exceeded" (the built-in mailer allows about two emails per hour), so GoTrue-native signup cannot onboard a classroom. This forced the `register_student` RPC design in decision 004.
3. GoTrue validates email domains on its endpoints (example.com is rejected), but SQL-registered users skip that; `@meltingpot.dev` seed emails log in fine.
4. Supabase sets default privileges so every new function in an exposed schema is executable by anon AND authenticated. `revoke ... from public` does NOT undo that; each role grant must be revoked explicitly. The security advisor lint `anon_security_definer_function_executable` catches it; migration 0007 is the fix.
5. `storage.objects.owner_id` is text; cast before comparing to `auth.uid()`.

## Why it mattered

Signup is the front door of the product; without these findings the flow would have shipped working for exactly one user per hour. The grant gotcha would have left helper functions anon-callable (information disclosure: is_pot_member(uuid) would confirm valid pot ids).
