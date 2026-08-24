-- Evidence for a teaching readout, aggregated in the database.
--
-- Everything built so far points at the student: their own record, their own
-- streak, their own practice. The person running the Pot could see who had
-- practiced and what they scored, but not the one thing a teacher actually
-- needs, which is what the class as a whole is getting wrong.
--
-- That answer is already in the data. study_responses records correctness per
-- question, and every question in a practice payload carries the title of the
-- note it was written from. So the topic level picture is a plain aggregate,
-- not a guess: for each source note, how many first pass answers it drew and
-- how many of those missed.
--
-- First pass only, matching 0036. A retry is someone coming back to a topic,
-- which is the behaviour this product wants to encourage, and counting it here
-- would make a class that revises look worse than one that never returns.
--
-- Nothing here is per student. The function returns topics and counts, never
-- names, and there is no ordering that could be read as a ranking of people.
-- `students` is a headcount used only to decide whether there is enough
-- evidence to say anything at all.

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
      and a.kind = 'practice'
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

-- The readout is one model call, so it needs a bucket. Deliberately smaller
-- than the student facing kinds: one Pot has a handful of maintainers, and a
-- teaching readout is something you ask for after a test, not repeatedly.
--
-- Whole body re-emitted because plpgsql cannot amend one branch. Diffed
-- against the live definition before applying, per memory/lessons/011: the
-- five existing kinds and their limits are carried across unchanged, and the
-- only difference is the 'teaching' line.
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
    when 'teaching' then 12
    else null
  end;
  if v_max is null then raise exception 'invalid_ai_kind'; end if;
  perform consume_rate_limit('ai_' || p_kind, 'user:' || v_uid::text, v_max, interval '1 hour');
end;
$$;

revoke execute on function public.consume_ai_generation(text) from public, anon;
grant execute on function public.consume_ai_generation(text) to authenticated;
