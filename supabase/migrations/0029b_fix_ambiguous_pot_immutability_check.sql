-- The immutability check in 0029 was written as `where c.id = id`, where the
-- bare `id` binds to the subquery's own column rather than the row being
-- updated. That is `c.id = c.id`: always true, so the subquery returns every
-- contribution and the update fails with "more than one row returned".
-- Qualifying the outer reference is the fix.
--
-- NOTE: still wrong, for a different reason. See 0029c.

drop policy contributions_update on public.contributions;
create policy contributions_update on public.contributions for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared')
  with check (
    author_id = (select auth.uid())
    and status <> 'shared'
    and pot_id = (
      select c.pot_id from public.contributions c where c.id = contributions.id
    )
  );
