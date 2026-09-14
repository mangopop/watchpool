import type { ReactionTier, Service } from "./types";

// Mock streaming services — will be replaced by real TMDB provider data in
// a later phase. Friend group now comes from real group membership.
export const SERVICES: Service[] = [
  { id: "netflix", name: "Netflix" },
  { id: "prime", name: "Prime Video" },
  { id: "disney", name: "Disney+" },
  { id: "mubi", name: "MUBI" },
  { id: "now", name: "Now TV" },
  { id: "iplayer", name: "iPlayer" },
];

// Four tiers: loved sits above liked, and carries twice the weight.
export const REACTIONS: { id: ReactionTier; icon: string; label: string }[] = [
  { id: "loved", icon: "❤️", label: "Loved it" },
  { id: "liked", icon: "👍", label: "Liked it" },
  { id: "meh", icon: "😐", label: "Meh" },
  { id: "miss", icon: "👎", label: "Didn't like it" },
];

export const WEIGHT: Record<ReactionTier, number> = {
  loved: 1,
  liked: 0.5,
  meh: 0,
  miss: -1,
};

export const TIER_ICON: Record<ReactionTier, string> = {
  loved: "❤️",
  liked: "👍",
  meh: "😐",
  miss: "👎",
};

// Hero + at most two minis, so the top of the page can't sprawl.
export const HOT_MAX = 3;

export const POSTER_PAIRS: [string, string][] = [
  ["#E8A33D", "#7A4413"],
  ["#4E8C80", "#12322D"],
  ["#B9543C", "#4A1C14"],
  ["#6C7FA8", "#242C44"],
  ["#8C6A4F", "#3A2718"],
  ["#5C8551", "#23361F"],
];
