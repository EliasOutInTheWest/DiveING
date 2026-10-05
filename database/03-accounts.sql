-- =====================================================
-- Step 1: accounts for everyone
-- Paste into Supabase > SQL Editor > New query > Run
-- (safe to run more than once)
-- =====================================================

-- 1) Usernames: format check + unique regardless of upper/lower case
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[A-Za-z0-9_-]{3,30}$');

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- 2) Create the profile on sign-up. Uses the chosen username, falls back to
--    "diver_xxxxxxxx" if it is missing/invalid, adds a suffix if it was just taken.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  final_name text;
begin
  if wanted !~ '^[A-Za-z0-9_-]{3,30}$' then
    wanted := 'diver_' || substr(new.id::text, 1, 8);
  end if;
  final_name := wanted;
  if exists (select 1 from public.profiles where lower(username) = lower(final_name)) then
    final_name := left(wanted, 25) || '_' || substr(new.id::text, 1, 4);
  end if;
  insert into public.profiles (id, username) values (new.id, final_name);
  return new;
end;
$$;

-- 3) Lets the sign-up form check whether a username is free
create or replace function public.username_available(wanted_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(wanted_name)
  );
$$;

-- 4) Give a profile to users that were created before the trigger existed
insert into public.profiles (id, username)
select u.id, 'diver_' || substr(u.id::text, 1, 8)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
