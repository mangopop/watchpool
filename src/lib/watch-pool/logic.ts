import { HOT_MAX, POSTER_PAIRS, SERVICES, WEIGHT } from "./constants";
import type {
  Affinity,
  Friend,
  FriendId,
  HotCandidate,
  IgnoredSpotlight,
  Movie,
  NotePrompt,
  PoolState,
  Reaction,
  ReactionTier,
  RetireState,
  Tally,
  TonightResult,
} from "./types";

export function friendName(friends: Friend[], id: FriendId): string {
  return friends.find((f) => f.id === id)?.name ?? id;
}

export function serviceName(id: string): string {
  return SERVICES.find((s) => s.id === id)?.name ?? id;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function posterGradient(title: string): string {
  const [a, b] = POSTER_PAIRS[hashStr(title) % POSTER_PAIRS.length];
  return `linear-gradient(158deg,${a},${b})`;
}

export function initials(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  return words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
}

export function runtimeLabel(mins: number | null): string {
  if (mins === null) return "runtime unknown";
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}`;
}

// BBFC's own colour coding (green/yellow/blue/red/black) — recognisable at a
// glance to anyone in the UK, so the badge borrows it rather than inventing
// a new scheme. "12A" and "12" share a colour; anything else (TV content
// ratings TMDB doesn't map cleanly, e.g. "R18") falls back to neutral.
export function ageRatingClass(rating: string): string {
  switch (rating.toUpperCase().replace(/A$/, "")) {
    case "U":
      return "u";
    case "PG":
      return "pg";
    case "12":
      return "twelve";
    case "15":
      return "fifteen";
    case "18":
      return "eighteen";
    default:
      return "other";
  }
}

export function daysSince(iso: string): number {
  // Calendar-day difference (local time), not a rolling 24h window — a pick
  // added at 11pm yesterday should read "yesterday" a minute after midnight,
  // not still "today" until a full 24h has elapsed.
  const then = new Date(iso);
  const now = new Date();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfNow.getTime() - startOfThen.getTime()) / 86400000);
}

export function daysAgoLabel(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export function myReaction(movie: Movie, friendId: FriendId): Reaction {
  return movie.reactions[friendId] ?? { status: null, rating: null, note: null };
}

export function myServices(state: PoolState): string[] {
  return state.services[state.currentFriend] ?? [];
}

export function myPickAverageRating(state: PoolState): number | null {
  const ratings = state.movies
    .filter((m) => m.recommendedBy === state.currentFriend && m.tmdbRating !== null)
    .map((m) => m.tmdbRating as number);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

export function tallyFor(state: PoolState, movie: Movie): Tally {
  const t: Tally = {
    want: 0,
    watched: 0,
    skip: 0,
    loved: 0,
    liked: 0,
    meh: 0,
    miss: 0,
    total: state.friends.length,
    names: { loved: [], liked: [], meh: [], miss: [] },
    notes: [],
    score: 0,
    approval: 0,
    lovedPct: 0,
    likedPct: 0,
  };
  for (const fid of Object.keys(movie.reactions)) {
    const r = movie.reactions[fid];
    if (r.status === "want") t.want++;
    else if (r.status === "watched") {
      t.watched++;
      if (r.rating) {
        t[r.rating]++;
        t.names[r.rating].push(friendName(state.friends, fid));
        t.score += WEIGHT[r.rating];
      }
      if (r.note) t.notes.push({ who: friendName(state.friends, fid), note: r.note });
    } else if (r.status === "skip") t.skip++;
  }
  // loved counts full, liked half, miss subtracts
  t.approval = t.watched ? t.score / t.watched : 0;
  t.lovedPct = t.watched ? Math.round((t.loved / t.watched) * 100) : 0;
  t.likedPct = t.watched ? Math.round(((t.loved + t.liked) / t.watched) * 100) : 0;
  return t;
}

// Shared "X% loved/liked it" framing used by the hero, hot-mini cards, and
// the Tonight picker — leads with lovedPct once anyone loved it, otherwise
// falls back to likedPct.
export function tallyVerdict(t: Tally): { pct: number; label: string } {
  return t.loved > 0 ? { pct: t.lovedPct, label: "loved it" } : { pct: t.likedPct, label: "liked it" };
}

// Two buckets. Ignored can be revived; panned is final.
export function retireState(state: PoolState, movie: Movie): RetireState | null {
  if (movie.revived) return null;
  const t = tallyFor(state, movie);
  if (t.watched >= 2 && t.score < 0 && t.want === 0) {
    return { bucket: "panned", why: "the group didn't like it" };
  }
  if (t.watched === 0 && t.want === 0 && (t.skip >= 2 || daysSince(movie.dateAdded) >= 7)) {
    return {
      bucket: "ignored",
      why: t.skip >= 2 ? `${t.skip} people passed without watching` : `untouched for ${daysSince(movie.dateAdded)} days`,
    };
  }
  return null;
}

export function livePool(state: PoolState): Movie[] {
  return state.movies.filter((m) => !retireState(state, m));
}

// What's Hot: near-unanimous and genuinely loved, still actionable for you.
export function hotCandidates(state: PoolState): HotCandidate[] {
  return livePool(state)
    .map((movie): HotCandidate | null => {
      const t = tallyFor(state, movie);
      const missing = t.total - t.watched - t.skip;
      if (t.total > 0 && missing / t.total > 0.4) return null;
      if (t.watched < 2) return null;
      if (t.approval <= 0) return null;
      if (myReaction(movie, state.currentFriend).status === "watched") return null;
      return { movie, tally: t, missing, rank: (t.watched / t.total) * t.approval };
    })
    .filter((c): c is HotCandidate => c !== null)
    .sort((a, b) => b.rank - a.rank);
}

export const HOT_MAX_ITEMS = HOT_MAX;

// Deliberately narrower than the "Ignored" filter's retireState bucket: this
// is only for movies genuinely lost in the sea, to nudge the people who
// *didn't* recommend it into reacting. The recommender's own reaction is
// always "watched" from the moment they add it (see WatchPool.addMovie), so
// that default is excluded here — what matters is whether anyone else has
// reacted at all. The moment one of them does (skip included), that's a
// decision already made, and it drops out of the spotlight.
//
// Personalized per viewer: there's nothing the recommender themself can do
// about their own pick sitting untouched, so it's never shown to them.
export function ignoredSpotlight(state: PoolState): IgnoredSpotlight | null {
  const candidates = state.movies.filter((movie) => {
    if (movie.revived) return false;
    if (movie.recommendedBy === state.currentFriend) return false;
    if (daysSince(movie.dateAdded) < 7) return false;
    return !state.friends.some((f) => f.id !== movie.recommendedBy && movie.reactions[f.id]?.status);
  });
  if (candidates.length === 0) return null;
  const stalest = candidates.sort((a, b) => daysSince(b.dateAdded) - daysSince(a.dateAdded))[0];
  return {
    movie: stalest,
    why: `untouched for ${daysSince(stalest.dateAdded)} days`,
  };
}

// Per-pair affinity across four tiers; never a global hit rate.
export function affinity(state: PoolState, aId: FriendId, bId: FriendId): Affinity | null {
  const order: Record<ReactionTier, number> = { loved: 3, liked: 2, meh: 1, miss: 0 };
  let shared = 0;
  let score = 0;
  const genreWeight = new Map<string, number>();
  for (const movie of state.movies) {
    const ra = movie.reactions[aId];
    const rb = movie.reactions[bId];
    if (!ra || !rb || ra.status !== "watched" || rb.status !== "watched" || !ra.rating || !rb.rating) continue;
    shared++;
    const gap = Math.abs(order[ra.rating] - order[rb.rating]);
    score += Math.max(0, 1 - gap / 3);
    // Only count genres from titles you both actually landed on — a shared
    // "meh" says nothing about taste, and a loved/miss split is disagreement,
    // not a genre in common.
    const bothPositive = order[ra.rating] >= 2 && order[rb.rating] >= 2;
    if (bothPositive) {
      const weight = order[ra.rating] === 3 && order[rb.rating] === 3 ? 2 : 1;
      for (const g of movie.genres) genreWeight.set(g, (genreWeight.get(g) ?? 0) + weight);
    }
  }
  if (shared < 2) return null;
  let topGenre: string | null = null;
  let topWeight = 0;
  for (const [g, w] of genreWeight) {
    if (w > topWeight) {
      topGenre = g;
      topWeight = w;
    }
  }
  // Require enough signal that it reads as a pattern, not a coincidence.
  if (topWeight < 2) topGenre = null;
  return { pct: Math.round((score / shared) * 100), shared, topGenre };
}

// One-tap note prompt, only at high-value moments — never a cold text box.
export function notePrompt(state: PoolState, movie: Movie, t: Tally, mine: Reaction): NotePrompt | null {
  if (mine.status !== "watched" || !mine.rating || mine.note || mine.noteDismissed) return null;

  const others: ReactionTier[] = [];
  for (const fid of Object.keys(movie.reactions)) {
    if (fid === state.currentFriend) continue;
    const r = movie.reactions[fid];
    if (r.status === "watched" && r.rating) others.push(r.rating);
  }
  if (others.length === 0) return null; // nobody to answer to — never ask cold

  const counts: Record<ReactionTier, number> = { loved: 0, liked: 0, meh: 0, miss: 0 };
  for (const r of others) counts[r]++;
  const majority = (Object.keys(counts) as ReactionTier[]).sort((a, b) => counts[b] - counts[a])[0];
  const positive: Record<ReactionTier, number> = { loved: 1, liked: 1, meh: 0, miss: -1 };
  const opposed = positive[majority] * positive[mine.rating] < 0;
  const lastWatcher = t.total - t.watched - t.skip === 0;
  const rec = movie.recommendedBy;
  const mineOwn = rec === state.currentFriend;

  let question: string;
  if (opposed) question = "You're the outlier — why?";
  else if (lastWatcher) question = "You had the last word";
  else if (!mineOwn) question = `Was ${friendName(state.friends, rec)} right?`;
  else return null; // your own pick and no disagreement — nothing worth asking

  const recName = friendName(state.friends, rec);
  const chips =
    mine.rating === "loved"
      ? mineOwn
        ? ["Told you so", "New favourite", "Instant rewatch"]
        : [`${recName} was right`, "New favourite", "Instant rewatch"]
      : mine.rating === "liked"
        ? mineOwn
          ? ["Holds up", "Better than expected", "Solid"]
          : [`${recName} was right`, "Better than expected", "Solid"]
        : mine.rating === "meh"
          ? ["Fine, not memorable", "Too long", "Overhyped"]
          : mineOwn
            ? ["Fair enough", "Too long", "Not for me"]
            : [`${recName} was wrong`, "Too long", "Not for me"];

  return { question, chips };
}

// Decide for me: personal filter chain over the group's recommendations.
export function tonightPicks(state: PoolState): TonightResult {
  const svc = myServices(state);
  const out: TonightResult = { picks: [], seen: 0, passed: 0, noStream: 0, tooLong: 0 };
  for (const movie of livePool(state)) {
    const mine = myReaction(movie, state.currentFriend);
    if (mine.status === "watched") {
      out.seen++;
      continue;
    }
    if (mine.status === "skip") {
      out.passed++;
      continue;
    }
    const on = movie.providers.find((p) => svc.includes(p));
    if (!on) {
      out.noStream++;
      continue;
    }
    // Unknown runtime (manual entry, no TMDB match) shouldn't silently drop
    // a title from the running — only exclude when we actually know it's too long.
    if (movie.runtime !== null && movie.runtime > state.timeLimit) {
      out.tooLong++;
      continue;
    }
    const t = tallyFor(state, movie);
    out.picks.push({
      movie,
      tally: t,
      service: on,
      endorsed: t.watched > 0,
      rank: t.watched ? (t.watched / t.total) * t.approval : -1,
    });
  }
  // group-endorsed first, best-rated on top; unrated pitches fall to the bottom
  out.picks.sort(
    (a, b) => b.rank - a.rank || (a.movie.runtime ?? Infinity) - (b.movie.runtime ?? Infinity),
  );
  return out;
}

export function passesFilter(state: PoolState, movie: Movie): boolean {
  const ret = retireState(state, movie);
  if (state.filter === "ignored") return !!ret && ret.bucket === "ignored";
  if (state.filter === "panned") return !!ret && ret.bucket === "panned";
  if (ret) return false;
  if (state.filter === "all") return true;
  if (state.filter === "mine") return movie.recommendedBy === state.currentFriend;
  // No default here — an un-reacted movie isn't an implicit "want", it's
  // just unset, so it should only ever show under "All".
  return myReaction(movie, state.currentFriend).status === state.filter;
}
