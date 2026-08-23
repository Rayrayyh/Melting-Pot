-- Google sign in puts the person's name in full_name (or name), not the
-- display_name key that register_student writes, so an OAuth signup landed in
-- the app as "Student". Read every key the providers actually send, fall back
-- to the local part of the email, and only then to the generic label.
--
-- display_name is capped at 80 characters by the profiles check constraint, so
-- the result is trimmed to fit rather than failing the insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Student'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
