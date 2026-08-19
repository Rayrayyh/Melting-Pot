-- Tighten function grants. Supabase default privileges grant EXECUTE on new
-- functions to anon and authenticated directly, so revoking from PUBLIC is
-- not enough; each unintended role grant must be revoked explicitly
-- (surfaced by the security advisor after migration 0002).
--
-- Intentionally anon-callable and left as-is:
--   lookup_pot_by_code (pre-auth Pot preview), register_student (signup).

-- Trigger functions are never callable via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Internal helpers: policies evaluate them as authenticated; anon never needs them.
revoke execute on function public.is_pot_member(uuid) from anon;
revoke execute on function public.is_pot_maintainer(uuid) from anon;
revoke execute on function public.shares_pot_with(uuid) from anon;
revoke execute on function public.generate_class_code() from anon, authenticated;
