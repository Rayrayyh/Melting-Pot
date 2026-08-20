# 004 Auth and join flow

Summary: Supabase Auth sessions with registration through the `register_student` RPC (instant, no confirmation email), join-before-signup preserved via a pending-join handoff, and all pre-auth Pot access through the `lookup_pot_by_code` RPC.

## The decision (revised 2026-08-19 after empirical findings, see lesson 003)

The SPEC requires seeing the Pot before any account exists and finalizing membership right after auth. With RLS on (decision 002), an anonymous browser cannot read the pots table directly, so:

- Class-code lookup is the security-definer RPC `lookup_pot_by_code`, executable by anon. It accepts a six-character code (case-insensitive) and returns only safe display fields: Pot title, description, owner display name, member count, note count, last activity, and whether the caller is already a member. It never returns the Pot ID; joining goes by code.
- Registration is the security-definer RPC `register_student(email, password, display_name)`: it creates the confirmed auth user and identity directly (the pattern Supabase documents for seeding users), because GoTrue-native signUp is unusable on this project: email confirmations are on by default, the MCP tools cannot flip that setting, and the built-in mailer rate limit rejects the second signup within an hour. After the RPC, the client signs in with `signInWithPassword` normally; sessions, refresh, and sign-out are stock Supabase Auth. The profile row comes from the `on_auth_user_created` trigger.
- The pending join (the validated code) is kept client-side through signup/signin (sessionStorage plus a redirect param) and finalized right after authentication via the idempotent `join_pot_with_code` RPC, then the Pot opens.
- Signup collects exactly display name, email, password.
- Returning users land on their Pot list and never re-enter a code for a Pot they already joined; entering a code for a Pot they are already in just opens it.

## Why it mattered

The join-without-login-wall flow is the product's first promise and the top item in the final standard. Doing the lookup client-side would have required either public read access to pots (leaks all Pots) or shipping the service key to the browser. One narrow server endpoint keeps RLS strict everywhere else.
