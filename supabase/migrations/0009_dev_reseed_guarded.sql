-- Dev-only: lets the e2e suite reset the database to the seeded state.
-- Callable only by signed-in dev-seed users (@meltingpot.dev emails, which
-- exist only in development). Dropped together with dev_seed before the
-- production deploy (plan step 13).

create or replace function public.dev_reseed()
returns void
language plpgsql
volatile
security definer
set search_path = public, auth, extensions
as $$
begin
  if not exists (
    select 1 from auth.users
    where id = (select auth.uid()) and email like '%@meltingpot.dev'
  ) then
    raise exception 'not_allowed';
  end if;

  -- Scrub accounts and pots created by test runs, then reseed.
  delete from public.pots
  where owner_id in (
    select id from auth.users where email like 'e2e.%@meltingpot.dev'
  );
  delete from auth.users where email like 'e2e.%@meltingpot.dev';
  perform public.dev_seed();
end;
$$;

revoke execute on function public.dev_reseed() from public, anon;
grant execute on function public.dev_reseed() to authenticated;
