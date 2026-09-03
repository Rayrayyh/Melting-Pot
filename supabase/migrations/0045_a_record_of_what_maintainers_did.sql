-- A record of what maintainers did, and who let whom in.
--
-- Everything a maintainer can do to somebody else's work happens through a
-- definer function: accepting a correction, removing a note or a study set,
-- promoting a member, removing one. All of it was invisible afterwards. A
-- class that trusts one person to decide corrections should be able to see
-- what that person decided, and an outside scan asked the same question of
-- the administrative surfaces.
--
-- Triggers rather than edits to those functions, deliberately. Re-emitting a
-- plpgsql body to add one insert is how 0031 silently deleted two guards
-- (memory/lessons/011), and a trigger also catches the paths a function does
-- not own: a direct statement in the SQL editor, a future RPC, a cascade.
--
-- Reading is a maintainer's right in their own Pot and nobody else's. Writing
-- has no policy at all: the trigger is definer, so the table can only be
-- written by the database itself, and no client can forge or erase an entry.

create table public.admin_events (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  -- Null when the actor was the platform rather than a person: a service
  -- role script, or a cascade from a deleted account.
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  -- The thing acted on: a member, a note, a proposal, a study set.
  subject_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_events_pot_idx on public.admin_events (pot_id, created_at desc);

alter table public.admin_events enable row level security;

create policy admin_events_select on public.admin_events
  for select to authenticated
  using (public.is_pot_maintainer(pot_id));

/* One writer for every trigger below. Definer, so the insert lands despite
   the table having no insert policy for anyone. */
create or replace function public.log_admin_event(
  p_pot_id uuid,
  p_kind text,
  p_subject_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_pot_id is null then return; end if;
  insert into public.admin_events (pot_id, actor_id, kind, subject_id, detail)
  values (p_pot_id, (select auth.uid()), p_kind, p_subject_id, coalesce(p_detail, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_admin_event(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- Membership: who joined, who changed a role, who was removed.
create or replace function public.tg_log_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_admin_event(new.pot_id, 'member_joined', new.user_id,
      jsonb_build_object('role', new.role));
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    perform public.log_admin_event(new.pot_id, 'member_role_changed', new.user_id,
      jsonb_build_object('from', old.role, 'to', new.role));
  elsif tg_op = 'DELETE' then
    perform public.log_admin_event(old.pot_id, 'member_removed', old.user_id,
      jsonb_build_object('role', old.role));
  end if;
  return null;
end;
$$;

create trigger log_membership_change
  after insert or update or delete on public.memberships
  for each row execute function public.tg_log_membership();

-- Corrections: every decision a maintainer made, and what they said.
create or replace function public.tg_log_proposal_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    perform public.log_admin_event(new.pot_id, 'correction_' || new.status, new.id,
      jsonb_build_object(
        'noteId', new.note_id,
        'proposerId', new.proposer_id,
        'decidedBy', new.decided_by,
        'note', new.decision_note
      ));
  end if;
  return null;
end;
$$;

create trigger log_proposal_decision
  after update on public.revision_proposals
  for each row execute function public.tg_log_proposal_decision();

-- Moderation: a note, a study set or a card taken down or put back.
create or replace function public.tg_log_note_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.removed_at is distinct from old.removed_at then
    perform public.log_admin_event(
      new.pot_id,
      case when new.removed_at is null then 'note_restored' else 'note_removed' end,
      new.id,
      jsonb_build_object('reason', new.removed_reason)
    );
  end if;
  return null;
end;
$$;

create trigger log_note_moderation
  after update on public.shared_notes
  for each row execute function public.tg_log_note_moderation();

create or replace function public.tg_log_study_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.removed_at is distinct from old.removed_at then
    perform public.log_admin_event(
      new.pot_id,
      case when new.removed_at is null then 'study_set_restored' else 'study_set_removed' end,
      new.id,
      jsonb_build_object('reason', new.removed_reason, 'kind', new.kind)
    );
  end if;
  return null;
end;
$$;

create trigger log_study_set_moderation
  after update on public.study_sets
  for each row execute function public.tg_log_study_moderation();

-- Cards carry no reason column, so they get their own writer rather than a
-- shared one reaching for a field that is not there.
create or replace function public.tg_log_flashcard_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.removed_at is distinct from old.removed_at then
    perform public.log_admin_event(
      new.pot_id,
      case when new.removed_at is null then 'card_restored' else 'card_removed' end,
      new.id,
      jsonb_build_object('noteId', new.note_id)
    );
  end if;
  return null;
end;
$$;

create trigger log_flashcard_moderation
  after update on public.note_flashcards
  for each row execute function public.tg_log_flashcard_moderation();
