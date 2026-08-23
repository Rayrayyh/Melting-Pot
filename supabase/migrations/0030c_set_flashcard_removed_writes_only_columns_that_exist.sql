-- 0030 rewrote set_flashcard_removed to require current Pot membership, and
-- while retyping the body gave it a removed_reason column. note_flashcards has
-- removed_at and removed_by and no reason: a card is small enough that the
-- removal itself is the whole story. Every card deletion raised instead, which
-- the moderation e2e caught.
--
-- The membership requirement, which is the point of the change, is kept.

create or replace function public.set_flashcard_removed(
  p_card_id uuid,
  p_removed boolean,
  p_reason text default null
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

-- Superseded by 0030d: this kept the wrong (3 argument) signature alive.
