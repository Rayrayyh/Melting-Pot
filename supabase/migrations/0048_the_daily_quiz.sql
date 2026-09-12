-- The Pot's one quiz for the day.
--
-- A daily set is a practice set with a day for a fingerprint: same shape,
-- same server-held answer keys, one attempt per person. Its answers feed the
-- teaching evidence, so class_topic_evidence is re-emitted (whole body, lesson
-- 011: the maintainer check and the headcount rule from 0039 are carried
-- across untouched) to read first passes from both kinds.

create or replace function public.class_topic_evidence(p_pot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_topics jsonb;
  v_answered integer;
  v_students integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- The same helper every policy asks, which also carries the assurance level
  -- check from 0028. A member of the Pot is not entitled to this.
  if not public.is_pot_maintainer(p_pot_id) then raise exception 'not_pot_maintainer'; end if;

  with answers as (
    select
      coalesce(
        nullif(trim(
          s.payload -> 'questions' -> r.question_index ->> 'sourceNoteTitle'
        ), ''),
        'Not traced to a note'
      ) as topic,
      r.correct,
      a.user_id
    from public.study_attempts a
    join public.study_responses r on r.attempt_id = a.id
    join public.study_sets s on s.id = a.set_id
    where a.pot_id = p_pot_id
      and a.kind in ('practice', 'daily')
      and a.first_pass
  ),
  grouped as (
    select jsonb_build_object(
      'topic', topic,
      'asked', count(*),
      'missed', count(*) filter (where not correct),
      'students', count(distinct user_id)
    ) as row
    from answers
    group by topic
  )
  -- All three in one statement, because a CTE only lives as long as the
  -- statement that declares it. The headcount is a scalar subquery over the
  -- same `answers` rows the counts come from, not over attempts: an attempt
  -- with no recorded answers adds nothing to the picture, so counting its
  -- author would report someone whose results are not actually in it. The
  -- outer aggregate returns a row even when `grouped` is empty, so an
  -- unpracticed Pot still gets zeros rather than nulls.
  select
    coalesce(jsonb_agg(g.row order by g.row ->> 'topic'), '[]'::jsonb),
    coalesce(sum((g.row ->> 'asked')::integer), 0),
    (select count(distinct user_id) from answers)
  into v_topics, v_answered, v_students
  from grouped g;

  return jsonb_build_object(
    'topics', v_topics,
    'answered', v_answered,
    'students', coalesce(v_students, 0)
  );
end;
$$;

revoke execute on function public.class_topic_evidence(uuid) from public, anon;
grant execute on function public.class_topic_evidence(uuid) to authenticated;

-- Marks the day's quiz. The body mirrors submit_practice_test as it stands
-- after 0036, with three daily rules added: the set must be a daily set, the
-- rate limit is smaller, and a second attempt by the same person on the same
-- day's quiz is refused rather than recorded, because the quiz is taken once.
create or replace function public.submit_daily_quiz(
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
  if v_set.kind <> 'daily' then raise exception 'not_a_daily_set'; end if;
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

  -- The quiz is taken once. A lost reply can be replayed by attempt id above;
  -- a second sitting with a fresh id is refused, not recorded.
  if exists (
    select 1 from public.study_attempts
    where set_id = p_set_id and user_id = v_uid and kind = 'daily'
  ) then
    raise exception 'already_taken';
  end if;

  perform consume_rate_limit('submit_daily', 'user:' || v_uid::text, 20, interval '1 hour');

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

  -- A first pass is the whole test, sat before any other attempt on this set
  -- (0036). The already-taken guard above means a daily first pass is also
  -- the only sitting, so the two rules agree here.
  v_first := v_total = v_count;

  insert into public.study_attempts (id, pot_id, set_id, user_id, kind, first_pass, correct, total)
  values (p_attempt_id, v_set.pot_id, p_set_id, v_uid, 'daily', v_first, 0, v_total);

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

revoke execute on function public.submit_daily_quiz(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_daily_quiz(uuid, uuid, jsonb) to authenticated;
