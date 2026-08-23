-- Practice tests stop trusting the browser, and practice starts leaving a
-- record.
--
-- Until now a practice set's payload carried every answerIndex and explanation
-- to every member, and the browser did the marking. Any member could read the
-- key out of the payload before answering, and no attempt survived the tab.
--
-- From here on a newly generated practice set is split: the member-readable
-- payload holds questions and choices only, and the answers live in
-- study_set_keys, a table with row level security enabled and no policies at
-- all, so the only way through is the definer function that marks a submitted
-- test. Sets generated before this migration keep their exposed payloads and
-- keep working exactly as before; secured stays false on them, they are
-- labelled practice in the interface, and nothing read from them is treated as
-- a score.
--
-- Attempts are recorded in study_attempts and study_responses, append-only and
-- written only by the definer functions. A student reads their own rows; a
-- maintainer of the Pot reads the Pot's rows, which is an owner decision made
-- on 2026-08-22 (memory/decisions/012): maintainers see study results without
-- a separate educator role, and the student-facing study page says so plainly.
-- The first attempt on a set is marked first_pass; retries are recorded but
-- never promoted.

alter table public.study_sets
  add column if not exists secured boolean not null default false;

create table public.study_set_keys (
  set_id uuid primary key references public.study_sets (id) on delete cascade,
  -- One entry per question, in question order: { "answerIndex": int,
  -- "explanation": text }.
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- No policies on purpose: nobody selects this table through PostgREST, in any
-- role. The marking function below is the only reader.
alter table public.study_set_keys enable row level security;

create table public.study_attempts (
  id uuid primary key,
  pot_id uuid not null references public.pots (id) on delete cascade,
  set_id uuid not null references public.study_sets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('practice', 'flashcards')),
  first_pass boolean not null,
  -- A marked test fills correct/total; a flashcard run fills known/learning.
  correct integer,
  total integer,
  known integer,
  learning integer,
  created_at timestamptz not null default now()
);

create index study_attempts_pot_created on public.study_attempts (pot_id, created_at desc);
create index study_attempts_user on public.study_attempts (user_id, pot_id, kind, created_at desc);
create index study_attempts_set on public.study_attempts (set_id);

create table public.study_responses (
  attempt_id uuid not null references public.study_attempts (id) on delete cascade,
  question_index integer not null,
  choice integer,
  correct boolean not null,
  primary key (attempt_id, question_index)
);

alter table public.study_attempts enable row level security;
alter table public.study_responses enable row level security;

-- Reads: your own record, or the Pot's record if you maintain it. Both run
-- through is_pot_maintainer, which already refuses a session that has not
-- finished its second step. Writes have no policy: the definer functions are
-- the only path in, so an attempt can never be forged or edited from the
-- browser.
create policy study_attempts_select on public.study_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_pot_maintainer(pot_id));

create policy study_responses_select on public.study_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.study_attempts a
      where a.id = attempt_id
        and (a.user_id = (select auth.uid()) or public.is_pot_maintainer(a.pot_id))
    )
  );

-- save_study_set learns to carry a key. The old signature is dropped rather
-- than left beside the new one: an overload silently reinstated an old body
-- once already (0030d), and once is enough.
drop function if exists public.save_study_set(uuid, text, text, jsonb, text, jsonb);

