-- Maintainer and owner moderation.
--
-- "Delete a note" cannot mean destroying it. The product promises that a
-- contributor's original survives forever and that every version stays
-- readable, so removal takes the note out of the class feed and search while
-- the contribution, its versions, and its attribution stay exactly where they
-- were. A maintainer can put it back. Only an owner can delete the Pot itself,
-- which is the one genuinely destructive action and already exists.
--
-- Generated study material is different: it is disposable by design and can be
-- rebuilt from the notes, so maintainers delete it outright.

alter table public.shared_notes
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles (id),
  add column removed_reason text check (removed_reason is null or char_length(removed_reason) <= 500);

create index shared_notes_visible_idx on public.shared_notes (pot_id, shared_at desc) where removed_at is null;

create or replace function public.set_shared_note_removed(
  p_note_id uuid,
  p_removed boolean,
  p_reason text
)
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
  select pot_id into v_pot from public.shared_notes where id = p_note_id;
  if v_pot is null then raise exception 'note_not_found'; end if;
  -- Re-checked here rather than trusted from the caller: this is the moment
  -- the change actually happens.
  if not public.is_pot_maintainer(v_pot) then raise exception 'not_maintainer'; end if;

  if p_removed then
    if nullif(trim(coalesce(p_reason, '')), '') is null then
      raise exception 'reason_required';
    end if;
    update public.shared_notes
    set removed_at = now(), removed_by = v_uid, removed_reason = left(trim(p_reason), 500)
    where id = p_note_id;
  else
    update public.shared_notes
    set removed_at = null, removed_by = null, removed_reason = null
    where id = p_note_id;
  end if;
end;
$$;

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
  if v_pot is null then raise exception 'not_found'; end if;
  if not public.is_pot_maintainer(v_pot) then raise exception 'not_maintainer'; end if;
  delete from public.study_sets where id = p_study_set_id;
end;
$$;

-- A maintainer can clear any card in their Pot; everyone else only their own,
-- which the existing note_flashcards_delete_own policy already allows.
create policy note_flashcards_delete_maintainer on public.note_flashcards
  for delete using (public.is_pot_maintainer(pot_id));

revoke execute on function public.set_shared_note_removed(uuid, boolean, text) from public, anon;
revoke execute on function public.delete_study_set(uuid) from public, anon;
grant execute on function public.set_shared_note_removed(uuid, boolean, text) to authenticated;
grant execute on function public.delete_study_set(uuid) to authenticated;
