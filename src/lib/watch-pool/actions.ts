"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReactionStatus, ReactionTier } from "./types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function addMovieAction(groupId: string, title: string, pitch: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("movies")
    .insert({ group_id: groupId, title, pitch, recommended_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/");
  return data;
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
