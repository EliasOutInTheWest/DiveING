-- =====================================================
-- Photos + profile
--   - photo storage (bucket "spot-photos") with rules
--   - profile fields: certification, dives, bio (public)
--   - private fields: licence number, 18+ confirmation (only you + admins)
--   - photo reports
-- Paste into Supabase > SQL Editor > New query > Run
-- (needs the earlier SQL files; safe to run more than once)
-- =====================================================

-- ---------- 1) public profile fields ----------
alter table public.profiles
  add column if not exists bio text,
  add column if not exists cert_level text,
  add column if not exists cert_agency text,
  add column if not exists dive_count int;

alter table public.profiles drop constraint if exists profiles_cert_level_check;
alter table public.profiles add constraint profiles_cert_level_check
  check (cert_level is null or cert_level in
    ('not_certified', 'open_water', 'advanced_open_water', 'rescue', 'divemaster', 'instructor'));

alter table public.profiles drop constraint if exists profiles_cert_agency_check;
alter table public.profiles add constraint profiles_cert_agency_check
  check (cert_agency is null or cert_agency in ('PADI', 'SSI', 'NAUI', 'CMAS', 'BSAC', 'SDI', 'Other'));

alter table public.profiles drop constraint if exists profiles_dive_count_check;
alter table public.profiles add constraint profiles_dive_count_check
  check (dive_count is null or (dive_count >= 0 and dive_count <= 100000));

alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check
  check (bio is null or char_length(bio) <= 300);

-- ---------- 2) private profile fields (NOT readable by other users) ----------
create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  license_number text check (license_number is null or char_length(license_number) <= 40),
  adult_confirmed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;

drop policy if exists "read own private" on public.profile_private;
create policy "read own private" on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "insert own private" on public.profile_private;
create policy "insert own private" on public.profile_private
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "update own private" on public.profile_private;
create policy "update own private" on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- rows for accounts that already exist
insert into public.profile_private (user_id)
select id from public.profiles
on conflict do nothing;

-- ---------- 3) sign-up: also store certification + 18+ confirmation ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  final_name text;
  lvl text := new.raw_user_meta_data->>'cert_level';
  agency text := new.raw_user_meta_data->>'cert_agency';
begin
  if wanted !~ '^[A-Za-z0-9_-]{3,30}$' then
    wanted := 'diver_' || substr(new.id::text, 1, 8);
  end if;
  final_name := wanted;
  if exists (select 1 from public.profiles where lower(username) = lower(final_name)) then
    final_name := left(wanted, 25) || '_' || substr(new.id::text, 1, 4);
  end if;

  if lvl is null or lvl not in
     ('not_certified', 'open_water', 'advanced_open_water', 'rescue', 'divemaster', 'instructor') then
    lvl := null;
  end if;
  if agency is null or agency not in ('PADI', 'SSI', 'NAUI', 'CMAS', 'BSAC', 'SDI', 'Other') then
    agency := null;
  end if;

  insert into public.profiles (id, username, cert_level, cert_agency)
  values (new.id, final_name, lvl, agency);

  insert into public.profile_private (user_id, adult_confirmed)
  values (new.id, (new.raw_user_meta_data->>'adult_confirmed') = 'true');

  return new;
end;
$$;

-- ---------- 4) photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-photos', 'spot-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- everyone can see photos; logged-in verified users upload into THEIR OWN folder;
-- users delete their own files, admins delete any
drop policy if exists "spot photos read" on storage.objects;
create policy "spot photos read" on storage.objects
  for select using (bucket_id = 'spot-photos');

drop policy if exists "spot photos upload" on storage.objects;
create policy "spot photos upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'spot-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_verified()
  );

drop policy if exists "spot photos delete" on storage.objects;
create policy "spot photos delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'spot-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- ---------- 5) photo records (table "media") ----------
alter table public.media drop constraint if exists media_caption_check;
alter table public.media add constraint media_caption_check
  check (caption is null or char_length(caption) <= 200);

create index if not exists media_user_idx on public.media (user_id);
create index if not exists spots_created_by_idx on public.spots (created_by);

drop policy if exists "insert own media" on public.media;
create policy "insert own media" on public.media
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_verified()
    and storage_path like (select auth.uid())::text || '/%'
  );

drop policy if exists "admins delete media" on public.media;
create policy "admins delete media" on public.media
  for delete to authenticated using (public.is_admin());

-- ---------- 6) photo reports (admins read them in the Table Editor for now) ----------
create table if not exists public.media_reports (
  id bigint generated always as identity primary key,
  media_id uuid not null references public.media(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (media_id, user_id)
);
alter table public.media_reports enable row level security;

drop policy if exists "report as self" on public.media_reports;
create policy "report as self" on public.media_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_verified());

drop policy if exists "admins read reports" on public.media_reports;
create policy "admins read reports" on public.media_reports
  for select to authenticated using (public.is_admin());

drop policy if exists "admins delete reports" on public.media_reports;
create policy "admins delete reports" on public.media_reports
  for delete to authenticated using (public.is_admin());
