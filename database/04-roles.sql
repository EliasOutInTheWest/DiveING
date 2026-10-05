-- =====================================================
-- Step 2: roles and permissions
--   visitor        -> can look
--   verified user  -> can add + edit spots (every change is logged)
--   school staff   -> can edit ONLY their own school(s) + its boat routes
--   admin          -> can do everything
-- Paste into Supabase > SQL Editor > New query > Run
-- (safe to run more than once; needs 02-edit-permissions.sql from before)
-- =====================================================

-- ---------- helper: is the logged-in user's email confirmed? ----------
create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null
  );
$$;

-- ---------- school staff ----------
create table if not exists public.school_members (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (school_id, user_id)
);
alter table public.school_members enable row level security;

create or replace function public.is_school_member(target_school uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.school_members
    where school_id = target_school and user_id = (select auth.uid())
  );
$$;

drop policy if exists "read own memberships" on public.school_members;
create policy "read own memberships" on public.school_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "admins insert memberships" on public.school_members;
create policy "admins insert memberships" on public.school_members
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admins delete memberships" on public.school_members;
create policy "admins delete memberships" on public.school_members
  for delete to authenticated using (public.is_admin());

-- carry over the old single "owner" of a school, if any
insert into public.school_members (school_id, user_id)
select id, owner_id from public.schools where owner_id is not null
on conflict do nothing;

-- ---------- extra columns on spots ----------
alter table public.spots
  add column if not exists is_verified boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz;

-- spots that exist now (imported from OpenStreetMap) count as checked
update public.spots set is_verified = true where created_by is null and is_verified = false;

-- ---------- edit history for spots ----------
create table if not exists public.spot_edits (
  id bigint generated always as identity primary key,
  spot_id uuid not null,                      -- no foreign key: history stays if a spot is deleted
  action text not null check (action in ('insert', 'update', 'delete')),
  user_id uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);
create index if not exists spot_edits_spot_idx on public.spot_edits (spot_id, changed_at desc);
alter table public.spot_edits enable row level security;

drop policy if exists "admins read edits" on public.spot_edits;
create policy "admins read edits" on public.spot_edits
  for select to authenticated using (public.is_admin());

-- ---------- triggers ----------
-- Protects fields normal users must not touch + records who changed what.
-- Runs of the SQL editor / server scripts (no logged-in user) are left alone.
create or replace function public.spots_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := uid;
    new.updated_by := uid;
    new.updated_at := now();
    if not public.is_admin() then
      new.is_verified := false;   -- only admins can mark a spot as checked
      new.osm_id := null;
    end if;
  else
    new.updated_by := uid;
    new.updated_at := now();
    new.created_by := old.created_by;
    if not public.is_admin() then
      new.is_verified := old.is_verified;
      new.osm_id := old.osm_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists spots_guard_trg on public.spots;
create trigger spots_guard_trg
  before insert or update on public.spots
  for each row execute function public.spots_guard();

create or replace function public.log_spot_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.spot_edits (spot_id, action, user_id, new_data)
    values (new.id, 'insert', uid, to_jsonb(new) - 'location');
  elsif tg_op = 'UPDATE' then
    if (to_jsonb(old) - 'updated_at' - 'updated_by') <> (to_jsonb(new) - 'updated_at' - 'updated_by') then
      insert into public.spot_edits (spot_id, action, user_id, old_data, new_data)
      values (new.id, 'update', uid, to_jsonb(old) - 'location', to_jsonb(new) - 'location');
    end if;
  else
    insert into public.spot_edits (spot_id, action, user_id, old_data)
    values (old.id, 'delete', uid, to_jsonb(old) - 'location');
  end if;
  return null;
end;
$$;

drop trigger if exists spots_log_trg on public.spots;
create trigger spots_log_trg
  after insert or update or delete on public.spots
  for each row execute function public.log_spot_edit();

-- schools: staff may not change the internal fields
create or replace function public.schools_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.osm_id := old.osm_id;
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists schools_guard_trg on public.schools;
create trigger schools_guard_trg
  before update on public.schools
  for each row execute function public.schools_guard();

-- ---------- policies: spots ----------
drop policy if exists "admins update spots" on public.spots;
drop policy if exists "verified users insert spots" on public.spots;
drop policy if exists "verified users update spots" on public.spots;
drop policy if exists "admins delete spots" on public.spots;

create policy "verified users insert spots" on public.spots
  for insert to authenticated
  with check (public.is_verified() or public.is_admin());

create policy "verified users update spots" on public.spots
  for update to authenticated
  using (public.is_verified() or public.is_admin())
  with check (public.is_verified() or public.is_admin());

create policy "admins delete spots" on public.spots
  for delete to authenticated using (public.is_admin());

-- ---------- policies: schools ----------
drop policy if exists "owner updates school" on public.schools;
drop policy if exists "admins update schools" on public.schools;
drop policy if exists "staff or admin update schools" on public.schools;
drop policy if exists "admins insert schools" on public.schools;
drop policy if exists "admins delete schools" on public.schools;

create policy "staff or admin update schools" on public.schools
  for update to authenticated
  using (public.is_admin() or public.is_school_member(id))
  with check (public.is_admin() or public.is_school_member(id));

create policy "admins insert schools" on public.schools
  for insert to authenticated with check (public.is_admin());

create policy "admins delete schools" on public.schools
  for delete to authenticated using (public.is_admin());

-- ---------- policies: boat routes ----------
drop policy if exists "owner inserts routes" on public.boat_routes;
drop policy if exists "owner updates routes" on public.boat_routes;
drop policy if exists "owner deletes routes" on public.boat_routes;
drop policy if exists "staff or admin insert routes" on public.boat_routes;
drop policy if exists "staff or admin update routes" on public.boat_routes;
drop policy if exists "staff or admin delete routes" on public.boat_routes;

create policy "staff or admin insert routes" on public.boat_routes
  for insert to authenticated
  with check (public.is_admin() or public.is_school_member(school_id));

create policy "staff or admin update routes" on public.boat_routes
  for update to authenticated
  using (public.is_admin() or public.is_school_member(school_id))
  with check (public.is_admin() or public.is_school_member(school_id));

create policy "staff or admin delete routes" on public.boat_routes
  for delete to authenticated
  using (public.is_admin() or public.is_school_member(school_id));

-- =====================================================
-- To make a user staff of a school (replace both values):
--
-- insert into public.school_members (school_id, user_id)
-- select s.id, u.id
-- from public.schools s, auth.users u
-- where s.name = 'EXACT SCHOOL NAME' and u.email = 'user@example.com';
-- =====================================================
