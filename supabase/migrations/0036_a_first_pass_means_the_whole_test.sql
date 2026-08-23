-- A first pass has to be the whole test.
--
-- submit_practice_test marked an attempt first_pass whenever no earlier
-- attempt existed on that set, whatever the attempt covered. The browser
-- sends which questions were asked, and a retry legitimately sends only the
-- ones that were missed, so a one-question submission is a well-formed
-- request. That made two things possible for a member who calls the RPC
-- directly:
--
--   Ask for question 0 alone with no choice. The reply carries that
--   question's answer and explanation, because the reply is the marking. The
--   attempt is recorded as a first pass of "0 of 1". Repeat for each
--   question as retries, and the whole key is known without ever having sat
--   the test.
--
--   Or ask for one question, answer it correctly, and let "1 of 1" stand as
--   the first pass a maintainer sees.
--
-- Neither forges anything: every row is real and the marking is honest. The
-- number just does not mean what the admin page says it means, and that page
-- is the whole point of recording attempts.
--
-- So first_pass now requires the attempt to cover every question in the set.
-- A partial attempt is still recorded, still marked, and still returns its
-- explanations; it is simply never the first pass. Probing the key with a
-- one-question attempt therefore costs the prober their first pass on that
-- set, which is the right trade: they have seen an answer, so the number can
-- no longer mean what it claims.

create or replace function public.submit_practice_test(
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

  -- A first pass is the whole test, sat before any other attempt on this set.
  -- A partial attempt is recorded and marked like any other; it is simply
  -- never the number the admin page reads as a first pass.
  v_first := v_total = v_count and not exists (
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
