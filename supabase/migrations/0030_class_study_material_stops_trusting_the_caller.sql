-- save_study_set was a security-definer write that checked only membership and
-- then believed everything else the caller sent: fingerprint, payload, model,
-- options. The browser calls it directly. That let any member write arbitrary
-- JSON into the class cache, bypass a maintainers-only generation policy,
-- restore material a maintainer had removed, keep the previous writer's name
-- on it, and insert unbounded rows under invented fingerprints.
--
-- The fingerprint stays caller-supplied: it is a hash computed in TypeScript
-- and duplicating that in SQL would be a second source of truth that drifts.
-- Every consequence of forging one is closed instead.

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
  v_existing public.study_sets%rowtype;
  v_maintainer boolean;
  v_generation text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_pot_member(p_pot_id) then raise exception 'not_pot_member'; end if;
  if p_kind not in ('summary', 'flashcards', 'practice') then
    raise exception 'invalid_kind';
  end if;

  v_maintainer := public.is_pot_maintainer(p_pot_id);

  -- A Pot set to maintainers-only was enforced in the route and nowhere else,
  -- so calling this directly walked straight past it.
  select study_generation into v_generation from public.pots where id = p_pot_id;
  if v_generation = 'maintainers' and not v_maintainer then
    raise exception 'generation_closed';
  end if;

  -- Unbounded rows under invented fingerprints were free storage. This is the
  -- write, so it is counted whether or not a model was ever called.
  perform consume_rate_limit('save_study_set', 'user:' || v_uid::text, 60, interval '1 hour');

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;
  if pg_column_size(p_payload) > 400000 then
    raise exception 'payload_too_large';
  end if;
  -- Shape, to the depth the readers actually assume. Anything deeper is the
  -- normalizer's job in lib/mix/contracts.ts.
  if p_kind = 'flashcards' and jsonb_typeof(p_payload -> 'cards') <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_kind = 'practice' and jsonb_typeof(p_payload -> 'questions') <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_kind = 'summary' and jsonb_typeof(p_payload -> 'overview') <> 'string' then
    raise exception 'invalid_payload';
  end if;

  select * into v_existing from public.study_sets
  where pot_id = p_pot_id and kind = p_kind and source_fingerprint = left(p_fingerprint, 128);

  -- A removed set is exactly the row a rebuild collides with, so the previous
  -- version cleared the removal to let the rebuild land. That also meant any
  -- member could undo a maintainer's removal by replaying a save. Only a
  -- maintainer brings one back now; for anyone else the removal stands and the
  -- existing id is returned rather than the row being overwritten.
  if v_existing.id is not null and v_existing.removed_at is not null and not v_maintainer then
    return v_existing.id;
  end if;

  insert into public.study_sets (pot_id, kind, source_fingerprint, payload, model, options, generated_by)
  values (p_pot_id, p_kind, left(p_fingerprint, 128), p_payload, left(p_model, 120), p_options, v_uid)
  on conflict (pot_id, kind, source_fingerprint)
    do update set payload = excluded.payload,
                  model = excluded.model,
                  options = excluded.options,
                  created_at = now(),
                  -- The person who wrote what is stored now, not whoever wrote
                  -- what used to be there.
                  generated_by = excluded.generated_by,
                  removed_at = null,
                  removed_by = null,
                  removed_reason = null
  returning id into v_id;
  return v_id;
end;
$$;

-- M-09: the app filtered removed rows in its queries, but the policies did
-- not, so any member could read a removed set or card straight from PostgREST.
-- NOTE: these names did not match the existing policies, so 0030b drops those.
drop policy if exists study_sets_select on public.study_sets;
create policy study_sets_select on public.study_sets for select to authenticated
  using (
    public.is_pot_member(pot_id)
    and (removed_at is null or public.is_pot_maintainer(pot_id))
  );

drop policy if exists note_flashcards_select on public.note_flashcards;
create policy note_flashcards_select on public.note_flashcards for select to authenticated
  using (
    public.is_pot_member(pot_id)
    and (removed_at is null or public.is_pot_maintainer(pot_id))
  );

-- M-10: authorship outlived membership, so someone who left a Pot could still
-- remove or restore its cards with a card id.
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

  if not public.is_pot_member(v_pot) then raise exception 'not_pot_member'; end if;
  if v_author <> v_uid and not public.is_pot_maintainer(v_pot) then
    raise exception 'not_allowed';
  end if;

  update public.note_flashcards
  set removed_at = case when p_removed then now() else null end,
      removed_by = case when p_removed then v_uid else null end,
      removed_reason = case when p_removed then left(p_reason, 300) else null end
  where id = p_card_id;
end;
$$;