create function public.save_study_set(
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
  v_maintainer boolean;
  v_generation text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_pot_member(p_pot_id) then raise exception 'not_pot_member'; end if;
  if p_kind not in ('summary', 'flashcards', 'practice') then
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
  if p_keys is not null then
    if p_kind <> 'practice' then raise exception 'keys_without_practice'; end if;
    if jsonb_typeof(p_keys) <> 'array' then raise exception 'invalid_keys'; end if;
    if pg_column_size(p_keys) > 200000 then raise exception 'keys_too_large'; end if;
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

-- Marks a submitted practice test on the server. The browser sends which
-- questions were asked (order) and which choices were made; it never sends a
-- score and never sees a key before this function has accepted the attempt.
-- Idempotent by attempt id: the same submission replayed returns the stored
-- marking rather than a second attempt.
create function public.submit_practice_test(
  p_attempt_id uuid,
  p_set_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_set public.study_sets%rowtype;
  v_keys jsonb;
  v_order jsonb;
  v_choices jsonb;
  v_count integer;
  v_index integer;
  v_choice integer;
  v_correct boolean;
  v_correct_count integer := 0;
  v_total integer;
  v_first boolean;
  v_marks jsonb := '[]'::jsonb;
  v_existing public.study_attempts%rowtype;
  v_seen integer[] := '{}';
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_attempt_id is null then raise exception 'invalid_attempt'; end if;

  select * into v_set from public.study_sets where id = p_set_id;
  if v_set.id is null or v_set.removed_at is not null then raise exception 'set_not_found'; end if;
  if v_set.kind <> 'practice' then raise exception 'not_a_practice_set'; end if;
  if not v_set.secured then raise exception 'set_not_secured'; end if;
  if not public.is_pot_member(v_set.pot_id) then raise exception 'not_pot_member'; end if;

  -- A replay returns the marking already stored for this attempt.
  select * into v_existing from public.study_attempts where id = p_attempt_id;
  if v_existing.id is not null then
    if v_existing.user_id <> v_uid or v_existing.set_id <> p_set_id then
      raise exception 'attempt_conflict';
    end if;
    select keys into v_keys from public.study_set_keys where set_id = p_set_id;
    select coalesce(jsonb_agg(jsonb_build_object(
      'index', r.question_index,
      'choice', r.choice,
      'correct', r.correct,
      'answerIndex', (v_keys -> r.question_index ->> 'answerIndex')::integer,
      'explanation', v_keys -> r.question_index ->> 'explanation'
    ) order by r.question_index), '[]'::jsonb)
    into v_marks
    from public.study_responses r where r.attempt_id = p_attempt_id;
    return jsonb_build_object(
      'firstPass', v_existing.first_pass,
      'correct', v_existing.correct,
      'total', v_existing.total,
      'replayed', true,
      'marks', v_marks
    );
  end if;

  perform consume_rate_limit('submit_practice', 'user:' || v_uid::text, 120, interval '1 hour');

  select keys into v_keys from public.study_set_keys where set_id = p_set_id;
  if v_keys is null then raise exception 'set_not_secured'; end if;
  v_count := jsonb_array_length(v_keys);

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers';
  end if;
  v_order := p_answers -> 'order';
  v_choices := p_answers -> 'choices';
  if v_order is null or jsonb_typeof(v_order) <> 'array'
     or jsonb_array_length(v_order) = 0
     or jsonb_array_length(v_order) > v_count then
    raise exception 'invalid_answers';
  end if;
  if v_choices is not null and jsonb_typeof(v_choices) <> 'object' then
    raise exception 'invalid_answers';
  end if;

  v_total := jsonb_array_length(v_order);
  v_first := not exists (
    select 1 from public.study_attempts
    where set_id = p_set_id and user_id = v_uid and kind = 'practice'
  );

  insert into public.study_attempts (id, pot_id, set_id, user_id, kind, first_pass, correct, total)
  values (p_attempt_id, v_set.pot_id, p_set_id, v_uid, 'practice', v_first, 0, v_total);

  for i in 0 .. v_total - 1 loop
    if jsonb_typeof(v_order -> i) <> 'number' then raise exception 'invalid_answers'; end if;
    v_index := (v_order ->> i)::integer;
    if v_index < 0 or v_index >= v_count then raise exception 'invalid_answers'; end if;
    if v_index = any (v_seen) then raise exception 'invalid_answers'; end if;
    v_seen := v_seen || v_index;

    if v_choices ? v_index::text then
      v_choice := (v_choices ->> v_index::text)::integer;
      if v_choice < 0 or v_choice > 3 then raise exception 'invalid_answers'; end if;
    else
      v_choice := null;
    end if;

    v_correct := v_choice is not null
      and v_choice = (v_keys -> v_index ->> 'answerIndex')::integer;
    if v_correct then v_correct_count := v_correct_count + 1; end if;

    insert into public.study_responses (attempt_id, question_index, choice, correct)
    values (p_attempt_id, v_index, v_choice, v_correct);

    v_marks := v_marks || jsonb_build_object(
      'index', v_index,
      'choice', v_choice,
      'correct', v_correct,
      'answerIndex', (v_keys -> v_index ->> 'answerIndex')::integer,
      'explanation', v_keys -> v_index ->> 'explanation'
    );
  end loop;

  update public.study_attempts set correct = v_correct_count where id = p_attempt_id;

  return jsonb_build_object(
    'firstPass', v_first,
    'correct', v_correct_count,
    'total', v_total,
    'replayed', false,
    'marks', v_marks
  );
end;
$$;

revoke execute on function public.submit_practice_test(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_practice_test(uuid, uuid, jsonb) to authenticated;

-- Records a finished flashcard round. Self-graded by nature, so this is
-- practice tracking rather than a score: what it stores is that the round
-- happened and how the person sorted their own cards.
create function public.record_flashcard_run(
  p_attempt_id uuid,
  p_set_id uuid,
  p_known integer,
  p_learning integer
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_set public.study_sets%rowtype;
  v_first boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_attempt_id is null then raise exception 'invalid_attempt'; end if;
  if p_known is null or p_learning is null
     or p_known < 0 or p_learning < 0 or p_known + p_learning > 500 then
    raise exception 'invalid_counts';
  end if;

  select * into v_set from public.study_sets where id = p_set_id;
  if v_set.id is null or v_set.removed_at is not null then raise exception 'set_not_found'; end if;
  if v_set.kind <> 'flashcards' then raise exception 'not_a_flashcard_set'; end if;
  if not public.is_pot_member(v_set.pot_id) then raise exception 'not_pot_member'; end if;

  -- Idempotent: a retried request under the same attempt id records nothing new.
  if exists (select 1 from public.study_attempts where id = p_attempt_id) then
    return;
  end if;

  perform consume_rate_limit('record_flashcards', 'user:' || v_uid::text, 120, interval '1 hour');

  v_first := not exists (
    select 1 from public.study_attempts
    where set_id = p_set_id and user_id = v_uid and kind = 'flashcards'
  );

  insert into public.study_attempts (id, pot_id, set_id, user_id, kind, first_pass, known, learning)
  values (p_attempt_id, v_set.pot_id, p_set_id, v_uid, 'flashcards', v_first, p_known, p_learning);
end;
$$;

revoke execute on function public.record_flashcard_run(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.record_flashcard_run(uuid, uuid, integer, integer) to authenticated;

-- The maintainer's study overview, aggregated here so the browser never
-- receives another student's raw responses. Alphabetical by name: the page
-- shows a class, it does not rank one.
create function public.admin_study_overview(p_pot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_pot_maintainer(p_pot_id) then raise exception 'not_pot_maintainer'; end if;

  select coalesce(jsonb_agg(entry order by entry ->> 'name'), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'userId', m.user_id,
      'name', p.display_name,
      'tests', jsonb_build_object(
        'attempts', count(a.id) filter (where a.kind = 'practice'),
        'firstPass', count(a.id) filter (where a.kind = 'practice' and a.first_pass),
        'latestFirstPass', (
          select jsonb_build_object('correct', l.correct, 'total', l.total, 'at', l.created_at)
          from public.study_attempts l
          where l.pot_id = p_pot_id and l.user_id = m.user_id
            and l.kind = 'practice' and l.first_pass
          order by l.created_at desc limit 1
        )
      ),
      'flashcards', jsonb_build_object(
        'runs', count(a.id) filter (where a.kind = 'flashcards'),
        'latest', (
          select jsonb_build_object('known', l.known, 'learning', l.learning, 'at', l.created_at)
          from public.study_attempts l
          where l.pot_id = p_pot_id and l.user_id = m.user_id
            and l.kind = 'flashcards'
          order by l.created_at desc limit 1
        )
      ),
      'lastPracticed', max(a.created_at)
    ) as entry
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    left join public.study_attempts a on a.pot_id = p_pot_id and a.user_id = m.user_id
    where m.pot_id = p_pot_id
    group by m.user_id, p.display_name
  ) member_rows;

  return v_result;
end;
$$;

revoke execute on function public.admin_study_overview(uuid) from public, anon;
grant execute on function public.admin_study_overview(uuid) to authenticated;
