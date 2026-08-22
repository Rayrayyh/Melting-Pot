-- A person can change their own name and picture.
--
-- Until now a display name was fixed at registration and the avatar was a
-- person icon in one of six tints hashed from that name, so neither could be
-- changed by the person they describe. This adds the column, the bucket, and
-- the one function that writes both.
--
-- The bucket is PUBLIC on purpose, unlike attachments. An avatar is shown
-- beside every note its owner shared, to every member of every Pot they are
-- in, and a private bucket would mean signing a URL per avatar per render.
-- Nothing private is inferable from the file itself, and the object path is a
-- uuid the browser already knows. Writes are still restricted: only the owner
-- may put a file under their own id.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB; a display picture never needs more
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- The path is <user id>/<filename>, so the first folder is the only claim to
-- check. A member may replace their own picture and nobody else's.
create policy avatars_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_storage_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Reading is open because the bucket is public; this policy is what makes the
-- public bucket actually readable through the storage API for anon as well,
-- which is what an <img> tag on a shared note needs.
create policy avatars_storage_select on storage.objects for select to authenticated, anon
  using (bucket_id = 'avatars');

-- The one write path for a profile. profiles_update exists as a policy but the
-- authenticated role has no UPDATE grant on the table (0015 revoked every verb
-- the app does not use), so this definer function is how a person edits their
-- own row, and it validates rather than trusting what arrives.
create function public.update_my_profile(
  p_display_name text,
  p_avatar_url text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := trim(coalesce(p_display_name, ''));
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'invalid_display_name';
  end if;

  -- An avatar is either cleared or a path inside this person's own folder of
  -- the avatars bucket. Anything else, including a URL pointing somewhere
  -- else entirely, is refused: the column is rendered into an img src on
  -- every member's screen.
  if p_avatar_url is not null and p_avatar_url <> '' then
    if p_avatar_url !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then
      raise exception 'invalid_avatar_path';
    end if;
  end if;

  perform consume_rate_limit('update_profile', 'user:' || v_uid::text, 30, interval '1 hour');

  update public.profiles
  set display_name = v_name,
      avatar_url = nullif(p_avatar_url, '')
  where id = v_uid;
end;
$$;

revoke execute on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;
