-- Persist reviewable Gemini Vision output without exposing the API key or
-- allowing clients to overwrite another student's private attachment.
alter table public.attachments
  add column ai_caption text,
  add column ai_extracted_text text,
  add column ai_useful_for_note boolean,
  add column ai_model text,
  add column ai_analyzed_at timestamptz;

alter table public.attachments
  add constraint attachments_ai_caption_length check (char_length(ai_caption) <= 800),
  add constraint attachments_ai_extracted_text_length check (char_length(ai_extracted_text) <= 6000),
  add constraint attachments_ai_model_length check (char_length(ai_model) <= 120);

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
    else null
  end;
  if v_max is null then raise exception 'invalid_ai_kind'; end if;
  perform consume_rate_limit('ai_' || p_kind, 'user:' || v_uid::text, v_max, interval '1 hour');
end;
$$;

create or replace function public.save_attachment_analysis(
  p_attachment_id uuid,
  p_caption text,
  p_extracted_text text,
  p_useful_for_note boolean,
  p_model text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update attachments a
  set ai_caption = left(nullif(trim(coalesce(p_caption, '')), ''), 800),
      ai_extracted_text = left(nullif(trim(coalesce(p_extracted_text, '')), ''), 6000),
      ai_useful_for_note = p_useful_for_note,
      ai_model = left(p_model, 120),
      ai_analyzed_at = now()
  from contributions c
  where a.id = p_attachment_id
    and c.id = a.contribution_id
    and a.created_by = v_uid
    and c.author_id = v_uid
    and c.status <> 'shared';
  if not found then raise exception 'attachment_not_editable'; end if;
end;
$$;

revoke execute on function public.consume_ai_generation(text) from public, anon;
revoke execute on function public.save_attachment_analysis(uuid, text, text, boolean, text) from public, anon;
grant execute on function public.consume_ai_generation(text) to authenticated;
grant execute on function public.save_attachment_analysis(uuid, text, text, boolean, text) to authenticated;
