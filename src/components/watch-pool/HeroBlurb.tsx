import type { ReactNode } from "react";
import { TMDB_POSTER_LARGE } from "@/lib/tmdb-shared";
import { friendName, posterGradient } from "@/lib/watch-pool/logic";
import type { Friend, FriendId } from "@/lib/watch-pool/types";

// Large, faded poster bleeding off the right edge of a hero card, behind
// the text — falls back to the same title-hash gradient the movie grid
// cards use when there's no TMDB poster.
export function HeroArt({ title, posterPath }: { title: string; posterPath: string | null }) {
  return posterPath ? (
    <img className="hero-art" src={`${TMDB_POSTER_LARGE}${posterPath}`} alt="" aria-hidden="true" />
  ) : (
    <div className="hero-art hero-art-fallback" style={{ background: posterGradient(title) }} aria-hidden="true" />
  );
}

interface HeroBlurbProps {
  eyebrow: ReactNode;
  title: string;
  detail: ReactNode;
  pitch: string;
  recommendedBy: FriendId;
  currentUserId: string;
  friends: Friend[];
}

// Shared eyebrow/title/detail/pitch/attribution layout used by both the
// "What's Hot" hero and the "must-see" hero — keeps the two cards visually
// identical without duplicating the markup.
export function HeroBlurb({ eyebrow, title, detail, pitch, recommendedBy, currentUserId, friends }: HeroBlurbProps) {
  return (
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <div className="blindspot">{detail}</div>
      <q>{pitch}</q>
      <cite className="said">
        —{" "}
        {recommendedBy === currentUserId ? (
          <b className="yours">You</b>
        ) : (
          <b>{friendName(friends, recommendedBy)}</b>
        )}
      </cite>
    </div>
  );
}
