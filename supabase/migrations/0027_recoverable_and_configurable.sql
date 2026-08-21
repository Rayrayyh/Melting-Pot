-- Two things a maintainer could not undo, and two a Pot could not be told.
--
-- Removing a note has always been reversible: 0022 gave shared_notes a
-- removed_at and a panel to put one back. Removing a study set or a card was
-- not. delete_study_set ran a DELETE, and note_flashcards carried delete
-- policies, so a maintainer clearing a bad deck destroyed work that a whole
-- class may have been studying from, with nothing anywhere to restore it.
-- Both now soft-remove on the same shape as a note: who, when, and why.
--
-- The delete policies on note_flashcards are dropped rather than kept beside
-- the new path. Leaving them would mean two ways to remove a card, one of
-- which is unrecoverable, and the unrecoverable one would win every race.

alter table public.study_sets
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles (id) on delete set null,
  add column if not exists removed_reason text;

alter table public.note_flashcards
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles (id) on delete set null;

create index if not exists study_sets_live_idx
  on public.study_sets (pot_id, kind) where removed_at is null;
create index if not exists note_flashcards_live_idx
  on public.note_flashcards (pot_id) where removed_at is null;

comment on column public.study_sets.removed_at is
  'Set when a maintainer takes the set out of the Pot. The row stays: removal is reversible and the record of who built it survives.';
comment on column public.note_flashcards.removed_at is
  'Set when a card is taken out. The row stays, so the card can be put back and its writer stays credited.';

-- Removing a set no longer destroys it.
create or replace function public.delete_study_set(p_study_set_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pot uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select pot_id into v_pot from public.study_sets where id = p_study_set_id;
  if v_pot is null then raise exception 'study_set_not_found'; end if;
  if not public.is_pot_maintainer(v_pot) then raise exception 'not_pot_maintainer'; end if;

  update public.study_sets
  set removed_at = now(), removed_by = v_uid
  where id = p_study_set_id and removed_at is null;
end;
$$;

create or replace function public.restore_study_set(p_study_set_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pot uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select pot_id into v_pot from public.study_sets where id = p_study_set_id;
  if v_pot is null then raise exception 'study_set_not_found'; end if;
  if not public.is_pot_maintainer(v_pot) then raise exception 'not_pot_maintainer'; end if;

  update public.study_sets
  set removed_at = null, removed_by = null, removed_reason = null
  where id = p_study_set_id;
end;
$$;

-- A card is removed by its writer or by a maintainer, and put back by either.
create or replace function public.set_flashcard_removed(p_card_id uuid, p_removed boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pot uuid;
  v_owner uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select pot_id, created_by into v_pot, v_owner from public.note_flashcards where id = p_card_id;
  if v_pot is null then raise exception 'card_not_found'; end if;
  if v_owner <> v_uid and not public.is_pot_maintainer(v_pot) then
    raise exception 'not_allowed';
  end if;

  update public.note_flashcards
  set removed_at = case when p_removed then now() else null end,
      removed_by = case when p_removed then v_uid else null end
  where id = p_card_id;
end;
$$;

drop policy if exists note_flashcards_delete_maintainer on public.note_flashcards;
drop policy if exists note_flashcards_delete_own on public.note_flashcards;

-- Regenerating the same material restores it. The unique key is the
-- fingerprint, so a removed set is the row a rebuild collides with; leaving
-- removed_at set would make the rebuild land in a row nobody can see and the
-- Pot would look like generation had silently failed.
create or replace function public.save_study_set(
  p_pot_id uuid,
  p_kind text,
  p_fingerprint text,
  p_payload jsonb,
  p_model text,
  p_options jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_pot_member(p_pot_id) then raise exception 'not_pot_member'; end if;
  if p_kind not in ('summary', 'flashcards', 'practice') then
    raise exception 'invalid_kind';
  end if;

  insert into public.study_sets (pot_id, kind, source_fingerprint, payload, model, options, generated_by)
  values (p_pot_id, p_kind, left(p_fingerprint, 128), p_payload, left(p_model, 120), p_options, v_uid)
  on conflict (pot_id, kind, source_fingerprint)
    do update set payload = excluded.payload,
                  model = excluded.model,
                  options = excluded.options,
                  created_at = now(),
                  removed_at = null,
                  removed_by = null,
                  removed_reason = null
  returning id into v_id;
  return v_id;
end;
$$;

-- What a Pot can be told about itself.
--
-- join_open closes the door without changing the code, which regenerating
-- already does and which invalidates every invite already handed out. A class
-- that has finished enrolling wants the first, not the second.
--
-- study_generation decides who may spend a generation. A Pot on a shared quota
-- may want the class reading what is already there rather than each student
-- rebuilding it, and that is a policy question, not a permission one.
alter table public.pots
  add column if not exists join_open boolean not null default true,
  add column if not exists study_generation text not null default 'members';

alter table public.pots
  drop constraint if exists pots_study_generation_check;
alter table public.pots
  add constraint pots_study_generation_check
  check (study_generation in ('members', 'maintainers'));

comment on column public.pots.join_open is
  'False closes the Pot to new members without changing the class code, so invites already sent stay valid for whenever it reopens.';
comment on column public.pots.study_generation is
  'Who may spend a generation building study material: members, or maintainers only. Reading what already exists is never restricted.';

-- The door is checked where it is opened, not in the client.
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
  v_open boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  perform consume_rate_limit('join_pot_with_code', 'user:' || v_uid::text, 120, interval '1 hour');

  select id, join_open into v_pot_id, v_open
  from pots
  where class_code = upper(trim(p_code)) and archived_at is null;

  if v_pot_id is null then
    raise exception 'pot_not_found';
  end if;

  -- Someone already inside keeps their place: closing the door is about new
  -- members, and a member re-entering their own code should not be refused.
  if not v_open and not exists (
    select 1 from memberships where pot_id = v_pot_id and user_id = v_uid
  ) then
    raise exception 'pot_closed';
  end if;

  insert into memberships (pot_id, user_id, role)
  values (v_pot_id, v_uid, 'member')
  on conflict (pot_id, user_id) do nothing;

  return v_pot_id;
end;
$$;

revoke execute on function public.restore_study_set(uuid) from public, anon;
grant execute on function public.restore_study_set(uuid) to authenticated;
revoke execute on function public.set_flashcard_removed(uuid, boolean) from public, anon;
grant execute on function public.set_flashcard_removed(uuid, boolean) to authenticated;
