-- =====================================================
-- Admin menu: list all accounts, grant/remove admin role
-- Paste into Supabase > SQL Editor > New query > Run
-- (needs 04-roles.sql and 02-edit-permissions.sql from before; safe to run again)
-- =====================================================

-- All accounts with email, username, status, role and schools.
-- Returns nothing at all unless the caller is an admin.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  created_at timestamptz,
  email_confirmed boolean,
  last_sign_in_at timestamptz,
  is_admin boolean,
  school_ids uuid[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email::text,
    p.username,
    u.created_at,
    (u.email_confirmed_at is not null),
    u.last_sign_in_at,
    exists (select 1 from public.admins a where a.user_id = u.id),
    coalesce(
      (select array_agg(m.school_id) from public.school_members m where m.user_id = u.id),
      '{}'::uuid[]
    )
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_admin()
  order by u.created_at desc;
$$;

-- Grant or remove the admin role. Admins cannot remove their own role,
-- so there is always at least one admin left.
create or replace function public.admin_set_admin(target_user uuid, make_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if make_admin then
    insert into public.admins (user_id) values (target_user) on conflict do nothing;
  else
    if target_user = (select auth.uid()) then
      raise exception 'You cannot remove your own admin role.';
    end if;
    delete from public.admins where user_id = target_user;
  end if;
end;
$$;
