# 005 RLS is authorization, not a query filter

Summary: A policy that grants visibility wider than "my own rows" means queries must still filter explicitly; relying on RLS to scope "my memberships" returned every member of the pot.

## What happened

`getUserPots()` queried `memberships.select("role, pots(...)")` with no `user_id` filter, assuming RLS would return only the caller's rows. The memberships select policy intentionally lets members read the WHOLE roster of their pots, so a member of the seeded 4-person pot got 4 rows: the dashboard showed four copies of Biology 101 with other people's roles, and React logged duplicate-key warnings (which is what surfaced it).

## The rule

For every table whose select policy is broader than `user_id = auth.uid()` (memberships, profiles, shared_notes, proposals), decide per query whether it wants "mine" or "all visible" and write the filter accordingly. RLS defines the outer boundary; the query defines the intent.
