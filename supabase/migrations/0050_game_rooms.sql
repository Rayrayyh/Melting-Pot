-- A live quiz room: the host runs the Pot's secured practice test, everyone
-- in the room answers the same question at once, and speed breaks ties.
--
-- The scoreboard is the game's own and nothing else's. It exists while the
-- room exists, is readable only by the Pot's members through the one function
-- below, and nothing in it is ever shown outside a game. Each player's own
-- result lands in study_attempts through record_study_run at the podium, so
-- the private record learns only what it already knows how to hold.
--
-- Nobody writes these tables directly. Every write goes through the security
-- definer functions, and game_answers carries no policies at all, like
-- study_set_keys: one player's answers are nobody else's read.

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  code text not null unique check (char_length(code) = 6),
  host_id uuid not null references public.profiles (id) on delete cascade,
  set_id uuid not null references public.study_sets (id) on delete cascade,
  format text not null default 'quiz' check (format in ('quiz')),
  status text not null default 'lobby'
    check (status in ('lobby', 'question', 'reveal', 'ended')),
  question_index integer not null default -1,
  question_started_at timestamptz,
  seconds_per_question integer not null default 20
    check (seconds_per_question between 5 and 60),
  -- Bumped by the touch trigger whenever players or answers change, so
  -- clients can react to one row instead of polling three tables.
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index game_rooms_pot_idx on public.game_rooms (pot_id, created_at desc);

