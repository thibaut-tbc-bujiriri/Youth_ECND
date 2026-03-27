-- Configuration session utilisateur + commentaires CV
-- A executer dans Supabase SQL Editor.

alter table if exists public.app_settings
  add column if not exists session_duration_minutes integer not null default 120;

alter table if exists public.app_settings
  drop constraint if exists app_settings_session_duration_minutes_check;

alter table if exists public.app_settings
  add constraint app_settings_session_duration_minutes_check
  check (session_duration_minutes between 5 and 1440);

alter table if exists public.cv
  add column if not exists commentaire text null;

