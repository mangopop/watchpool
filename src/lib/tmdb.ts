import type { TmdbMediaType, TmdbSearchResult } from "./tmdb-shared";

// TMDB integration (Phase 2). Server-only — TMDB_API_KEY never reaches the
// client. Search results carry no runtime; that needs a second /movie or
// /tv/{id} call once a title is actually selected.

const TMDB_BASE = "https://api.themoviedb.org/3";

export interface TmdbMovieDetails extends TmdbSearchResult {
  // Movies only — a series has no single runtime (episode length isn't
  // total watch time), so this stays null for mediaType "tv" rather than
  // standing in for something it isn't.
  runtime: number | null;
  // TMDB's own user-rating (0-10), not IMDb's — a real IMDb score needs a
  // second API (OMDb), which TODO.md's "Open decisions" already ruled out
  // adding just for one field once TMDB covers metadata + providers alone.
  voteAverage: number | null;
  // TMDB genre names, e.g. ["Comedy", "Thriller"].
  genres: string[];
}

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

function releaseYear(date: string | null | undefined): number | null {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(year) && year > 0 ? year : null;
}

export async function searchTitles(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE}/search/multi`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? [])
    .filter((r: Record<string, unknown>) => r.media_type === "movie" || r.media_type === "tv")
    .map((r: Record<string, unknown>) => {
      const mediaType = r.media_type as TmdbMediaType;
      return {
        tmdbId: r.id as number,
        mediaType,
        title: (mediaType === "movie" ? r.title : r.name) as string,
        releaseYear: releaseYear((mediaType === "movie" ? r.release_date : r.first_air_date) as string | undefined),
        posterPath: (r.poster_path as string | null) ?? null,
      };
    });
}

// GB only (see TODO.md "Where friends actually watch") — flatrate and
// ads-supported tiers count as "on your service"; rent/buy don't. "free" is
// also included, but only matters for BBC iPlayer: TMDB always categorises
// iPlayer there (license-funded, never flatrate/ads), and the id map below
// means no other "free" provider can leak in through this tier.
const TMDB_REGION = "GB";

// TMDB provider_id -> our app-internal service id (src/lib/watch-pool/constants.ts).
// Verified against GET /watch/providers/movie?watch_region=GB.
const PROVIDER_ID_TO_SERVICE: Record<number, string> = {
  8: "netflix",
  9: "prime",
  337: "disney",
  11: "mubi",
  39: "now",
  38: "iplayer",
};

interface TmdbWatchProviderEntry {
  provider_id: number;
}

export async function getWatchProviders(tmdbId: number, mediaType: TmdbMediaType): Promise<string[]> {
  const url = new URL(`${TMDB_BASE}/${mediaType}/${tmdbId}/watch/providers`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB watch providers failed: ${res.status}`);
  const data = await res.json();

  const region = data.results?.[TMDB_REGION];
  if (!region) return [];

  const entries: TmdbWatchProviderEntry[] = [
    ...(region.flatrate ?? []),
    ...(region.ads ?? []),
    ...(region.free ?? []),
  ];
  const services = new Set(
    entries.map((e) => PROVIDER_ID_TO_SERVICE[e.provider_id]).filter((id): id is string => !!id),
  );
  return [...services];
}

export async function getMovieDetails(tmdbId: number, mediaType: TmdbMediaType): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE}/${mediaType}/${tmdbId}`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB ${mediaType} lookup failed: ${res.status}`);
  const data = await res.json();

  return {
    tmdbId: data.id,
    mediaType,
    title: mediaType === "movie" ? data.title : data.name,
    releaseYear: releaseYear(mediaType === "movie" ? data.release_date : data.first_air_date),
    posterPath: data.poster_path ?? null,
    runtime:
      mediaType === "movie" && typeof data.runtime === "number" && data.runtime > 0 ? data.runtime : null,
    voteAverage:
      typeof data.vote_average === "number" && data.vote_count > 0 ? data.vote_average : null,
    genres: Array.isArray(data.genres)
      ? data.genres.map((g: { name: string }) => g.name).filter(Boolean)
      : [],
  };
}
