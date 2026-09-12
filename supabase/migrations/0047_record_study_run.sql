-- One way to record a study run that is not a marked set.
--
-- A focus session, a blurt, a Feynman walk-through and a game all count as a
-- day on the private record, and none of them has a study set behind them.
-- Rather than one RPC per kind, one function takes the kind and a small
-- detail object. The client generates the attempt id, so a lost reply can be
-- retried without writing the run twice, exactly like submit_practice_test.
--
-- The kind list is deliberately closed. A new kind of run means a migration,
-- not a string from the browser.

create or replace function public.record_study_run(
  p_attempt_id uuid,
  p_pot_id uuid,
  p_kind text,
  p_detail jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing public.study_attempts%rowtype;
  v_first_pass boolean;
  v_correct integer;
  v_total integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('focus', 'blurt', 'feynman', 'game') then
    raise exception 'invalid_kind';
  end if;
  if not public.is_pot_member(p_pot_id) then raise exception 'not_pot_member'; end if;
  if p_detail is not null then
    if jsonb_typeof(p_detail) <> 'object' then raise exception 'invalid_detail'; end if;
    if pg_column_size(p_detail) > 4000 then raise exception 'detail_too_large'; end if;
  end if;

  perform consume_rate_limit('study_run_' || p_kind, 'user:' || v_uid::text, 120, interval '1 hour');

  -- Replay: same caller, same attempt id, the run already landed.
  select * into v_existing from public.study_attempts where id = p_attempt_id;
  if v_existing.id is not null then
    if v_existing.user_id <> v_uid then raise exception 'attempt_taken'; end if;
    return jsonb_build_object('firstPass', v_existing.first_pass, 'replayed', true);
  end if;

  -- A game result fills correct/total the way a marked test does, so the
  -- record and the admin overview can read it the same way. Anything else in
  -- the detail is kept but not promoted to a column.
  if p_detail is not null and jsonb_typeof(p_detail -> 'correct') = 'number' then
    v_correct := least(greatest((p_detail ->> 'correct')::integer, 0), 100000);
  end if;
  if p_detail is not null and jsonb_typeof(p_detail -> 'total') = 'number' then
    v_total := least(greatest((p_detail ->> 'total')::integer, 0), 100000);
  end if;

  -- First pass means the first run of this kind in this Pot, the same rule
  -- submit_practice_test applies to a whole test (0036).
  v_first_pass := not exists (
    select 1 from public.study_attempts
    where user_id = v_uid and pot_id = p_pot_id and kind = p_kind
  );

  insert into public.study_attempts (id, pot_id, set_id, user_id, kind, first_pass, correct, total, detail)
  values (p_attempt_id, p_pot_id, null, v_uid, p_kind, v_first_pass, v_correct, v_total, p_detail);

  return jsonb_build_object('firstPass', v_first_pass, 'replayed', false);
end;
$$;

revoke execute on function public.record_study_run(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.record_study_run(uuid, uuid, text, jsonb) to authenticated;

-- Re-emitted from 0031 with a runs object alongside tests and flashcards
-- (lesson 011: the whole body is written out again, and the maintainer check
-- and every field are carried across unchanged). lastPracticed already reads
-- max(created_at) over every attempt row, so the new kinds land there for
-- free.
create or replace function public.admin_study_overview(p_pot_id uuid)
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
      'runs', jsonb_build_object(
        'daily', count(a.id) filter (where a.kind = 'daily'),
        'game', count(a.id) filter (where a.kind = 'game'),
        'blurt', count(a.id) filter (where a.kind = 'blurt'),
        'feynman', count(a.id) filter (where a.kind = 'feynman'),
        'focus', count(a.id) filter (where a.kind = 'focus')
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
