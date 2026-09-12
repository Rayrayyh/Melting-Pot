-- Two new kinds of study material, and a wider record of study runs.
--
-- 'graph' is a drawn concept map, cached like every other set. 'daily' is the
-- Pot's one quiz for the day: same questions for everyone, answer keys on the
-- server like a practice test, one set per Pot per day.
--
-- study_attempts widens because a run should be recordable even when nothing
-- was generated: a focus session, a blurt, a Feynman walk-through, a game.
-- Those have no study set behind them, so set_id becomes nullable and a
-- detail column carries the kind-specific counts. Nothing old changes shape:
-- every existing row keeps its set_id.

alter table public.study_sets drop constraint study_sets_kind_check;
alter table public.study_sets add constraint study_sets_kind_check
  check (kind in ('summary', 'flashcards', 'practice', 'graph', 'daily'));

alter table public.study_attempts alter column set_id drop not null;
alter table public.study_attempts drop constraint study_attempts_kind_check;
alter table public.study_attempts add constraint study_attempts_kind_check
  check (kind in ('practice', 'flashcards', 'daily', 'game', 'blurt', 'feynman', 'focus'));
alter table public.study_attempts add column detail jsonb
  check (detail is null or pg_column_size(detail) <= 4000);

-- Re-emitted from 0037 with the two new kinds (lesson 011: the whole body is
-- written out again, and every guard from 0030/0035/0037 is carried across:
-- payload size and shape per kind, the removal guard, the unsecure guard).
create or replace function public.save_study_set(
  p_pot_id uuid,
  p_kind text,
  p_fingerprint text,
  p_payload jsonb,
  p_model text,
  p_options jsonb default null,
  p_keys jsonb default null
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
  if p_kind not in ('summary', 'flashcards', 'practice', 'graph', 'daily') then
    raise exception 'invalid_kind';
  end if;

  v_maintainer := public.is_pot_maintainer(p_pot_id);

  select study_generation into v_generation from public.pots where id = p_pot_id;
  if v_generation = 'maintainers' and not v_maintainer then
    raise exception 'generation_closed';
  end if;

  perform consume_rate_limit('save_study_set', 'user:' || v_uid::text, 60, interval '1 hour');

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload';
  end if;
  if pg_column_size(p_payload) > 400000 then
    raise exception 'payload_too_large';
  end if;
  -- Shape, to the depth the readers actually assume (restored from 0030).
  -- A daily set is a practice set with a day for a fingerprint, so it carries
  -- the same shape; a graph carries nodes.
  if p_kind in ('flashcards') and jsonb_typeof(p_payload -> 'cards') <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_kind in ('practice', 'daily') and jsonb_typeof(p_payload -> 'questions') <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_kind = 'summary' and jsonb_typeof(p_payload -> 'overview') <> 'string' then
    raise exception 'invalid_payload';
  end if;
  if p_kind = 'graph' and jsonb_typeof(p_payload -> 'nodes') <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_keys is not null then
    if p_kind not in ('practice', 'daily') then raise exception 'keys_without_practice'; end if;
    if jsonb_typeof(p_keys) <> 'array' then raise exception 'invalid_keys'; end if;
    if pg_column_size(p_keys) > 200000 then raise exception 'keys_too_large'; end if;
  end if;

  select * into v_existing from public.study_sets
  where pot_id = p_pot_id and kind = p_kind and source_fingerprint = left(p_fingerprint, 128);

  -- Restored from 0030: a member may not undo a maintainer's removal by
  -- replaying a save. The removal stands and the existing id comes back
  -- rather than the row being overwritten and revived.
  if v_existing.id is not null and v_existing.removed_at is not null and not v_maintainer then
    return v_existing.id;
  end if;

  -- A set whose answers live on the server never goes back to carrying them
  -- in the payload. Nothing legitimate asks for that.
  if v_existing.id is not null and v_existing.secured and p_keys is null then
    raise exception 'cannot_unsecure_set';
  end if;

  insert into public.study_sets (pot_id, kind, source_fingerprint, payload, model, options, generated_by, secured)
  values (p_pot_id, p_kind, left(p_fingerprint, 128), p_payload, left(p_model, 120), p_options, v_uid, p_keys is not null)
  on conflict (pot_id, kind, source_fingerprint) do update
    set payload = excluded.payload,
        model = excluded.model,
        options = excluded.options,
        generated_by = excluded.generated_by,
        secured = excluded.secured,
        removed_at = null,
        removed_by = null,
        created_at = now()
  returning id into v_id;

  if p_keys is not null then
    insert into public.study_set_keys (set_id, keys)
    values (v_id, p_keys)
    on conflict (set_id) do update set keys = excluded.keys, created_at = now();
  else
    -- A regenerated legacy set must not keep keys from a secured predecessor.
    delete from public.study_set_keys where set_id = v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_study_set(uuid, text, text, jsonb, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_study_set(uuid, text, text, jsonb, text, jsonb, jsonb) to authenticated;

-- Re-emitted from 0039 with the two new kinds. A daily quiz is cheaper to
-- draw than a full test (five fixed questions), and a graph is one drawing.
create or replace function public.consume_ai_generation(p_kind text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_max integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  v_max := case p_kind
    when 'organizer' then 60
    when 'vision' then 120
    when 'summary' then 30
    when 'flashcards' then 30
    when 'practice' then 20
    when 'graph' then 20
    when 'daily' then 12
    when 'teaching' then 12
    else null
  end;
  if v_max is null then raise exception 'invalid_ai_kind'; end if;
  perform consume_rate_limit('ai_' || p_kind, 'user:' || v_uid::text, v_max, interval '1 hour');
end;
$$;

revoke execute on function public.consume_ai_generation(text) from public, anon;
grant execute on function public.consume_ai_generation(text) to authenticated;
