-- Two hardening gaps the database linter flags, neither reachable today but
-- both free to close.
--
-- 1. contributions_pot_is_immutable ran with a mutable search_path.
--
-- This is the trigger from 0029c that stops a contribution being moved between
-- Pots, because attachments are stored under the original Pot id and cannot
-- follow a move. It is SECURITY INVOKER and its body resolves no tables and no
-- functions: it compares two trigger fields and raises. So there is nothing a
-- planted schema could shadow, and the practical risk is zero.
--
-- It is set anyway. A function whose search_path is pinned stays safe when
-- someone later adds a lookup to it, and a linter warning nobody can dismiss
-- is a warning everybody learns to scroll past. The body below is carried over
-- verbatim from the live definition, per memory/lessons/011.
--
-- 2. has_required_aal() was executable by anon.
--
-- It is the assurance-level helper every policy asks: has this person cleared
-- their second factor, or do they not have one. An anonymous caller has no
-- uid, so the factor lookup finds nothing and it answers true, which is both
-- correct and useless to them. But it is a SECURITY DEFINER function reading
-- auth.mfa_factors, exposed at /rest/v1/rpc/has_required_aal to people who
-- have not signed in, and no part of this product calls it from there. The
-- policies that use it run as the definer and are unaffected by the grant.

create or replace function public.contributions_pot_is_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pot_id is distinct from old.pot_id then
    raise exception 'contribution_pot_is_immutable'
      using errcode = 'check_violation',
            hint = 'Attachments are stored under the original Pot id and cannot follow a move.';
  end if;
  return new;
end;
$$;

revoke execute on function public.has_required_aal() from anon, public;
grant execute on function public.has_required_aal() to authenticated;
