-- Bug pass: RLS hardening.
--
-- contributions_update let an author move a draft into any Pot by UUID
-- (membership was only checked on insert), which combined with the old
-- share_contribution gap allowed cross-Pot note injection. attachments
-- could be added to already-shared contributions (bypassing maintainer
-- review) and their storage objects deleted after sharing (destroying the
-- file behind a published note). proposal_events_insert let a proposer
-- forge decision-kind history entries.

drop policy contributions_update on public.contributions;
create policy contributions_update on public.contributions for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared')
  with check (
    author_id = (select auth.uid())
    and status <> 'shared'
    and public.is_pot_member(pot_id)
  );

drop policy attachments_insert on public.attachments;
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_pot_member(pot_id)
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_id
        and c.author_id = (select auth.uid())
        and c.pot_id = attachments.pot_id
        and c.status <> 'shared'
    )
  );

-- Decision kinds are written only by the security-definer RPCs, which
-- bypass RLS. Client inserts are limited to discussion comments plus the
-- proposer's own submission marker.
drop policy proposal_events_insert on public.proposal_events;
create policy proposal_events_insert on public.proposal_events for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and (
      (
        kind = 'comment'
        and exists (
          select 1 from public.revision_proposals p
          where p.id = proposal_id
            and (p.proposer_id = (select auth.uid()) or public.is_pot_maintainer(p.pot_id))
        )
      )
      or (
        kind = 'submitted'
        and exists (
          select 1 from public.revision_proposals p
          where p.id = proposal_id and p.proposer_id = (select auth.uid())
        )
      )
    )
  );

drop policy attachments_storage_insert on storage.objects;
create policy attachments_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_pot_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.contributions c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.author_id = (select auth.uid())
        and c.pot_id = ((storage.foldername(name))[1])::uuid
        and c.status <> 'shared'
    )
  );

drop policy attachments_storage_delete on storage.objects;
create policy attachments_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and owner_id::uuid = (select auth.uid())
    and exists (
      select 1 from public.contributions c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.author_id = (select auth.uid())
        and c.status <> 'shared'
    )
  );
