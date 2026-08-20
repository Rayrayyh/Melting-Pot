-- Instant email+password registration without a confirmation round-trip.
-- The hosted project has email confirmations on by default and the built-in
-- mailer is heavily rate limited, so signup creates the user directly with
-- email_confirmed_at set; the client then signs in with the password.
-- The on_auth_user_created trigger creates the profile row.

create or replace function public.register_student(
  p_email text,
  p_password text,
  p_display_name text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = auth, public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_user_id uuid := gen_random_uuid();
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if p_password is null or char_length(p_password) < 8 then
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
$$;

grant execute on function public.register_student(text, text, text) to anon, authenticated;
