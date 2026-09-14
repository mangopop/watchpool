import type { TmdbSearchResult } from "./tmdb-shared";

// TMDB integration (Phase 2). Server-only — TMDB_API_KEY never reaches the
// client. Search results carry no runtime; that needs a second /movie/{id}
// call once a title is actually selected.

const TMDB_BASE = "https://api.themoviedb.org/3";

export interface TmdbMovieDetails extends TmdbSearchResult {
  runtime: number | null;
}

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

function releaseYear(releaseDate: string | null | undefined): number | null {
  const year = releaseDate ? Number(releaseDate.slice(0, 4)) : NaN;
  return Number.isFinite(year) && year > 0 ? year : null;
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    tmdbId: r.id as number,
    title: r.title as string,
    releaseYear: releaseYear(r.release_date as string | undefined),
    posterPath: (r.poster_path as string | null) ?? null,
  }));
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB movie lookup failed: ${res.status}`);
  const data = await res.json();

  return {
    tmdbId: data.id,
    title: data.title,
    releaseYear: releaseYear(data.release_date),
    posterPath: data.poster_path ?? null,
    runtime: typeof data.runtime === "number" && data.runtime > 0 ? data.runtime : null,
  };
}
