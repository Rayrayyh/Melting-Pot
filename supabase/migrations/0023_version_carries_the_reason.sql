-- A reader of version 3 could see the new words and one counting sentence, but
-- not why the note changed. The reason a corrector picked and the explanation
-- they wrote both lived on revision_proposals, which row level security shows
-- only to the proposer and the maintainers, so the class never saw either.
--
-- They are copied onto the version at the moment a correction is accepted.
-- Copied rather than joined: a version is the historical record, and it must
-- not change if the proposal behind it is ever edited.
--
-- decide_proposal is redefined here in full because plpgsql has no way to
-- amend one statement. This body is 0014's, rate limiting included, plus the
-- two columns. 0011's older body is NOT the base: it predates the limiter.

alter table public.note_versions
  add column if not exists reason text,
  add column if not exists explanation text;

comment on column public.note_versions.reason is
  'The correction reason, copied from the proposal when it was accepted.';
comment on column public.note_versions.explanation is
  'The corrector''s explanation, copied from the proposal when it was accepted.';

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
  perform consume_rate_limit('decide_proposal', 'user:' || v_uid::text, 120, interval '1 hour');
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
      source, change_summary, reason, explanation
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
      p_change_summary,
      v_proposal.reason,
      v_proposal.explanation
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
