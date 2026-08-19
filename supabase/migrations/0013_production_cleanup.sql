-- Production goes live clean. Removes every dev-seed account and Pot (all
-- accounts are @meltingpot.dev; nothing else has ever signed up) and drops
-- the dev-only seed functions so no authenticated user can rebuild seed
-- data in production. Local development against a fresh project can
-- re-apply 0006/0009/0010 to get them back.

delete from storage.objects where bucket_id = 'attachments';

delete from public.pots
where owner_id in (
  select id from auth.users where email like '%@meltingpot.dev'
);

delete from auth.users where email like '%@meltingpot.dev';

drop function if exists public.dev_reseed();
drop function if exists public.dev_seed();
