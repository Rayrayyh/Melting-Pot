-- The study tables 0031 added were left on one lock instead of two.
--
-- 0031 said "writes have no policy, so the definer functions are the only path
-- in", and that is true: row level security denies an operation with no
-- permissive policy, and it was checked live. A member's forged insert is
-- refused, and an UPDATE or DELETE aimed at a real row reports success while
-- changing nothing, because zero rows are visible to a statement RLS will not
-- let through.
--
-- What it missed is that the rest of this schema does not rely on that alone.
-- 0015 revoked every verb the app does not use, so `authenticated` cannot even
-- name the operation, and RLS is the second line rather than the only one.
-- study_sets carries SELECT and DELETE and nothing else; study_attempts,
-- study_responses and study_set_keys arrived with the whole default set,
-- INSERT and UPDATE and DELETE included. They were one accidental `create
-- policy` away from being writable, and that is exactly the shape 0030 got
-- wrong once already.
--
-- So they get the second lock. The app reads attempts and responses directly
-- (a member reads their own, a maintainer reads the Pot's) and writes them
-- only through submit_practice_test and record_flashcard_run, which are
-- security definer and unaffected by these grants. Nothing reads
-- study_set_keys through PostgREST in any role, so it keeps nothing at all.

revoke insert, update, delete, truncate, references, trigger
  on public.study_attempts from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.study_responses from authenticated, anon;
revoke all on public.study_set_keys from authenticated, anon;

-- What remains, and what the app actually needs.
grant select on public.study_attempts to authenticated;
grant select on public.study_responses to authenticated;
