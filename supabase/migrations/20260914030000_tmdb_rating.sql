-- TMDB's own user rating (0-10), fetched alongside runtime/poster/year at
-- confirm time (see src/lib/watch-pool/actions.ts addMovieAction). Not
-- IMDb's rating — see tmdb.ts for why that's a deliberate scope call.
alter table public.movies add column tmdb_rating numeric(3, 1);
