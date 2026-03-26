-- Rapport de caisse: table des depenses deduites du total des contributions.
-- Run this script in Supabase SQL Editor.

create extension if not exists pgcrypto;

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

create table if not exists public.caisse_depenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date_depense date not null default current_date,
  libelle text not null,
  montant numeric(12, 2) not null check (montant > 0),
  commentaire text null
);

create index if not exists idx_caisse_depenses_date on public.caisse_depenses(date_depense desc);
create index if not exists idx_caisse_depenses_created_at on public.caisse_depenses(created_at desc);

alter table public.caisse_depenses enable row level security;

grant select, insert, update, delete on table public.caisse_depenses to authenticated;

drop policy if exists "caisse_depenses_admin_select" on public.caisse_depenses;
create policy "caisse_depenses_admin_select"
on public.caisse_depenses
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists "caisse_depenses_admin_insert" on public.caisse_depenses;
create policy "caisse_depenses_admin_insert"
on public.caisse_depenses
for insert
to authenticated
with check (public.is_current_user_admin());

drop policy if exists "caisse_depenses_admin_update" on public.caisse_depenses;
create policy "caisse_depenses_admin_update"
on public.caisse_depenses
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "caisse_depenses_admin_delete" on public.caisse_depenses;
create policy "caisse_depenses_admin_delete"
on public.caisse_depenses
for delete
to authenticated
using (public.is_current_user_admin());
