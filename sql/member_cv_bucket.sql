-- Bucket storage pour les CV membres.
-- A executer dans Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-cv',
  'member-cv',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_id = auth.uid()
      and lower(r.name) = 'admin'
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- Lecture: admin ou proprietaire du dossier (name = "<auth.uid()>/...")
drop policy if exists "member_cv_select_owner_or_admin" on storage.objects;
create policy "member_cv_select_owner_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-cv'
  and (
    public.is_current_user_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists "member_cv_insert_owner_or_admin" on storage.objects;
create policy "member_cv_insert_owner_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-cv'
  and (
    public.is_current_user_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists "member_cv_update_owner_or_admin" on storage.objects;
create policy "member_cv_update_owner_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-cv'
  and (
    public.is_current_user_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
)
with check (
  bucket_id = 'member-cv'
  and (
    public.is_current_user_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists "member_cv_delete_owner_or_admin" on storage.objects;
create policy "member_cv_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-cv'
  and (
    public.is_current_user_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);
