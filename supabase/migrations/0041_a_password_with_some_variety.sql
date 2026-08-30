-- A password now needs an uppercase letter, a lowercase letter and a digit
-- alongside the existing minimum of 8 characters. The signup form shows the
-- same four rules as a live checklist (web/lib/auth/password-rules.ts); the
-- two lists must stay identical or the server rejects what the client said
-- was fine. Everything below the weak_password block is the live function
-- body unchanged (fetched and diffed before this was written).

create or replace function public.register_student(p_email text, p_password text, p_display_name text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'auth', 'public', 'extensions'
as $function$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid := gen_random_uuid();
begin
  perform consume_rate_limit('register_student', 'ip:' || client_ip(), 200, interval '1 hour');
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if p_password is null
    or char_length(p_password) < 8
    or p_password !~ '[A-Z]'
    or p_password !~ '[a-z]'
    or p_password !~ '[0-9]' then
    raise exception 'weak_password';
  end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'invalid_display_name';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email_taken';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    is_sso_user, is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', trim(p_display_name)),
    now(),
    now(),
    '', '', '', '', '',
    false,
    false
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  return v_user_id;
end;
$function$;
