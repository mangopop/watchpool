"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMovieDetails, getWatchProviders } from "@/lib/tmdb";
import type { ReactionStatus, ReactionTier } from "./types";

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
) {
  const { supabase, user } = await requireUser();

  // Search results carry no runtime — look it up now, at the point the pick
  // is actually confirmed, rather than on every keystroke of the search box.
  const details = tmdbId ? await getMovieDetails(tmdbId).catch(() => null) : null;

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
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Providers aren't persisted (they go stale, unlike runtime) — fetched
  // fresh here so the optimistic client insert isn't stuck on a stub.
  const providers = details ? await getWatchProviders(details.tmdbId).catch(() => []) : [];

  revalidatePath("/");
  return { ...data, providers };
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

export async function updateMovieAction(
  movieId: string,
  patch: { revived?: boolean; plea?: string; bumped_by?: string },
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("movies").update(patch).eq("id", movieId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
