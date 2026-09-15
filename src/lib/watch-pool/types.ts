export type FriendId = string;

export interface Friend {
  id: FriendId;
  name: string;
}

export interface Service {
  id: string;
  name: string;
}

export type ReactionStatus = "want" | "watched" | "skip";
export type ReactionTier = "loved" | "liked" | "meh" | "miss";

export interface Reaction {
  status: ReactionStatus | null;
  rating: ReactionTier | null;
  note: string | null;
  noteDismissed?: boolean;
}

export type MediaType = "movie" | "tv";

export interface Movie {
  id: string;
  title: string;
  mediaType: MediaType;
  recommendedBy: FriendId;
  // Movies only — a series has no single runtime (episode length isn't
  // total watch time), so this stays null for mediaType "tv".
  runtime: number | null;
  providers: string[];
  pitch: string;
  dateAdded: string;
  reactions: Record<FriendId, Reaction>;
  plea?: string;
  pleaBy?: FriendId;
  revived?: boolean;
  bumpedBy?: FriendId;
  tmdbId: number | null;
  posterPath: string | null;
  releaseYear: number | null;
  // TMDB's own user rating (0-10), not IMDb's — see tmdb.ts.
  tmdbRating: number | null;
  genres: string[];
  trailerKey: string | null;
  // GB certification (e.g. "12A", "15") — see tmdb.ts.
  ageRating: string | null;
}

export interface Tonight {
  id: string;
  service: string;
}

export interface PoolState {
  currentFriend: FriendId;
  friends: Friend[];
  filter: string;
  tonight: Tonight | null;
  timeLimit: number;
  services: Record<FriendId, string[]>;
  movies: Movie[];
}

export interface Tally {
  want: number;
  watched: number;
  skip: number;
  loved: number;
  liked: number;
  meh: number;
  miss: number;
  total: number;
  names: Record<ReactionTier, string[]>;
  notes: { who: string; note: string }[];
  score: number;
  approval: number;
  lovedPct: number;
  likedPct: number;
}

export type RetireBucket = "ignored" | "panned";

export interface RetireState {
  bucket: RetireBucket;
  why: string;
}

export interface HotCandidate {
  movie: Movie;
  tally: Tally;
  missing: number;
  rank: number;
}

export interface IgnoredSpotlight {
  movie: Movie;
  why: string;
}

export interface Affinity {
  pct: number;
  shared: number;
  topGenre: string | null;
}

export interface NotePrompt {
  question: string;
  chips: string[];
}

export interface TonightPick {
  movie: Movie;
  tally: Tally;
  service: string;
  endorsed: boolean;
  rank: number;
}

export interface TonightResult {
  picks: TonightPick[];
  seen: number;
  passed: number;
  noStream: number;
  tooLong: number;
}
