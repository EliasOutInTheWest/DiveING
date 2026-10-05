-- =====================================================
-- Boat routes: read and save routes as GeoJSON
-- Paste into Supabase > SQL Editor > New query > Run
-- (needs 04-roles.sql from before; safe to run again)
-- Both functions respect the permission rules: only school staff of
-- that school and admins can save routes.
-- =====================================================

-- Read routes of one school and/or to one spot (as GeoJSON lines)
create or replace function public.get_boat_routes(p_school uuid default null, p_spot uuid default null)
returns table (
  id uuid,
  school_id uuid,
  spot_id uuid,
  geojson json,
  duration_min int,
  notes text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    r.id,
    r.school_id,
    r.spot_id,
    st_asgeojson(r.geometry::geometry)::json,
    r.duration_min,
    r.notes
  from public.boat_routes r
  where (p_school is null or r.school_id = p_school)
    and (p_spot is null or r.spot_id = p_spot);
$$;

-- Create or replace the route from a school to a spot
create or replace function public.save_boat_route(
  p_school uuid,
  p_spot uuid,
  p_geojson json,
  p_duration int,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  rid uuid;
begin
  insert into public.boat_routes (school_id, spot_id, geometry, duration_min, notes)
  values (
    p_school,
    p_spot,
    st_setsrid(st_geomfromgeojson(p_geojson::text), 4326)::geography,
    p_duration,
    p_notes
  )
  on conflict (school_id, spot_id) do update
    set geometry = excluded.geometry,
        duration_min = excluded.duration_min,
        notes = excluded.notes
  returning id into rid;

  return rid;
end;
$$;
