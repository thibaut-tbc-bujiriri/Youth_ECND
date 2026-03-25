-- Queue table for email notifications controlled by app_settings.email_notifications.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.email_notification_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  type text not null,
  recipient text not null,
  subject text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text null
);

create index if not exists idx_email_queue_status_created on public.email_notification_queue(status, created_at desc);

alter table public.email_notification_queue enable row level security;

drop policy if exists "email_queue_insert_authenticated" on public.email_notification_queue;
create policy "email_queue_insert_authenticated"
on public.email_notification_queue
for insert
to authenticated
with check (true);

drop policy if exists "email_queue_select_admin_only" on public.email_notification_queue;
create policy "email_queue_select_admin_only"
on public.email_notification_queue
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
