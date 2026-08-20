-- SPEC: the original raw submission of a SHARED note must always remain
-- accessible to the class. Contributions stay private to their author until
-- shared; once shared, members of the pot may read them (never edit).

drop policy contributions_select on public.contributions;
create policy contributions_select on public.contributions for select to authenticated
  using (
    author_id = (select auth.uid())
    or (status = 'shared' and public.is_pot_member(pot_id))
  );
