-- The coach's two modes get a price.
--
-- Blurt review and the Feynman tutor spend a generation like every other AI
-- capability, so they need entries in consume_ai_generation. Migration 0046
-- carried the study kinds; this carries the coach's. Re-emitted whole from
-- 0039 (lesson 011: every price stays where it was, the two new kinds are
-- added, nothing else moves).

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
    when 'blurt' then 30
    when 'feynman' then 30
    else null
  end;
  if v_max is null then raise exception 'invalid_ai_kind'; end if;
  perform consume_rate_limit('ai_' || p_kind, 'user:' || v_uid::text, v_max, interval '1 hour');
end;
$$;

revoke execute on function public.consume_ai_generation(text) from public, anon;
grant execute on function public.consume_ai_generation(text) to authenticated;