create table public.game_players (
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.game_answers (
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- First write wins, so a slower replay can never push an answer later to
  -- game the speed bonus.
  choice integer not null check (choice between 0 and 3),
  ms integer not null check (ms >= 0),
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (room_id, question_index, user_id)
);

alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_answers enable row level security;

-- Members may see that a room exists and who is in it: the lobby needs both.
create policy game_rooms_select_members on public.game_rooms
  for select using (public.is_pot_member(pot_id));
create policy game_players_select_members on public.game_players
  for select using (
    exists (select 1 from public.game_rooms r where r.id = room_id and public.is_pot_member(r.pot_id))
  );
-- Answers: no policies, not even for maintainers. The state function below
-- decides what a room reveals, and it only ever reveals aggregates.

revoke insert, update, delete on public.game_rooms from anon, authenticated;
revoke insert, update, delete on public.game_players from anon, authenticated;
revoke select on public.game_answers from anon, authenticated;

-- Any change to players or answers wakes the room row.
create or replace function public.game_rooms_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.game_rooms
  set version = version + 1
  where id = coalesce(new.room_id, old.room_id);
  return coalesce(new, old);
end;
$$;

revoke execute on function public.game_rooms_touch() from public, anon;
grant execute on function public.game_rooms_touch() to authenticated;

create trigger game_players_touch
  after insert or update or delete on public.game_players
  for each row execute function public.game_rooms_touch();

create trigger game_answers_touch
  after insert or update on public.game_answers
  for each row execute function public.game_rooms_touch();

-- The same shape create_pot uses for class codes: a clear alphabet, retried
-- on the unique constraint. Room codes live in their own namespace.
create or replace function public.create_game_room(p_pot_id uuid, p_set_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_set public.study_sets%rowtype;
  v_room public.game_rooms%rowtype;
  v_attempt integer := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_pot_maintainer(p_pot_id) then raise exception 'not_pot_maintainer'; end if;
  perform consume_rate_limit('create_game_room', 'user:' || v_uid::text, 20, interval '1 hour');

  if exists (select 1 from public.pots where id = p_pot_id and archived_at is not null) then
    raise exception 'pot_archived';
  end if;

  select * into v_set from public.study_sets
  where id = p_set_id and pot_id = p_pot_id and removed_at is null;
  -- Only a secured practice test can be run live: its answers are on the
  -- server, which is exactly what a room needs.
  if v_set.id is null or v_set.kind <> 'practice' or not v_set.secured then
    raise exception 'invalid_set';
  end if;
  if jsonb_array_length(v_set.payload -> 'questions') = 0 then
    raise exception 'empty_set';
  end if;

  while v_attempt < 10 loop
    begin
      insert into public.game_rooms (pot_id, code, host_id, set_id)
      values (p_pot_id, public.generate_class_code(), v_uid, p_set_id)
      returning * into v_room;
      return jsonb_build_object('roomId', v_room.id, 'code', v_room.code);
    exception when unique_violation then
      v_attempt := v_attempt + 1;
    end;
  end loop;
  raise exception 'code_generation_failed';
end;
$$;

create or replace function public.join_game_room(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('join_game', 'user:' || v_uid::text, 60, interval '1 hour');

  select * into v_room from public.game_rooms
  where code = upper(coalesce(p_code, '')) and ended_at is null;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if not public.is_pot_member(v_room.pot_id) then raise exception 'not_pot_member'; end if;

  select display_name into v_name from public.profiles where id = v_uid;
  insert into public.game_players (room_id, user_id, display_name)
  values (v_room.id, v_uid, coalesce(v_name, 'A classmate'))
  on conflict (room_id, user_id) do nothing;

  return jsonb_build_object('roomId', v_room.id, 'status', v_room.status);
end;
$$;

-- Everything a client needs to draw the room, and the only place the
-- leaderboard exists. Question and answers are separated deliberately:
-- while the clock runs the state carries the prompt and choices and never
-- the key; after the reveal it carries the key, the per-choice counts, and
-- this reader's own result.
create or replace function public.game_state(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_set public.study_sets%rowtype;
  v_keys jsonb;
  v_total integer;
  v_counts integer[] := '{0,0,0,0}';
  v_my_choice integer;
  v_my_correct boolean;
  v_leaderboard jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if not public.is_pot_member(v_room.pot_id) then raise exception 'not_pot_member'; end if;

  select * into v_set from public.study_sets where id = v_room.set_id;
  v_total := coalesce(jsonb_array_length(v_set.payload -> 'questions'), 0);

  if v_room.status in ('reveal', 'ended') and v_room.question_index >= 0 then
    select keys into v_keys from public.study_set_keys where set_id = v_room.set_id;
    for v_i in 0 .. 3 loop
      select count(*) into v_counts[v_i + 1] from public.game_answers
      where room_id = v_room.id and question_index = v_room.question_index and choice = v_i;
    end loop;
    select choice, correct into v_my_choice, v_my_correct
    from public.game_answers
    where room_id = v_room.id and question_index = v_room.question_index and user_id = v_uid;
    -- The in-game board. Speed bonus identical to lib/game/score.ts: full
    -- marks for an instant answer, sliding to base marks at the buzzer.
    select coalesce(jsonb_agg(row order by row ->> 'name'), '[]'::jsonb) into v_leaderboard
    from (
      select jsonb_build_object(
        'name', p.display_name,
        'score', sum(
          case when a.correct
            then 1000 + greatest(0, 500 - (a.ms * 500) / (v_room.seconds_per_question * 1000))
            else 0
          end
        ),
        'correct', count(*) filter (where a.correct)
      ) as row
      from public.game_players p
      left join public.game_answers a
        on a.room_id = p.room_id and a.user_id = p.user_id
      where p.room_id = v_room.id
      group by p.user_id, p.display_name
    ) board;
  end if;

  return jsonb_build_object(
    'roomId', v_room.id,
    'potId', v_room.pot_id,
    'hostId', v_room.host_id,
    -- The code is the door: everyone already inside the Pot may pass it on.
    'code', v_room.code,
    'format', v_room.format,
    'status', v_room.status,
    'version', v_room.version,
    'questionIndex', v_room.question_index,
    'totalQuestions', v_total,
    'secondsPerQuestion', v_room.seconds_per_question,
    'serverNow', (extract(epoch from clock_timestamp()) * 1000)::bigint,
    'questionStartedAt',
      case when v_room.question_started_at is null then null
        else (extract(epoch from v_room.question_started_at) * 1000)::bigint end,
    'question', case
      when v_room.status in ('question', 'reveal') and v_room.question_index >= 0 then
        jsonb_build_object(
          'prompt', v_set.payload -> 'questions' -> v_room.question_index ->> 'prompt',
          'choices', v_set.payload -> 'questions' -> v_room.question_index -> 'choices'
        )
      else null
    end,
    'reveal', case
      when v_room.status in ('reveal', 'ended') and v_room.question_index >= 0 then
        jsonb_build_object(
          'answerIndex', coalesce((v_keys -> v_room.question_index ->> 'answerIndex')::integer, -1),
          'counts', to_jsonb(v_counts),
          'yourChoice', v_my_choice,
          'yourCorrect', v_my_correct
        )
      else null
    end,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.display_name) order by p.joined_at)
      from public.game_players p where p.room_id = v_room.id
    ), '[]'::jsonb),
    'leaderboard', v_leaderboard
  );
end;
$$;

