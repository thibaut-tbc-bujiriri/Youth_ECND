-- Correctif RLS pour caisse_depenses
-- A executer dans Supabase SQL Editor si la table existe deja mais renvoie "Access denied / RLS".

-- 1) Fonction fiable pour verifier si l'utilisateur courant est admin.
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

-- 2) Droits SQL de base (en plus des policies RLS).
grant select, insert, update, delete on table public.caisse_depenses to authenticated;

-- 3) Re-cree les policies en s'appuyant sur la fonction.
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
