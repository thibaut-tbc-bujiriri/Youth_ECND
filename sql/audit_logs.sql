-- Audit table for tracking application movements and actions.
-- Run this script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_auth_id uuid null references auth.users(id) on delete set null,
  actor_user_id uuid null references public.users(id) on delete set null,
  actor_email text null,
  actor_role text null,
  action text not null,
  entity text null,
  entity_id text null,
  path text null,
  details jsonb not null default '{}'::jsonb,
  success boolean not null default true,
  user_agent text null
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_actor_role on public.audit_logs(actor_role);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_insert_authenticated" on public.audit_logs;
create policy "audit_insert_authenticated"
on public.audit_logs
for insert
to authenticated
with check (auth.uid() = actor_auth_id);

drop policy if exists "audit_select_admin_only" on public.audit_logs;
create policy "audit_select_admin_only"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_id = auth.uid()
      and lower(r.name) = 'admin'
  )
);
