-- Bug pass: publish-path guards for the privileged RPCs.
--
-- share_contribution and resubmit_proposal never re-checked that the caller
-- is still a member of the Pot, so a removed or departed member could keep
-- publishing into it. share_contribution also ignored archived Pots.
-- decide_proposal published client-computed content with no staleness
-- check, so a stale review tab could silently revert a just-accepted
-- correction. Accepts now lock the note row, verify the expected current
-- version, and verify the selected sentence still appears.

create or replace function public.share_contribution(
  p_contribution_id uuid,
  p_title text,
  p_summary text,
  p_body jsonb,
  p_body_text text,
  p_takeaways text[],
  p_section_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_contribution contributions%rowtype;
  v_note_id uuid;
  v_version_id uuid;
begin
  select * into v_contribution
  from contributions
  where id = p_contribution_id and author_id = v_uid
  for update;

  if not found then
    raise exception 'contribution_not_found';
  end if;
  if v_contribution.status = 'shared' then
    raise exception 'already_shared';
  end if;
  if not is_pot_member(v_contribution.pot_id) then
    raise exception 'not_pot_member';
  end if;
  if exists (
    select 1 from pots where id = v_contribution.pot_id and archived_at is not null
  ) then
    raise exception 'pot_archived';
  end if;
  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'title_required';
  end if;
  if p_section_id is not null and not exists (
    select 1 from sections where id = p_section_id and pot_id = v_contribution.pot_id
  ) then
    raise exception 'section_not_in_pot';
  end if;

  insert into shared_notes (pot_id, section_id, contribution_id, contributor_id)
  values (v_contribution.pot_id, p_section_id, v_contribution.id, v_uid)
  returning id into v_note_id;

  insert into note_versions (
    note_id, version_number, title, summary, body, body_text, takeaways, contributor_id
  )
  values (
    v_note_id, 1, trim(p_title), coalesce(p_summary, ''), coalesce(p_body, '[]'::jsonb),
    coalesce(p_body_text, ''), coalesce(p_takeaways, '{}'), v_uid
  )
  returning id into v_version_id;

  update shared_notes set current_version_id = v_version_id where id = v_note_id;

  update contributions
  set status = 'shared', section_id = p_section_id, shared_note_id = v_note_id
  where id = v_contribution.id;

  return v_note_id;
end;
$$;

create or replace function public.resubmit_proposal(
  p_proposal_id uuid,
  p_selected_text text,
  p_proposed_text text,
  p_explanation text default null,
  p_source text default null,
  p_diff_summary text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_proposal revision_proposals%rowtype;
  v_was_revision boolean;
begin
  select * into v_proposal
  from revision_proposals
  where id = p_proposal_id and proposer_id = v_uid
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;
  if not is_pot_member(v_proposal.pot_id) then
    raise exception 'not_pot_member';
  end if;
  if v_proposal.status not in ('pending', 'revision_requested') then
    raise exception 'proposal_not_editable';
  end if;

  v_was_revision := v_proposal.status = 'revision_requested';

  update revision_proposals
  set selected_text = p_selected_text,
      proposed_text = p_proposed_text,
      explanation = p_explanation,
      source = p_source,
      diff_summary = p_diff_summary,
      status = 'pending',
      decided_by = null,
      decided_at = null,
      decision_note = null
  where id = v_proposal.id;

  insert into proposal_events (proposal_id, actor_id, kind)
  values (v_proposal.id, v_uid, case when v_was_revision then 'resubmitted' else 'edited' end::proposal_event_kind);
end;
$$;

-- decide_proposal gains p_expected_version_id, so the old signature goes.
drop function if exists public.decide_proposal(uuid, text, text, text, text, jsonb, text, text[], text);

create or replace function public.decide_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_note text default null,
  p_new_title text default null,
  p_new_summary text default null,
  p_new_body jsonb default null,
  p_new_body_text text default null,
  p_new_takeaways text[] default null,
  p_change_summary text default null,
  p_expected_version_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_proposal revision_proposals%rowtype;
  v_current note_versions%rowtype;
  v_current_version_id uuid;
  v_version_id uuid;
  v_event proposal_event_kind;
begin
  select * into v_proposal
  from revision_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;
  if not is_pot_maintainer(v_proposal.pot_id) then
    raise exception 'not_pot_maintainer';
  end if;
  if v_proposal.status <> 'pending' then
    raise exception 'proposal_not_pending';
  end if;
  if p_decision not in ('accepted', 'revision_requested', 'declined') then
    raise exception 'invalid_decision';
  end if;
  if p_decision in ('revision_requested', 'declined')
     and (p_note is null or char_length(trim(p_note)) = 0) then
    raise exception 'note_required';
  end if;

  if p_decision = 'accepted' then
    -- Serialize accepts per note so concurrent decisions cannot both build
    -- on the same base version.
    select current_version_id into v_current_version_id
    from shared_notes
    where id = v_proposal.note_id
    for update;

    if p_expected_version_id is not null
       and v_current_version_id is distinct from p_expected_version_id then
      raise exception 'proposal_conflict';
    end if;

    select v.* into v_current
    from note_versions v
    where v.id = v_current_version_id;

    if not found then
      raise exception 'note_version_missing';
    end if;
    if position(v_proposal.selected_text in v_current.body_text) = 0 then
      raise exception 'proposal_conflict';
    end if;
    if p_new_body_text is null or char_length(trim(p_new_body_text)) = 0 then
      raise exception 'new_content_required';
    end if;

    insert into note_versions (
      note_id, version_number, title, summary, body, body_text, takeaways,
      contributor_id, correction_contributor_id, reviewed_by, proposal_id,
      source, change_summary
    )
    values (
      v_proposal.note_id,
      v_current.version_number + 1,
      coalesce(nullif(trim(coalesce(p_new_title, '')), ''), v_current.title),
      coalesce(p_new_summary, v_current.summary),
      coalesce(p_new_body, v_current.body),
      p_new_body_text,
      coalesce(p_new_takeaways, v_current.takeaways),
      v_current.contributor_id,
      v_proposal.proposer_id,
      v_uid,
      v_proposal.id,
      v_proposal.source,
      p_change_summary
    )
    returning id into v_version_id;

    update shared_notes set current_version_id = v_version_id
    where id = v_proposal.note_id;
  end if;

  update revision_proposals
  set status = p_decision::proposal_status,
      decided_by = v_uid,
      decided_at = now(),
      decision_note = p_note
  where id = v_proposal.id;

  v_event := p_decision::proposal_event_kind;
  insert into proposal_events (proposal_id, actor_id, kind, body)
  values (v_proposal.id, v_uid, v_event, p_note);
end;
$$;
revoke execute on function public.decide_proposal(uuid, text, text, text, text, jsonb, text, text[], text, uuid) from public, anon;
grant execute on function public.decide_proposal(uuid, text, text, text, text, jsonb, text, text[], text, uuid) to authenticated;
