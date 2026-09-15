"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { runtimeLabel, serviceName, tallyVerdict, tonightPicks } from "@/lib/watch-pool/logic";
import type { PoolState } from "@/lib/watch-pool/types";
import { ToggleRow } from "./ToggleRow";

export interface TonightDialogHandle {
  open: () => void;
}

interface TonightDialogProps {
  state: PoolState;
  onSetTimeLimit: (mins: number) => void;
  onLock: (movieId: string, service: string) => void;
}

const TIME_OPTIONS = [
  { mins: 100, label: "Under 1h40" },
  { mins: 120, label: "Under 2h" },
  { mins: 999, label: "All night" },
];

export const TonightDialog = forwardRef<TonightDialogHandle, TonightDialogProps>(function TonightDialog(
  { state, onSetTimeLimit, onLock },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
  }));

  const res = tonightPicks(state);
  const reasons: string[] = [];
  if (res.seen) reasons.push(`${res.seen} you've already seen`);
  if (res.passed) reasons.push(`${res.passed} you passed on`);
  if (res.noStream) reasons.push(`${res.noStream} not on your services`);
  if (res.tooLong) reasons.push(`${res.tooLong} too long for the window`);

  return (
    <dialog ref={dialogRef}>
      <div className="modal">
        <h2>Decide for me</h2>
        <p className="lede">
          In the pool → you haven&rsquo;t seen it → streaming on your services → fits your time → ranked
          by how the group rated it
        </p>
        <ToggleRow
          label="Time available"
          options={TIME_OPTIONS}
          getKey={(opt) => opt.mins}
          getLabel={(opt) => opt.label}
          isActive={(opt) => state.timeLimit === opt.mins}
          onToggle={(opt) => onSetTimeLimit(opt.mins)}
        />

        <div className="chain">
          {res.picks.length === 0 ? (
            <div className="ruled-out">
              Nothing clears the chain for this time window. Try a longer window, or add services in
              settings.
            </div>
          ) : (
            res.picks.slice(0, 4).map((p, i) => {
              const verdict = !p.endorsed ? (
                "no verdicts yet"
              ) : (
                <>
                  <b>{tallyVerdict(p.tally).pct}%</b> {tallyVerdict(p.tally).label} ·{" "}
                  {p.tally.watched}/{p.tally.total} watched
                </>
              );
              return (
                <div className={`pick-row${i === 0 ? " top" : ""}`} key={p.movie.id}>
                  <div>
                    <h3>{p.movie.title}</h3>
                    <div className="meta">
                      {p.movie.runtime !== null && <>{runtimeLabel(p.movie.runtime)} · </>}
                      on <b>{serviceName(p.service)}</b> · {verdict}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={() => {
                      onLock(p.movie.id, p.service);
                      dialogRef.current?.close();
                    }}
                  >
                    That&rsquo;s the one
                  </button>
                </div>
              );
            })
          )}
        </div>

        {reasons.length > 0 && <div className="ruled-out">Ruled out: {reasons.join(" · ")}</div>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});
