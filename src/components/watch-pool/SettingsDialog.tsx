"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { SERVICES } from "@/lib/watch-pool/constants";
import { myServices } from "@/lib/watch-pool/logic";
import type { PoolState } from "@/lib/watch-pool/types";

export interface SettingsDialogHandle {
  open: () => void;
}

interface SettingsDialogProps {
  state: PoolState;
  onToggleService: (serviceId: string) => void;
  hideTmdbRating: boolean;
  onToggleHideTmdbRating: () => void;
}

export const SettingsDialog = forwardRef<SettingsDialogHandle, SettingsDialogProps>(
  function SettingsDialog({ state, onToggleService, hideTmdbRating, onToggleHideTmdbRating }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.showModal(),
    }));

    const mine = myServices(state);

    return (
      <dialog ref={dialogRef}>
        <div className="modal">
          <h2>Your services</h2>
          <p className="lede">
            One-time setup, per person — drives &ldquo;streaming on a service you have&rdquo;
          </p>
          <div className="field">
            <span className="step-label">Your services</span>
            <div className="toggle-row">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="toggle"
                  aria-pressed={mine.includes(s.id)}
                  onClick={() => onToggleService(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="step-label">Ratings</span>
            <div className="toggle-row">
              <button
                type="button"
                className="toggle"
                aria-pressed={hideTmdbRating}
                onClick={onToggleHideTmdbRating}
              >
                Hide TMDB score
              </button>
            </div>
            <p className="hint">
              Just this device — TMDB&rsquo;s own rating often reads very different from IMDb/RT
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-solid" onClick={() => dialogRef.current?.close()}>
              Done
            </button>
          </div>
        </div>
      </dialog>
    );
  },
);