create or replace function public.start_game(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_total integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('game_host', 'user:' || v_uid::text, 240, interval '1 hour');
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if v_room.host_id <> v_uid then raise exception 'not_the_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'already_started'; end if;

  select coalesce(jsonb_array_length(payload -> 'questions'), 0) into v_total
  from public.study_sets where id = v_room.set_id;
  if v_total = 0 then raise exception 'empty_set'; end if;

  update public.game_rooms
  set status = 'question', question_index = 0, question_started_at = clock_timestamp()
  where id = p_room_id;
end;
$$;

create or replace function public.next_question(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_total integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('game_host', 'user:' || v_uid::text, 240, interval '1 hour');
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if v_room.host_id <> v_uid then raise exception 'not_the_host'; end if;
  if v_room.status <> 'reveal' then raise exception 'not_revealing'; end if;

  select coalesce(jsonb_array_length(payload -> 'questions'), 0) into v_total
  from public.study_sets where id = v_room.set_id;
  if v_room.question_index + 1 >= v_total then
    update public.game_rooms
    set status = 'ended', ended_at = clock_timestamp(), question_started_at = null
    where id = p_room_id;
  else
    update public.game_rooms
    set status = 'question', question_index = question_index + 1,
        question_started_at = clock_timestamp()
    where id = p_room_id;
  end if;
end;
$$;

create or replace function public.reveal_question(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('game_host', 'user:' || v_uid::text, 240, interval '1 hour');
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if v_room.host_id <> v_uid then raise exception 'not_the_host'; end if;
  if v_room.status <> 'question' then raise exception 'not_asking'; end if;

  update public.game_rooms set status = 'reveal', question_started_at = null
  where id = p_room_id;
end;
$$;

create or replace function public.end_game(p_room_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('game_host', 'user:' || v_uid::text, 240, interval '1 hour');
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if v_room.host_id <> v_uid then raise exception 'not_the_host'; end if;

  update public.game_rooms set status = 'ended', ended_at = clock_timestamp()
  where id = p_room_id;
end;
$$;

-- One answer per person per question, first write wins. The deadline is the
-- server's clock, not the client's claim: a slow phone that answers after the
-- buzzer is refused, not scored generously.
create or replace function public.submit_game_answer(
  p_room_id uuid,
  p_question_index integer,
  p_choice integer,
  p_ms integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_keys jsonb;
  v_answer_index integer;
  v_correct boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform consume_rate_limit('game_answer', 'user:' || v_uid::text, 240, interval '1 hour');

  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if not public.is_pot_member(v_room.pot_id) then raise exception 'not_pot_member'; end if;
  if v_room.status <> 'question' or v_room.question_index <> p_question_index
     or v_room.question_started_at is null then
    return jsonb_build_object('accepted', false, 'reason', 'not_asking');
  end if;
  if p_choice is null or p_choice < 0 or p_choice > 3 then
    raise exception 'invalid_choice';
  end if;
  if p_ms is null or p_ms < 0 or p_ms > v_room.seconds_per_question * 1000 then
    return jsonb_build_object('accepted', false, 'reason', 'too_slow');
  end if;
  if clock_timestamp() > v_room.question_started_at
      + make_interval(secs => v_room.seconds_per_question) then
    return jsonb_build_object('accepted', false, 'reason', 'too_slow');
  end if;

  select keys into v_keys from public.study_set_keys where set_id = v_room.set_id;
  v_answer_index := coalesce((v_keys -> p_question_index ->> 'answerIndex')::integer, -1);
  v_correct := p_choice = v_answer_index;

  insert into public.game_answers (room_id, question_index, user_id, choice, ms, correct)
  values (p_room_id, p_question_index, v_uid, p_choice, p_ms, v_correct)
  on conflict (room_id, question_index, user_id) do nothing;
  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'already_answered');
  end if;

  return jsonb_build_object('accepted', true, 'correct', v_correct);
end;
$$;

revoke execute on function public.create_game_room(uuid, uuid) from public, anon;
grant execute on function public.create_game_room(uuid, uuid) to authenticated;
revoke execute on function public.join_game_room(text) from public, anon;
grant execute on function public.join_game_room(text) to authenticated;
revoke execute on function public.game_state(uuid) from public, anon;
grant execute on function public.game_state(uuid) to authenticated;
revoke execute on function public.start_game(uuid) from public, anon;
grant execute on function public.start_game(uuid) to authenticated;
revoke execute on function public.next_question(uuid) from public, anon;
grant execute on function public.next_question(uuid) to authenticated;
revoke execute on function public.reveal_question(uuid) from public, anon;
grant execute on function public.reveal_question(uuid) to authenticated;
revoke execute on function public.end_game(uuid) from public, anon;
grant execute on function public.end_game(uuid) to authenticated;
revoke execute on function public.submit_game_answer(uuid, integer, integer, integer) from public, anon;
grant execute on function public.submit_game_answer(uuid, integer, integer, integer) to authenticated;

-- The reader's own result, the only thing the podium records. A player who
-- joined late or missed a reveal still gets the server's truth here, not
-- whatever their browser happened to count.
create or replace function public.my_game_result(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_room public.game_rooms%rowtype;
  v_total integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from public.game_rooms where id = p_room_id;
  if v_room.id is null then raise exception 'room_not_found'; end if;
  if not public.is_pot_member(v_room.pot_id) then raise exception 'not_pot_member'; end if;

  select coalesce(jsonb_array_length(payload -> 'questions'), 0) into v_total
  from public.study_sets where id = v_room.set_id;

  return jsonb_build_object(
    'correct', (
      select count(*) from public.game_answers
      where room_id = p_room_id and user_id = v_uid and correct
    ),
    'answered', (
      select count(*) from public.game_answers
      where room_id = p_room_id and user_id = v_uid
    ),
    'total', v_total
  );
end;
$$;

revoke execute on function public.my_game_result(uuid) from public, anon;
grant execute on function public.my_game_result(uuid) to authenticated;
