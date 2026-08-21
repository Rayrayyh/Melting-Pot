-- Two boundaries that were checked in the app but not in the database.
--
-- Publishing: contributions_insert checked author and membership but never
-- status, so a direct PostgREST insert could create a row already marked
-- 'shared'. Migration 0008 then makes a shared contribution's raw text
-- readable by every member, so that one insert published unreviewed writing
-- and skipped share_contribution entirely. Inserts are drafts now. Sharing
-- stays with the RPC, which is where the review happens.
--
-- Attachments: the read policies checked membership in the attachment's Pot
-- and whether its contribution was shared, but never that the two agreed on
-- which Pot that was. Moving a draft to another Pot left its files behind, so
-- the old class could read a file belonging to a note they cannot see, and the
-- new class could not read their own note's file.
--
-- NOTE: the contributions_update policy written here is wrong and is replaced
-- by 0029b and then 0029c. It is kept so the ledger matches what ran.

drop policy contributions_insert on public.contributions;
create policy contributions_insert on public.contributions for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_pot_member(pot_id)
    and status = 'draft'
  );

drop policy contributions_update on public.contributions;
create policy contributions_update on public.contributions for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared')
  with check (
    author_id = (select auth.uid())
    and status <> 'shared'
    and pot_id = (
      select c.pot_id from public.contributions c where c.id = id
    )
  );

drop policy attachments_select on public.attachments;
create policy attachments_select on public.attachments for select to authenticated
  using (
    public.is_pot_member(pot_id)
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_id
        and c.pot_id = attachments.pot_id
        and (c.author_id = (select auth.uid()) or c.status = 'shared')
    )
  );

drop policy attachments_storage_select on storage.objects;
create policy attachments_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_pot_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.contributions c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.pot_id = ((storage.foldername(name))[1])::uuid
        and (c.author_id = (select auth.uid()) or c.status = 'shared')
    )
  );
