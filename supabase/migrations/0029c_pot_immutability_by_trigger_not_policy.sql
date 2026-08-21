-- Enforcing pot_id immutability inside the contributions UPDATE policy was a
-- mistake twice over. The first attempt bound `id` to the subquery's own
-- column and always matched every row. Qualifying it fixed that and exposed
-- the real problem: a policy on contributions that reads contributions
-- re-enters its own policy, which Postgres stops as infinite recursion. Every
-- draft autosave failed.
--
-- A column is made immutable with a trigger, which sees old and new directly
-- and never consults a policy. The update policy goes back to what it was.

drop policy contributions_update on public.contributions;
create policy contributions_update on public.contributions for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared')
  with check (author_id = (select auth.uid()) and status <> 'shared');

create or replace function public.contributions_pot_is_immutable()
returns trigger
language plpgsql
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

drop trigger if exists contributions_pot_is_immutable on public.contributions;
create trigger contributions_pot_is_immutable
  before update on public.contributions
  for each row execute function public.contributions_pot_is_immutable();
