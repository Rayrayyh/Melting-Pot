-- Bug pass round 2: attachment reads leaked unshared drafts.
--
-- attachments_select and attachments_storage_select gated on pot membership
-- alone, so any member could read or download the files attached to another
-- member's still-private draft contribution. Reads are now limited to
-- attachments whose contribution is shared, plus the author's own files.

drop policy attachments_select on public.attachments;
create policy attachments_select on public.attachments for select to authenticated
  using (
    public.is_pot_member(pot_id)
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_id
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
        and (c.author_id = (select auth.uid()) or c.status = 'shared')
    )
  );
