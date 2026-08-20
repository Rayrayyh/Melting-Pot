-- Private attachments bucket. Object paths follow
-- {pot_id}/{contribution_id}/{filename}; access mirrors table RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760, -- 10 MB
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy attachments_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_pot_member(((storage.foldername(name))[1])::uuid)
  );

create policy attachments_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_pot_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.contributions c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.author_id = (select auth.uid())
        and c.pot_id = ((storage.foldername(name))[1])::uuid
    )
  );

create policy attachments_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and owner_id::uuid = (select auth.uid())
  );
