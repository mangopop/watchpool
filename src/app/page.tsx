import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { WatchPool } from "@/components/watch-pool/WatchPool";
import { createClient } from "@/lib/supabase/server";
import type { Friend, Movie } from "@/lib/watch-pool/types";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A user can belong to several groups eventually; for now the pool shows
  // the one they joined first — group switching isn't built yet.
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/groups");
  }

  const groupId = membership.group_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberIds = (members ?? []).map((m) => m.user_id);

  const { data: memberProfiles } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : { data: [] };

  const friends: Friend[] = (memberProfiles ?? []).map((p) => ({ id: p.id, name: p.display_name }));

  const { data: movieRows } = await supabase
    .from("movies")
    .select("*")
    .eq("group_id", groupId)
    .order("date_added", { ascending: false });

  const movieIds = (movieRows ?? []).map((m) => m.id);

  const { data: reactionRows } =
    movieIds.length > 0
      ? await supabase.from("reactions").select("*").in("movie_id", movieIds)
      : { data: [] };

  // runtime/providers are stand-in values until TMDB integration (Phase 2) —
  // the schema has no columns for them yet.
  const movies: Movie[] = (movieRows ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    recommendedBy: m.recommended_by,
    runtime: 110,
    providers: ["prime"],
    pitch: m.pitch,
    dateAdded: m.date_added,
    reactions: Object.fromEntries(
      (reactionRows ?? [])
        .filter((r) => r.movie_id === m.id)
        .map((r) => [
          r.user_id,
          { status: r.status, rating: r.rating, note: r.note, noteDismissed: r.note_dismissed },
        ]),
    ),
    plea: m.plea ?? undefined,
    revived: m.revived,
    bumpedBy: m.bumped_by ?? undefined,
  }));

  return (
    <WatchPool
      viewerName={profile?.display_name ?? user.email ?? ""}
      onSignOut={signOut}
      currentUserId={user.id}
      groupId={groupId}
      friends={friends}
      initialMovies={movies}
    />
  );
}
