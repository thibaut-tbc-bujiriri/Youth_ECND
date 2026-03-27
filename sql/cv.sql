-- Table CV: stockage des CV televerses par les membres.
-- A executer dans Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.cv (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  member_user_id uuid not null references public.users(id) on delete cascade,
  jeune_id uuid null references public.jeunes(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  mime_type text null,
  size_bytes integer null,
  status text not null default 'soumis' check (status in ('soumis', 'valide', 'rejete')),
  commentaire text null
);

create index if not exists idx_cv_created_at on public.cv(created_at desc);
create index if not exists idx_cv_member on public.cv(member_user_id);

alter table public.cv enable row level security;

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
grant select, insert, update, delete on table public.cv to authenticated;

drop policy if exists "cv_member_select_own_or_admin" on public.cv;
create policy "cv_member_select_own_or_admin"
on public.cv
for select
to authenticated
using (
  public.is_current_user_admin()
  or exists (
    select 1
    from public.users u
    where u.id = cv.member_user_id
      and u.auth_id = auth.uid()
  )
);

drop policy if exists "cv_member_insert_own_or_admin" on public.cv;
create policy "cv_member_insert_own_or_admin"
on public.cv
for insert
to authenticated
with check (
  public.is_current_user_admin()
  or exists (
    select 1
    from public.users u
    where u.id = cv.member_user_id
      and u.auth_id = auth.uid()
  )
);

drop policy if exists "cv_member_update_own_or_admin" on public.cv;
create policy "cv_member_update_own_or_admin"
on public.cv
for update
to authenticated
using (
  public.is_current_user_admin()
  or exists (
    select 1
    from public.users u
    where u.id = cv.member_user_id
      and u.auth_id = auth.uid()
  )
)
with check (
  public.is_current_user_admin()
  or exists (
    select 1
    from public.users u
    where u.id = cv.member_user_id
      and u.auth_id = auth.uid()
  )
);

drop policy if exists "cv_member_delete_own_or_admin" on public.cv;
create policy "cv_member_delete_own_or_admin"
on public.cv
for delete
to authenticated
using (
  public.is_current_user_admin()
  or exists (
    select 1
    from public.users u
    where u.id = cv.member_user_id
      and u.auth_id = auth.uid()
  )
);
