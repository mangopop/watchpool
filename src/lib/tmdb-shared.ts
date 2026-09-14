// Types/constants safe to import from client components. The actual TMDB
// fetch calls (which need TMDB_API_KEY) live in tmdb.ts, server-only.

export const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w200";

export type TmdbMediaType = "movie" | "tv";

export interface TmdbSearchResult {
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
}
