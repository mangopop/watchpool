-- GB certification (e.g. "12A", "15"), fetched alongside runtime/rating at
-- confirm time (see src/lib/watch-pool/actions.ts addMovieAction). Null when
-- TMDB has no GB entry or for manual entries with no TMDB match.
alter table public.movies add column age_rating text;
