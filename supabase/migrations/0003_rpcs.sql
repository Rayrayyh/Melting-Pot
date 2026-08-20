-- Privileged operations. Everything that RLS cannot express cleanly runs
-- through these security-definer functions, each validating the caller.

-- Code generation avoids ambiguous characters (0/O, 1/I/L) for readability.
create or replace function public.generate_class_code()
returns text
language sql
volatile
set search_path = public
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;
revoke execute on function public.generate_class_code() from public;

-- Pre-auth Pot preview: only safe display fields, never ids or the roster.
create or replace function public.lookup_pot_by_code(p_code text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pot pots%rowtype;
  v_owner_name text;
  v_member_count int;
  v_note_count int;
  v_last_shared timestamptz;
begin
  select * into v_pot
  from pots
  where class_code = upper(trim(p_code)) and archived_at is null;

  if not found then
    return null;
  end if;

  select display_name into v_owner_name from profiles where id = v_pot.owner_id;
  select count(*) into v_member_count from memberships where pot_id = v_pot.id;
  select count(*), max(shared_at) into v_note_count, v_last_shared
  from shared_notes where pot_id = v_pot.id;

  return json_build_object(
    'title', v_pot.title,
    'description', v_pot.description,
    'owner_name', v_owner_name,
    'member_count', v_member_count,
    'note_count', v_note_count,
    'last_shared_at', v_last_shared,
    'is_member', exists (
      select 1 from memberships
      where pot_id = v_pot.id and user_id = (select auth.uid())
    )
  );
end;
$$;
grant execute on function public.lookup_pot_by_code(text) to anon, authenticated;

create or replace function public.join_pot_with_code(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pot_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_pot_id
  from pots
  where class_code = upper(trim(p_code)) and archived_at is null;

  if v_pot_id is null then
    raise exception 'pot_not_found';
  end if;

  insert into memberships (pot_id, user_id, role)
  values (v_pot_id, v_uid, 'member')
  on conflict (pot_id, user_id) do nothing;

  return v_pot_id;
end;
$$;
revoke execute on function public.join_pot_with_code(text) from public, anon;
grant execute on function public.join_pot_with_code(text) to authenticated;

create or replace function public.create_pot(p_title text, p_description text default null)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_pot_id uuid;
  v_attempts int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'title_required';
  end if;

  loop
    v_code := generate_class_code();
    v_attempts := v_attempts + 1;
    begin
      insert into pots (title, description, class_code, owner_id)
      values (trim(p_title), nullif(trim(coalesce(p_description, '')), ''), v_code, v_uid)
      returning id into v_pot_id;
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  insert into memberships (pot_id, user_id, role) values (v_pot_id, v_uid, 'owner');

  return json_build_object('id', v_pot_id, 'class_code', v_code);
end;
$$;
revoke execute on function public.create_pot(text, text) from public, anon;
grant execute on function public.create_pot(text, text) to authenticated;

create or replace function public.regenerate_class_code(p_pot_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_attempts int := 0;
begin
  if not exists (select 1 from pots where id = p_pot_id and owner_id = v_uid) then
    raise exception 'not_pot_owner';
  end if;

  loop
    v_code := generate_class_code();
    v_attempts := v_attempts + 1;
    begin
      update pots set class_code = v_code where id = p_pot_id;
      exit;
    exception when unique_violation then
      if v_attempts >= 10 then
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  return v_code;
end;
$$;
revoke execute on function public.regenerate_class_code(uuid) from public, anon;
grant execute on function public.regenerate_class_code(uuid) to authenticated;

-- The contributor's explicit approval: turns their contribution into a
-- shared note with version 1. Only the author can call it, and only they
-- decide when. Nothing else publishes contributions.
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
revoke execute on function public.share_contribution(uuid, text, text, jsonb, text, text[], uuid) from public, anon;
grant execute on function public.share_contribution(uuid, text, text, jsonb, text, text[], uuid) to authenticated;

-- The maintainer decision. Accepting creates a new credited version;
-- the previous versions are immutable and remain readable.
create or replace function public.decide_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_note text default null,
  p_new_title text default null,
  p_new_summary text default null,
  p_new_body jsonb default null,
  p_new_body_text text default null,
  p_new_takeaways text[] default null,
  p_change_summary text default null
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
    select v.* into v_current
    from note_versions v
    join shared_notes n on n.current_version_id = v.id
    where n.id = v_proposal.note_id;

    if not found then
      raise exception 'note_version_missing';
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
revoke execute on function public.decide_proposal(uuid, text, text, text, text, jsonb, text, text[], text) from public, anon;
grant execute on function public.decide_proposal(uuid, text, text, text, text, jsonb, text, text[], text) to authenticated;

-- Editing or resubmitting keeps the SAME proposal and its history.
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
revoke execute on function public.resubmit_proposal(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.resubmit_proposal(uuid, text, text, text, text, text) to authenticated;

-- Roster management: maintainers remove members, owners also remove
-- maintainers; the owner can never be removed.
create or replace function public.remove_member(p_pot_id uuid, p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_caller_role pot_role;
  v_target_role pot_role;
begin
  select role into v_caller_role from memberships
  where pot_id = p_pot_id and user_id = v_uid;
  select role into v_target_role from memberships
  where pot_id = p_pot_id and user_id = p_user_id;

  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'not_pot_maintainer';
  end if;
  if v_target_role is null then
    raise exception 'member_not_found';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot_remove_owner';
  end if;
  if v_target_role = 'maintainer' and v_caller_role <> 'owner' then
    raise exception 'owner_required';
  end if;

  delete from memberships where pot_id = p_pot_id and user_id = p_user_id;
end;
$$;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

create or replace function public.set_member_role(p_pot_id uuid, p_user_id uuid, p_role pot_role)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_target_role pot_role;
begin
  if not exists (select 1 from pots where id = p_pot_id and owner_id = v_uid) then
    raise exception 'not_pot_owner';
  end if;
  if p_role not in ('member', 'maintainer') then
    raise exception 'invalid_role';
  end if;

  select role into v_target_role from memberships
  where pot_id = p_pot_id and user_id = p_user_id;

  if v_target_role is null then
    raise exception 'member_not_found';
  end if;
  if v_target_role = 'owner' then
    raise exception 'cannot_change_owner_role';
  end if;

  update memberships set role = p_role
  where pot_id = p_pot_id and user_id = p_user_id;
end;
$$;
revoke execute on function public.set_member_role(uuid, uuid, pot_role) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, pot_role) to authenticated;
