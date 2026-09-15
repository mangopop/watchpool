"use client";

import type { ReactNode } from "react";
import { REACTIONS } from "@/lib/watch-pool/constants";
import type { ReactionTier } from "@/lib/watch-pool/types";

interface ReactionTierButtonsProps {
  ariaLabel: string;
  label?: ReactNode;
  rating: ReactionTier | null;
  onSetRating: (rating: ReactionTier) => void;
}

export function ReactionTierButtons({ ariaLabel, label, rating, onSetRating }: ReactionTierButtonsProps) {
  return (
    <div className="react-row" role="group" aria-label={ariaLabel}>
      {label && <span>{label}</span>}
      {REACTIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          className="react-btn"
          aria-pressed={rating === r.id}
          title={r.label}
          aria-label={r.label}
          onClick={() => onSetRating(r.id)}
        >
          {r.icon}
        </button>
      ))}
    </div>
  );
}
