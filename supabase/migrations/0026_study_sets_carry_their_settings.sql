-- A stored practice test knew what it was made of, but not what it was asked
-- for. The settings lived only inside source_fingerprint, which is a hash, so a
-- list of previous tests could not say which was the short gentle one and which
-- was the twenty question exam rehearsal. They are stored beside the set now.
--
-- Null for a summary or a deck, which have nothing to configure, and null for
-- the practice tests written before this column existed.
--
-- The five argument save_study_set is dropped rather than left beside the new
-- one: both would match a five argument call and Postgres would refuse it as
-- ambiguous.

alter table public.study_sets
  add column if not exists options jsonb;

comment on column public.study_sets.options is
  'What the test was asked for: {questionCount, difficulty, emphasis, sectionIds}. Null for summaries, decks, and tests written before this column.';

drop function if exists public.save_study_set(uuid, text, text, jsonb, text);

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
                  created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.save_study_set(uuid, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.save_study_set(uuid, text, text, jsonb, text, jsonb) to authenticated;
