-- The second factor was a screen, not a boundary.
--
-- A correct password issues a valid aal1 session. Everything after that lived
-- in the browser: the "One more step" card was React state, so a reload, a
-- direct URL, or a REST call carried full authority without the code ever
-- being entered. The app now stops that at the page and the proxy, but an
-- extracted token would still have reached PostgREST directly.
--
-- Rather than thread a check through every policy and RPC, it goes into the
-- two functions they all already ask: is_pot_member and is_pot_maintainer.
-- Nothing in this product is readable or writable without one of them.
--
-- Accounts with no factor enrolled are unaffected, which is nearly everyone:
-- has_required_aal() is true whenever there is nothing outstanding.

create or replace function public.has_required_aal()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = (select auth.uid())
        and f.status = 'verified'
    );
$$;

comment on function public.has_required_aal() is
  'True when the session has cleared every factor the account enrolled. Accounts without a verified factor always pass.';

revoke all on function public.has_required_aal() from public;
grant execute on function public.has_required_aal() to authenticated, anon;

create or replace function public.is_pot_member(p_pot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_required_aal() and exists (
    select 1 from memberships m
    where m.pot_id = p_pot_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_pot_maintainer(p_pot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_required_aal() and exists (
    select 1 from memberships m
    where m.pot_id = p_pot_id
      and m.user_id = (select auth.uid())
      and m.role in ('maintainer', 'owner')
  );
$$;
