// Types/constants safe to import from client components. The actual TMDB
// fetch calls (which need TMDB_API_KEY) live in tmdb.ts, server-only.

export const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w200";

export interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
}
