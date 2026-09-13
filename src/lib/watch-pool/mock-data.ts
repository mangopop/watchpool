import type { Movie, PoolState } from "./types";

function seedDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const MOCK_MOVIES: Movie[] = [
  {
    id: "m1",
    title: "Paddington 2",
    recommendedBy: "jake",
    runtime: 103,
    providers: ["netflix", "prime"],
    pitch: "The purest thing ever put on film. If you don't cry you have no soul.",
    dateAdded: seedDate(9),
    reactions: {
      simon: { status: "watched", rating: "loved", note: "Jake was right" },
      priya: { status: "watched", rating: "loved", note: null },
      mia: { status: "want", rating: null, note: null },
    },
  },
  {
    id: "m2",
    title: "The Nice Guys",
    recommendedBy: "mia",
    runtime: 116,
    providers: ["prime", "now"],
    pitch: "Gosling and Crowe as the worst detectives alive. Genuinely one of the funniest scripts of the last decade.",
    dateAdded: seedDate(6),
    reactions: {
      simon: { status: "want", rating: null, note: null },
      jake: { status: "watched", rating: "loved", note: "Better than expected" },
      priya: { status: "watched", rating: "liked", note: null },
      mia: { status: "watched", rating: "loved", note: null },
    },
  },
  {
    id: "m3",
    title: "Columbus",
    recommendedBy: "priya",
    runtime: 104,
    providers: ["mubi"],
    pitch: "Slow, quiet, architecture-obsessed drama. Not for everyone but it's stuck with me for years.",
    dateAdded: seedDate(4),
    reactions: {
      jake: { status: "skip", rating: null, note: null },
      mia: { status: "watched", rating: "meh", note: "Fine, not memorable" },
    },
  },
  {
    id: "m4",
    title: "Speed Racer",
    recommendedBy: "simon",
    runtime: 135,
    providers: ["prime"],
    pitch: "It got savaged on release and it's actually a candy-coloured masterpiece. Fight me.",
    dateAdded: seedDate(12),
    reactions: {
      jake: { status: "watched", rating: "loved", note: null },
      mia: { status: "watched", rating: "miss", note: "Too long" },
      priya: { status: "want", rating: null, note: null },
    },
  },
  {
    id: "m5",
    title: "Blackberry",
    recommendedBy: "jake",
    runtime: 119,
    providers: ["prime", "iplayer"],
    pitch: "Corporate-downfall comedy that's way sharper and sadder than the trailers make it look.",
    dateAdded: seedDate(1),
    reactions: {},
  },
  {
    id: "m6",
    title: "Hundreds of Beavers",
    recommendedBy: "mia",
    runtime: 108,
    providers: ["mubi"],
    pitch: "A silent-era slapstick fever dream with men in beaver suits. Trust me on this one.",
    dateAdded: seedDate(5),
    reactions: {
      priya: { status: "want", rating: null, note: null },
    },
  },
  {
    id: "m7",
    title: "Sinners",
    recommendedBy: "priya",
    runtime: 137,
    providers: ["netflix"],
    pitch: "Coogler doing vampires in the Delta. The music sequence alone is worth it.",
    dateAdded: seedDate(3),
    reactions: {},
  },
  {
    id: "m8",
    title: "Morbius",
    recommendedBy: "jake",
    runtime: 104,
    providers: ["netflix"],
    pitch: "Hear me out — it's so bad it becomes a group bonding experience.",
    dateAdded: seedDate(40),
    reactions: {
      simon: { status: "watched", rating: "miss", note: "Jake was wrong" },
      mia: { status: "watched", rating: "miss", note: null },
    },
  },
  {
    id: "m9",
    title: "Babylon",
    recommendedBy: "priya",
    runtime: 189,
    providers: ["prime"],
    pitch: "Three hours of 1920s Hollywood excess. Someone watch it with me.",
    dateAdded: seedDate(62),
    reactions: {},
  },
  {
    id: "m10",
    title: "Cats",
    recommendedBy: "mia",
    runtime: 110,
    providers: ["netflix"],
    pitch: "Ironically. Obviously ironically. We need to witness it together.",
    dateAdded: seedDate(20),
    reactions: {
      jake: { status: "skip", rating: null, note: null },
      priya: { status: "skip", rating: null, note: null },
    },
  },
];

export function createInitialState(): PoolState {
  return {
    currentFriend: "simon",
    filter: "all",
    tonight: null,
    timeLimit: 120,
    services: {
      simon: ["netflix", "prime", "mubi"],
      jake: ["netflix", "disney"],
      priya: ["prime", "iplayer", "mubi"],
      mia: ["netflix", "now"],
    },
    movies: MOCK_MOVIES,
  };
}
