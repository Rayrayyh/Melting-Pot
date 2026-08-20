-- Two homes for study material.
--
-- study_sets caches what Gemini generates for a whole Pot. Generation is slow
-- and metered, so a set that already matches the Pot's current notes is served
-- again rather than rebuilt. The fingerprint is what makes that safe: it is
-- derived from the notes that went in, so the moment anyone shares or corrects
-- a note the fingerprint changes and the next request regenerates. Nothing
-- serves stale material.
--
-- note_flashcards holds cards a person wrote themselves, usually by selecting
-- a passage out of a note. Those are not generated, belong to their author,
-- and are never overwritten by a regeneration.

create table public.study_sets (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  kind text not null check (kind in ('summary', 'flashcards', 'practice')),
  source_fingerprint text not null check (char_length(source_fingerprint) between 1 and 128),
  payload jsonb not null,
  model text check (model is null or char_length(model) <= 120),
  generated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (pot_id, kind, source_fingerprint)
);

create index study_sets_pot_kind_idx on public.study_sets (pot_id, kind, created_at desc);

create table public.note_flashcards (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  note_id uuid references public.shared_notes (id) on delete set null,
  front text not null check (char_length(front) between 1 and 500),
  back text not null check (char_length(back) between 1 and 2000),
  tags text[] not null default '{}',
  source_excerpt text check (source_excerpt is null or char_length(source_excerpt) <= 1000),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index note_flashcards_pot_idx on public.note_flashcards (pot_id, created_at desc);

alter table public.study_sets enable row level security;
alter table public.note_flashcards enable row level security;

-- Members read their Pot's material. Writes go through the functions below so
-- membership is re-validated at the moment of the write.
create policy study_sets_select_members on public.study_sets
  for select using (public.is_pot_member(pot_id));

create policy note_flashcards_select_members on public.note_flashcards
  for select using (public.is_pot_member(pot_id));

create policy note_flashcards_delete_own on public.note_flashcards
  for delete using (created_by = (select auth.uid()) and public.is_pot_member(pot_id));

revoke insert, update on public.study_sets from anon, authenticated;
revoke insert, update on public.note_flashcards from anon, authenticated;

create or replace function public.save_study_set(
  p_pot_id uuid,
  p_kind text,
  p_fingerprint text,
  p_payload jsonb,
  p_model text
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

  insert into public.study_sets (pot_id, kind, source_fingerprint, payload, model, generated_by)
  values (p_pot_id, p_kind, left(p_fingerprint, 128), p_payload, left(p_model, 120), v_uid)
  on conflict (pot_id, kind, source_fingerprint)
    do update set payload = excluded.payload,
                  model = excluded.model,
                  created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.add_note_flashcard(
  p_pot_id uuid,
  p_note_id uuid,
  p_front text,
  p_back text,
  p_tags text[],
  p_source_excerpt text
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
  -- A card may only point at a note in the same Pot.
  if p_note_id is not null and not exists (
    select 1 from public.shared_notes where id = p_note_id and pot_id = p_pot_id
  ) then
    raise exception 'note_not_in_pot';
  end if;

  perform public.consume_rate_limit('add_flashcard', 'user:' || v_uid::text, 120, interval '1 hour');

  insert into public.note_flashcards (pot_id, note_id, front, back, tags, source_excerpt, created_by)
  values (
    p_pot_id, p_note_id,
    left(trim(p_front), 500), left(trim(p_back), 2000),
    coalesce((select array_agg(distinct left(trim(t), 40)) from unnest(p_tags) t where trim(t) <> ''), '{}'),
    left(p_source_excerpt, 1000), v_uid
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.save_study_set(uuid, text, text, jsonb, text) from public, anon;
revoke execute on function public.add_note_flashcard(uuid, uuid, text, text, text[], text) from public, anon;
grant execute on function public.save_study_set(uuid, text, text, jsonb, text) to authenticated;
grant execute on function public.add_note_flashcard(uuid, uuid, text, text, text[], text) to authenticated;
