-- TMDB genre names (e.g. "Comedy", "Thriller"), fetched alongside
-- runtime/poster/rating at confirm time (see src/lib/watch-pool/actions.ts
-- addMovieAction). Nullable/empty for manual entries with no TMDB match.
alter table public.movies add column genres text[] not null default '{}';
