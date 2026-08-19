# 004 Auth and join flow

Summary: Supabase Auth (email + password + display name), join-before-signup preserved via a pending-join handoff, and all pre-auth Pot access through one scoped server endpoint.

## The decision

The SPEC requires seeing the Pot before any account exists and finalizing membership right after auth. With RLS on (decision 002), an anonymous browser cannot read the pots table directly, so:

- Class-code lookup runs in a server route handler using the service role. It accepts a six-character code (case-insensitive), and returns only safe display fields: Pot title, description, owner display name, member count, recent activity. It never returns the Pot ID enumerable from codes alone beyond what the join needs, and it is rate-limit friendly (single lookup per submit, no code listing anywhere).
- The pending join (the validated code) is kept client-side through signup/signin (sessionStorage plus a redirect param) and finalized server-side immediately after authentication: validate the code again, create the membership, open the Pot.
- Signup collects exactly display name, email, password. Email confirmation is disabled in Supabase Auth settings for the MVP so signup is instant; revisit before any real classroom use.
- Returning users land on their Pot list and never re-enter a code for a Pot they already joined; entering a code for a Pot they are already in just opens it.

## Why it mattered

The join-without-login-wall flow is the product's first promise and the top item in the final standard. Doing the lookup client-side would have required either public read access to pots (leaks all Pots) or shipping the service key to the browser. One narrow server endpoint keeps RLS strict everywhere else.
