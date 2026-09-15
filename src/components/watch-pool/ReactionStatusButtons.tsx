"use client";

import type { ReactionStatus } from "@/lib/watch-pool/types";

const LABELS: Record<ReactionStatus, string> = {
  want: "Want",
  watched: "Watched",
  skip: "Pass",
};

interface ReactionStatusButtonsProps {
  title: string;
  status: ReactionStatus | null;
  onSetStatus: (status: ReactionStatus) => void;
}

export function ReactionStatusButtons({ title, status, onSetStatus }: ReactionStatusButtonsProps) {
  return (
    <div className="seg" role="group" aria-label={`Your status for ${title}`}>
      {(["want", "watched", "skip"] as ReactionStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          data-state={s}
          aria-pressed={status === s}
          onClick={() => onSetStatus(s)}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}
