import type { ReactNode } from "react";
import { friendName } from "@/lib/watch-pool/logic";
import type { Friend, FriendId } from "@/lib/watch-pool/types";

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
