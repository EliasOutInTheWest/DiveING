-- =====================================================
-- Reviews and ratings
-- Paste into Supabase > SQL Editor > New query > Run
-- (needs the earlier SQL files; safe to run more than once)
-- =====================================================

-- text length + helpful indexes
alter table public.reviews drop constraint if exists reviews_body_check;
alter table public.reviews add constraint reviews_body_check
  check (body is null or char_length(body) <= 1000);

create index if not exists reviews_spot_idx on public.reviews (spot_id, created_at desc);
create index if not exists reviews_school_idx on public.reviews (school_id, created_at desc);

-- only verified users may write reviews, and school staff may not review their own school
drop policy if exists "insert own review" on public.reviews;
create policy "insert own review" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_verified()
    and (school_id is null or not public.is_school_member(school_id))
  );

-- admins can remove any review (users can still edit/delete their own)
drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews
  for delete to authenticated using (public.is_admin());

-- when a review is edited, who wrote it and what it is about cannot change
create or replace function public.reviews_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := old.user_id;
  new.spot_id := old.spot_id;
  new.school_id := old.school_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists reviews_guard_trg on public.reviews;
create trigger reviews_guard_trg
  before update on public.reviews
  for each row execute function public.reviews_guard();
