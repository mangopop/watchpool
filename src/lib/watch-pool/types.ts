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

export interface Movie {
  id: string;
  title: string;
  recommendedBy: FriendId;
  runtime: number;
  providers: string[];
  pitch: string;
  dateAdded: string;
  reactions: Record<FriendId, Reaction>;
  plea?: string;
  revived?: boolean;
  bumpedBy?: FriendId;
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

export interface Affinity {
  pct: number;
  shared: number;
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
