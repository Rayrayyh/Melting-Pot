-- Where a maintainer's Google authorization lives.
--
-- Pushing study material to Google Classroom needs the maintainer's own
-- Google authorization, obtained by OAuth and kept for later pushes. That
-- makes it a secret worth the same protection the answer keys get: the table
-- has row level security and no policies at all, so no client can read,
-- write, or even find a token row through PostgREST. Everything goes through
-- the security definer functions below, and a function returns only the
-- caller's own row, so a token reaches a server route and never a browser.

create table public.google_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  account_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

-- No policies. The functions below are the whole surface.

create or replace function public.store_google_token(
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_scope text,
  p_account_email text
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
  if p_access_token is null or p_refresh_token is null or p_expires_at is null
     or p_account_email is null then
    raise exception 'invalid_token';
  end if;

  insert into public.google_tokens
    (user_id, access_token, refresh_token, expires_at, scope, account_email)
  values (v_uid, p_access_token, p_refresh_token, p_expires_at, coalesce(p_scope, ''), p_account_email)
  on conflict (user_id) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        account_email = excluded.account_email,
        updated_at = now();
end;
$$;

-- Returns the CALLER's own token row and nothing else. The comment says the
-- quiet part out loud: this is how a token reaches a server route; it must
-- never reach a browser, and no other read path exists.
create or replace function public.my_google_token()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.google_tokens%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_row from public.google_tokens where user_id = v_uid;
  if v_row.user_id is null then return null; end if;
  return jsonb_build_object(
    'accessToken', v_row.access_token,
    'refreshToken', v_row.refresh_token,
    'expiresAt', v_row.expires_at,
    'scope', v_row.scope,
    'accountEmail', v_row.account_email
  );
end;
$$;

create or replace function public.has_google_token()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return false; end if;
  return exists (select 1 from public.google_tokens where user_id = v_uid);
end;
$$;

create or replace function public.forget_google_token()
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
  delete from public.google_tokens where user_id = v_uid;
end;
$$;

-- One push is one push: the same fixed-window limiter every other write
-- answers to.
create or replace function public.meter_classroom_push()
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
  perform consume_rate_limit('classroom_push', 'user:' || v_uid::text, 20, interval '1 hour');
end;
$$;

revoke execute on function public.store_google_token(text, text, timestamptz, text, text) from public, anon;
grant execute on function public.store_google_token(text, text, timestamptz, text, text) to authenticated;
revoke execute on function public.my_google_token() from public, anon;
grant execute on function public.my_google_token() to authenticated;
revoke execute on function public.has_google_token() from public, anon;
grant execute on function public.has_google_token() to authenticated;
revoke execute on function public.forget_google_token() from public, anon;
grant execute on function public.forget_google_token() to authenticated;
revoke execute on function public.meter_classroom_push() from public, anon;
grant execute on function public.meter_classroom_push() to authenticated;
