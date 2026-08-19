-- Row level security for every table. Membership checks go through
-- security-definer helpers so policies never recurse into themselves.

-- Helpers ------------------------------------------------------------------

create or replace function public.is_pot_member(p_pot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.pot_id = p_pot_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_pot_maintainer(p_pot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.pot_id = p_pot_id
      and m.user_id = (select auth.uid())
      and m.role in ('maintainer', 'owner')
  );
$$;

create or replace function public.shares_pot_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships mine
    join memberships theirs on theirs.pot_id = mine.pot_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke execute on function public.is_pot_member(uuid) from public;
revoke execute on function public.is_pot_maintainer(uuid) from public;
revoke execute on function public.shares_pot_with(uuid) from public;
grant execute on function public.is_pot_member(uuid) to authenticated;
grant execute on function public.is_pot_maintainer(uuid) to authenticated;
grant execute on function public.shares_pot_with(uuid) to authenticated;

-- Enable RLS ---------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pots enable row level security;
alter table public.memberships enable row level security;
alter table public.sections enable row level security;
alter table public.contributions enable row level security;
alter table public.shared_notes enable row level security;
alter table public.note_versions enable row level security;
alter table public.revision_proposals enable row level security;
alter table public.proposal_events enable row level security;
alter table public.attachments enable row level security;

-- profiles: your own row, plus display names of people you share a Pot with.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_pot_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- pots: members read; owners edit identity and archive state.
-- Creation and code regeneration happen through security-definer RPCs.
create policy pots_select on public.pots for select to authenticated
  using (public.is_pot_member(id));
create policy pots_update on public.pots for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy pots_delete on public.pots for delete to authenticated
  using (owner_id = (select auth.uid()));

-- memberships: members see the roster; you may leave unless you own the Pot.
-- Joining and role changes happen through security-definer RPCs.
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_pot_member(pot_id));
create policy memberships_delete_self on public.memberships for delete to authenticated
  using (user_id = (select auth.uid()) and role <> 'owner');
-- Members may update only their own reading position (column grant below).
create policy memberships_update_self on public.memberships for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.memberships from authenticated;
grant update (last_seen_note_id) on public.memberships to authenticated;

-- sections: members read, maintainers organize.
create policy sections_select on public.sections for select to authenticated
  using (public.is_pot_member(pot_id));
create policy sections_insert on public.sections for insert to authenticated
  with check (public.is_pot_maintainer(pot_id));
create policy sections_update on public.sections for update to authenticated
  using (public.is_pot_maintainer(pot_id))
  with check (public.is_pot_maintainer(pot_id));
create policy sections_delete on public.sections for delete to authenticated
  using (public.is_pot_maintainer(pot_id));

-- contributions: private to their author until shared, and always owned by
-- the author. Sharing itself goes through the share_contribution RPC.
create policy contributions_select on public.contributions for select to authenticated
  using (author_id = (select auth.uid()));
create policy contributions_insert on public.contributions for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_pot_member(pot_id));
create policy contributions_update on public.contributions for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared')
  with check (author_id = (select auth.uid()) and status <> 'shared');
create policy contributions_delete on public.contributions for delete to authenticated
  using (author_id = (select auth.uid()) and status <> 'shared');

-- shared notes and versions: readable by members, written only by RPCs.
create policy shared_notes_select on public.shared_notes for select to authenticated
  using (public.is_pot_member(pot_id));
create policy note_versions_select on public.note_versions for select to authenticated
  using (exists (
    select 1 from public.shared_notes n
    where n.id = note_id and public.is_pot_member(n.pot_id)
  ));

-- revision proposals: visible to the proposer and to maintainers. The
-- proposer edits while pending or revision-requested; edits land as pending.
-- Decisions happen through the decide_proposal RPC.
create policy revision_proposals_select on public.revision_proposals for select to authenticated
  using (proposer_id = (select auth.uid()) or public.is_pot_maintainer(pot_id));
create policy revision_proposals_insert on public.revision_proposals for insert to authenticated
  with check (
    proposer_id = (select auth.uid())
    and public.is_pot_member(pot_id)
    and status = 'pending'
    and exists (
      select 1 from public.shared_notes n
      where n.id = note_id and n.pot_id = revision_proposals.pot_id
    )
  );
create policy revision_proposals_update on public.revision_proposals for update to authenticated
  using (
    proposer_id = (select auth.uid())
    and status in ('pending', 'revision_requested')
  )
  with check (
    proposer_id = (select auth.uid())
    and status = 'pending'
  );

-- proposal events: same audience as the proposal; anyone in that audience
-- can add to the discussion, always as themselves.
create policy proposal_events_select on public.proposal_events for select to authenticated
  using (exists (
    select 1 from public.revision_proposals p
    where p.id = proposal_id
      and (p.proposer_id = (select auth.uid()) or public.is_pot_maintainer(p.pot_id))
  ));
create policy proposal_events_insert on public.proposal_events for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from public.revision_proposals p
      where p.id = proposal_id
        and (p.proposer_id = (select auth.uid()) or public.is_pot_maintainer(p.pot_id))
    )
  );

-- attachments: members read; authors attach to their own unshared
-- contributions and can detach until the contribution is shared.
create policy attachments_select on public.attachments for select to authenticated
  using (public.is_pot_member(pot_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_pot_member(pot_id)
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_id
        and c.author_id = (select auth.uid())
        and c.pot_id = attachments.pot_id
    )
  );
create policy attachments_delete on public.attachments for delete to authenticated
  using (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_id
        and c.author_id = (select auth.uid())
        and c.status <> 'shared'
    )
  );
