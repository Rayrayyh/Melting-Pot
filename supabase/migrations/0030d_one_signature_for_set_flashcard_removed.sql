-- 0030 added a p_reason parameter to set_flashcard_removed. Postgres does not
-- replace a function when the argument list differs, it overloads it, so the
-- database ended up with set_flashcard_removed(uuid, boolean) carrying the old
-- body and set_flashcard_removed(uuid, boolean, text) carrying the new one.
--
-- Two consequences, both bad. The browser calls it with two named arguments,
-- so PostgREST could no longer choose a candidate and every card deletion
-- failed. And where it did resolve, it resolved to the old body: the
-- membership requirement that was the entire point of the change was never in
-- the path anyone actually took, so M-10 was not closed at all.
--
-- There is no reason column on note_flashcards, so the third parameter was
-- never real. One signature, matching how it is called. Same rule 0025 and
-- 0026 followed: drop the old signature rather than leave an overload.

drop function if exists public.set_flashcard_removed(uuid, boolean, text);

create or replace function public.set_flashcard_removed(
  p_card_id uuid,
  p_removed boolean
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
  v_author uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select pot_id, created_by into v_pot, v_author
  from public.note_flashcards where id = p_card_id;
  if v_pot is null then raise exception 'not_found'; end if;

  -- Authorship used to outlive membership, so someone who had left the Pot
  -- could still remove or restore its cards with a card id.
  if not public.is_pot_member(v_pot) then raise exception 'not_pot_member'; end if;
  if v_author <> v_uid and not public.is_pot_maintainer(v_pot) then
    raise exception 'not_allowed';
  end if;

  update public.note_flashcards
  set removed_at = case when p_removed then now() else null end,
      removed_by = case when p_removed then v_uid else null end
  where id = p_card_id;
end;
$$;

revoke all on function public.set_flashcard_removed(uuid, boolean) from public, anon;
grant execute on function public.set_flashcard_removed(uuid, boolean) to authenticated;
