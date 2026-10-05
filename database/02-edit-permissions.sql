-- =====================================================
-- Who may edit spots and schools: only users listed in "admins"
-- Paste into Supabase > SQL Editor > New query > Run
-- =====================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- RLS on with no policies = nobody can read or change this table through the API
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

create policy "admins update spots" on public.spots
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins update schools" on public.schools
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================
-- AFTER you created your user (Authentication > Users > Add user),
-- run this separately with YOUR email to make yourself admin:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'YOUR-EMAIL-HERE';
-- =====================================================
