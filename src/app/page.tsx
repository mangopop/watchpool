import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { WatchPool } from "@/components/watch-pool/WatchPool";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getWatchProviders } from "@/lib/tmdb";
import type { Friend, Movie } from "@/lib/watch-pool/types";

type ReactionRow = Database["public"]["Tables"]["reactions"]["Row"];

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

  // These four only depend on user.id/groupId, not on each other — fired
  // together instead of chained, since each round trip's latency used to
  // stack (very noticeable on mobile navigating between / and /groups).
  const [{ data: profile }, { data: members }, { data: movieRows }, { data: serviceRows }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("group_members").select("user_id").eq("group_id", groupId),
    supabase.from("movies").select("*").eq("group_id", groupId).order("date_added", { ascending: false }),
    supabase.from("user_services").select("service_id").eq("user_id", user.id),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const movieIds = (movieRows ?? []).map((m) => m.id);
  const initialServices = (serviceRows ?? []).map((r) => r.service_id);

  // Same deal: member profiles, reactions, and live TMDB provider lookups
  // are all independent of each other once movieRows/members are known.
  const [{ data: memberProfiles }, { data: reactionRows }, providersByMovie] = await Promise.all([
    memberIds.length > 0
      ? supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    movieIds.length > 0
      ? supabase.from("reactions").select("*").in("movie_id", movieIds)
      : Promise.resolve({ data: [] as ReactionRow[] }),
    // Providers aren't stored — availability drifts over time (unlike
    // runtime), so they're fetched fresh from TMDB on every load.
    Promise.all(
      (movieRows ?? []).map((m) =>
        m.tmdb_id ? getWatchProviders(m.tmdb_id).catch(() => []) : Promise.resolve([] as string[]),
      ),
    ),
  ]);

  const friends: Friend[] = (memberProfiles ?? []).map((p) => ({ id: p.id, name: p.display_name }));

  const movies: Movie[] = (movieRows ?? []).map((m, i) => ({
    id: m.id,
    title: m.title,
    recommendedBy: m.recommended_by,
    runtime: m.runtime_minutes ?? null,
    providers: providersByMovie[i],
    pitch: m.pitch,
    dateAdded: m.date_added,
    tmdbId: m.tmdb_id ?? null,
    posterPath: m.poster_path ?? null,
    releaseYear: m.release_year ?? null,
    tmdbRating: m.tmdb_rating ?? null,
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
      initialServices={initialServices}
    />
  );
}
