-- Bug pass round 2: database-enforced rate limiting.
--
-- Every privileged RPC and every client-writable hot table gets a fixed
-- window rate limit enforced inside Postgres, keyed per user for
-- authenticated actions and per IP (x-forwarded-for) for anonymous ones.
-- This works regardless of client because the database is the only door.
-- Limits are far above honest classroom usage and far below abuse volume.
-- dev_seed/dev_reseed set app.bypass_rate_limit for their bulk inserts.

create table public.rate_limits (
  action text not null,
  key text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (action, key)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Best-effort client address for anonymous callers; PostgREST exposes the
-- proxied request headers. Falls back to a shared bucket when absent.
create or replace function public.client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    v_ip := split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', ''), ',', 1);
  exception when others then
    v_ip := null;
  end;
  return coalesce(nullif(trim(v_ip), ''), 'unknown');
end;
$$;
revoke execute on function public.client_ip() from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_action text,
  p_key text,
  p_max integer,
  p_window interval
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if current_setting('app.bypass_rate_limit', true) = 'on' then
    return;
  end if;

  insert into rate_limits as r (action, key, window_start, count)
  values (p_action, p_key, now(), 1)
  on conflict (action, key) do update set
    count = case when r.window_start < now() - p_window then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning r.count into v_count;

  if v_count > p_max then
    raise exception 'rate_limited';
  end if;

  -- Opportunistic sweep when a window opens: stale rows carry no signal.
  if v_count = 1 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;
end;
$$;
revoke execute on function public.consume_rate_limit(text, text, integer, interval) from public, anon, authenticated;

-- Direct-write tables get a per-user insert limiter via trigger; RPC paths
-- above carry their own limits. TG_ARGV = (max, window).
create or replace function public.rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform consume_rate_limit(
    tg_table_name || '_insert',
    'user:' || coalesce((select auth.uid())::text, 'anon'),
    tg_argv[0]::integer,
    tg_argv[1]::interval
  );
  return new;
end;
$$;
revoke execute on function public.rate_limit_insert() from public, anon, authenticated;

create trigger rate_limit before insert on public.contributions
  for each row execute function public.rate_limit_insert('120', '1 hour');
create trigger rate_limit before insert on public.revision_proposals
  for each row execute function public.rate_limit_insert('30', '1 hour');
create trigger rate_limit before insert on public.proposal_events
  for each row execute function public.rate_limit_insert('60', '1 hour');
create trigger rate_limit before insert on public.attachments
  for each row execute function public.rate_limit_insert('60', '1 hour');
create trigger rate_limit before insert on public.sections
  for each row execute function public.rate_limit_insert('60', '1 hour');

-- The rate-limited RPCs, re-emitted with their limits in place.
-- lookup_pot_by_code becomes volatile because consuming a limit writes.

create or replace function public.lookup_pot_by_code(p_code text)
returns json
language plpgsql
volatile
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
  perform consume_rate_limit('lookup_pot_by_code', 'ip:' || client_ip(), 60, interval '10 minutes');
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

create or replace function public.register_student(
  p_email text,
  p_password text,
  p_display_name text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = auth, public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid := gen_random_uuid();
begin
  perform consume_rate_limit('register_student', 'ip:' || client_ip(), 20, interval '1 hour');
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if p_password is null or char_length(p_password) < 8 then
    raise exception 'weak_password';
  end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'invalid_display_name';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email_taken';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    is_sso_user, is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', trim(p_display_name)),
    now(),
    now(),
    '', '', '', '', '',
    false,
    false
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  return v_user_id;
end;
$$;

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
  perform consume_rate_limit('join_pot_with_code', 'user:' || v_uid::text, 60, interval '1 hour');

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
  perform consume_rate_limit('create_pot', 'user:' || v_uid::text, 30, interval '1 hour');
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
  perform consume_rate_limit('regenerate_class_code', 'user:' || v_uid::text, 20, interval '1 hour');

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
  perform consume_rate_limit('share_contribution', 'user:' || v_uid::text, 60, interval '1 hour');
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
  perform consume_rate_limit('resubmit_proposal', 'user:' || v_uid::text, 60, interval '1 hour');
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
  perform consume_rate_limit('remove_member', 'user:' || v_uid::text, 60, interval '1 hour');
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
  perform consume_rate_limit('set_member_role', 'user:' || v_uid::text, 60, interval '1 hour');
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
