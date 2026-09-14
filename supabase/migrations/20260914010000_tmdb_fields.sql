-- Watch Pool — Phase 2: TMDB metadata on movies
--
-- Nullable because manual entries (no TMDB match) still have no metadata,
-- and the app must keep working for those — this is a fallback, not a
-- requirement.

alter table public.movies
  add column tmdb_id integer,
  add column poster_path text,
  add column release_year integer,
  add column runtime_minutes integer;
