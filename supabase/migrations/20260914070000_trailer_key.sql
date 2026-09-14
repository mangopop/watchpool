-- YouTube video id for the trailer, fetched alongside runtime/poster/rating
-- at confirm time (see src/lib/watch-pool/actions.ts addMovieAction). Null
-- when TMDB has no trailer or for manual entries with no TMDB match.
alter table public.movies add column trailer_key text;
