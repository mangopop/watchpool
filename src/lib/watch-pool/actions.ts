"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMovieDetails, getWatchProviders } from "@/lib/tmdb";
import type { TmdbMediaType } from "@/lib/tmdb-shared";
import type { ReactionStatus, ReactionTier } from "./types";

export async function updateDisplayNameAction(displayName: string) {
  const { supabase, user } = await requireUser();

  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("Name can't be empty");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function addMovieAction(
  groupId: string,
  title: string,
  pitch: string,
  tmdbId: number | null,
  mediaType: TmdbMediaType,
) {
  const { supabase, user } = await requireUser();

  // Search results carry no runtime — look it up now, at the point the pick
  // is actually confirmed, rather than on every keystroke of the search box.
  const details = tmdbId ? await getMovieDetails(tmdbId, mediaType).catch(() => null) : null;

  const { data, error } = await supabase
    .from("movies")
    .insert({
      group_id: groupId,
      title,
      pitch,
      recommended_by: user.id,
      tmdb_id: details?.tmdbId ?? null,
      poster_path: details?.posterPath ?? null,
      release_year: details?.releaseYear ?? null,
      runtime_minutes: details?.runtime ?? null,
      tmdb_rating: details?.voteAverage ?? null,
      genres: details?.genres ?? [],
      trailer_key: details?.trailerKey ?? null,
      // A manual entry with no TMDB match can't be identified — defaults to
      // "movie" the same way it always has.
      media_type: details ? mediaType : "movie",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Providers aren't persisted (they go stale, unlike runtime) — fetched
  // fresh here so the optimistic client insert isn't stuck on a stub.
  const providers = details ? await getWatchProviders(details.tmdbId, mediaType).catch(() => []) : [];

  revalidatePath("/");
  return { ...data, providers };
}

// One-time catch-up for movies added before trailers/genres were fetched
// (those columns didn't exist yet, so tmdb_id is set but trailer_key is
// null and/or genres is empty). Capped per call — run from the client on
// load, group by group, rather than a bulk migration script that'd need a
// service-role key.
const BACKFILL_LIMIT = 8;

export async function backfillTrailersAction(
  groupId: string,
): Promise<{ id: string; trailerKey: string | null; genres: string[] | null }[]> {
  const { supabase } = await requireUser();

  const { data: candidates, error } = await supabase
    .from("movies")
    .select("id, tmdb_id, media_type, trailer_key, genres")
    .eq("group_id", groupId)
    .not("tmdb_id", "is", null)
    .limit(200);
  if (error) throw new Error(error.message);

  const stale = (candidates ?? [])
    .filter((c) => c.trailer_key === null || c.genres.length === 0)
    .slice(0, BACKFILL_LIMIT);
  if (stale.length === 0) return [];

  const results = await Promise.all(
    stale.map(async (c) => {
      const details = await getMovieDetails(c.tmdb_id!, c.media_type).catch(() => null);
      return {
        id: c.id,
        // Don't clobber a value that's already there with a fetch failure.
        trailerKey: details ? details.trailerKey : c.trailer_key,
        genres: details && details.genres.length > 0 ? details.genres : c.genres.length > 0 ? c.genres : null,
      };
    }),
  );

  const found = results.filter((r) => r.trailerKey !== null || r.genres !== null);
  await Promise.all(
    found.map((r) =>
      supabase
        .from("movies")
        .update({ trailer_key: r.trailerKey, ...(r.genres !== null ? { genres: r.genres } : {}) })
        .eq("id", r.id),
    ),
  );

  if (found.length > 0) revalidatePath("/");
  return results;
}

export async function setMyServiceAction(serviceId: string, enabled: boolean) {
  const { supabase, user } = await requireUser();
  if (enabled) {
    const { error } = await supabase.from("user_services").insert({ user_id: user.id, service_id: serviceId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_services")
      .delete()
      .eq("user_id", user.id)
      .eq("service_id", serviceId);
    if (error) throw new Error(error.message);
  }
}

export async function setReactionAction(
  movieId: string,
  reaction: {
    status: ReactionStatus | null;
    rating: ReactionTier | null;
    note: string | null;
    noteDismissed: boolean;
  },
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("reactions").upsert(
    {
      movie_id: movieId,
      user_id: user.id,
      status: reaction.status,
      rating: reaction.rating,
      note: reaction.note,
      note_dismissed: reaction.noteDismissed,
    },
    { onConflict: "movie_id,user_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteMovieAction(movieId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("movies").delete().eq("id", movieId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateMovieAction(
  movieId: string,
  patch: { revived?: boolean; plea?: string; bumped_by?: string; pitch?: string },
) {
  const { supabase } = await requireUser();

  const allowedPatch: typeof patch = {};
  if ("revived" in patch) allowedPatch.revived = patch.revived;
  if ("plea" in patch) allowedPatch.plea = patch.plea;
  if ("bumped_by" in patch) allowedPatch.bumped_by = patch.bumped_by;
  if ("pitch" in patch) allowedPatch.pitch = patch.pitch;

  const { error } = await supabase.from("movies").update(allowedPatch).eq("id", movieId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
