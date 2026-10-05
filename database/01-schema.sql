-- =====================================================
-- divemap: database schema for Supabase (PostgreSQL + PostGIS)
-- Paste into Supabase > SQL Editor > New query > Run
-- =====================================================

create extension if not exists postgis;

-- ---------- PROFILES (one per user, linked to Supabase Auth) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Automatically create a profile when someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'diver_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- SPOTS ----------
create table public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location geography(Point, 4326) not null,
  lat double precision generated always as (st_y(location::geometry)) stored,
  lng double precision generated always as (st_x(location::geometry)) stored,
  max_depth_m int,
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  best_season text,
  osm_id text unique,            -- for seeding from OpenStreetMap
  created_at timestamptz not null default now()
);
create index spots_location_idx on public.spots using gist (location);

-- ---------- SCHOOLS / DIVE CLUBS ----------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location geography(Point, 4326) not null,   -- harbour / base
  lat double precision generated always as (st_y(location::geometry)) stored,
  lng double precision generated always as (st_x(location::geometry)) stored,
  website text,
  phone text,
  email text,
  osm_id text unique,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index schools_location_idx on public.schools using gist (location);

-- ---------- BOAT ROUTES (school harbour -> spot) ----------
create table public.boat_routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  geometry geography(LineString, 4326) not null,
  duration_min int,
  notes text,
  created_at timestamptz not null default now(),
  unique (school_id, spot_id)
);
create index boat_routes_spot_idx on public.boat_routes (spot_id);

-- ---------- REVIEWS (for a spot OR a school) ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  check ((spot_id is not null)::int + (school_id is not null)::int = 1)
);
-- one review per user per spot / school
create unique index reviews_user_spot_uniq on public.reviews (user_id, spot_id) where spot_id is not null;
create unique index reviews_user_school_uniq on public.reviews (user_id, school_id) where school_id is not null;

-- ---------- MEDIA (photos / videos posted to a spot) ----------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  type text not null default 'image' check (type in ('image', 'video')),
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index media_spot_idx on public.media (spot_id, created_at desc);
create index media_feed_idx on public.media (created_at desc);

-- ---------- FOLLOWS (friends / followers) ----------
create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- RATING SUMMARIES ----------
create view public.spot_ratings with (security_invoker = true) as
  select spot_id, round(avg(rating), 1) as avg_rating, count(*) as review_count
  from public.reviews
  where spot_id is not null
  group by spot_id;

create view public.school_ratings with (security_invoker = true) as
  select school_id, round(avg(rating), 1) as avg_rating, count(*) as review_count
  from public.reviews
  where school_id is not null
  group by school_id;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.profiles    enable row level security;
alter table public.spots       enable row level security;
alter table public.schools     enable row level security;
alter table public.boat_routes enable row level security;
alter table public.reviews     enable row level security;
alter table public.media       enable row level security;
alter table public.follows     enable row level security;

-- Everyone can read public content
create policy "read profiles"    on public.profiles    for select using (true);
create policy "read spots"       on public.spots       for select using (true);
create policy "read schools"     on public.schools     for select using (true);
create policy "read boat routes" on public.boat_routes for select using (true);
create policy "read reviews"     on public.reviews     for select using (true);
create policy "read media"       on public.media       for select using (true);
create policy "read follows"     on public.follows     for select using (true);

-- Profiles: edit only your own
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Spots and schools: no insert policy on purpose.
-- You seed/manage them via the dashboard or SQL editor for now.
-- School owners can edit their own school:
create policy "owner updates school" on public.schools
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Boat routes: only the owner of the school can manage its routes
create policy "owner inserts routes" on public.boat_routes
  for insert to authenticated
  with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "owner updates routes" on public.boat_routes
  for update to authenticated
  using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "owner deletes routes" on public.boat_routes
  for delete to authenticated
  using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));

-- Reviews: logged-in users manage their own
create policy "insert own review" on public.reviews
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own review" on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own review" on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- Media: logged-in users manage their own
create policy "insert own media" on public.media
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own media" on public.media
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own media" on public.media
  for delete to authenticated using (user_id = auth.uid());

-- Follows: follow / unfollow as yourself
create policy "follow as self" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "unfollow as self" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- =====================================================
-- OPTIONAL: two test rows so the map isn't empty (delete later)
-- =====================================================
insert into public.spots (name, description, location, max_depth_m, level, best_season)
values (
  'Test Reef',
  'Calm, shallow reef, good for first dives.',
  st_point(-123.45, 48.40)::geography,   -- st_point(longitude, latitude)
  12, 'beginner', 'Summer'
);

insert into public.schools (name, description, location, website)
values (
  'Test Dive Club',
  'Example dive school with a boat.',
  st_point(-123.37, 48.42)::geography,
  'https://example.com'
);
