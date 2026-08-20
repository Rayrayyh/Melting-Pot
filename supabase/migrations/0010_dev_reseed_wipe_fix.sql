-- dev_seed wipes its pot by class_code, but tests can rename the pot or
-- regenerate the code, leaving an orphan that then blocks deleting the seed
-- users (pots_owner_id_fkey). Wipe by owner instead before reseeding.

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

  -- Scrub pots and accounts created or mutated by test runs, keyed on the
  -- immutable owner emails rather than mutable codes or titles.
  delete from public.pots
  where owner_id in (
    select id from auth.users
    where email like 'e2e.%@meltingpot.dev'
       or email in (
         'maya@meltingpot.dev', 'ava@meltingpot.dev',
         'omar@meltingpot.dev', 'priya@meltingpot.dev'
       )
  );
  delete from auth.users where email like 'e2e.%@meltingpot.dev';
  perform public.dev_seed();
end;
$$;
