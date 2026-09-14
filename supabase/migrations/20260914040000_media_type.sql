-- Movies and TV series share the pool now (see src/lib/tmdb.ts
-- searchTitles, /search/multi). A series has no single runtime the way a
-- movie does, so media_type lets the UI/logic tell them apart and skip
-- runtime for series rather than showing something misleading.
alter table public.movies
  add column media_type text not null default 'movie' check (media_type in ('movie', 'tv'));
