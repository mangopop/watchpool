"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
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
  showAgeRating: boolean;
  onToggleShowAgeRating: () => void;
  displayName: string;
  onSaveDisplayName: (name: string) => void | Promise<void>;
  nameError: string | null;
}

export const SettingsDialog = forwardRef<SettingsDialogHandle, SettingsDialogProps>(
  function SettingsDialog(
    {
      state,
      onToggleService,
      hideTmdbRating,
      onToggleHideTmdbRating,
      showAgeRating,
      onToggleShowAgeRating,
      displayName,
      onSaveDisplayName,
      nameError,
    },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [nameDraft, setNameDraft] = useState(displayName);

    useImperativeHandle(ref, () => ({
      open: () => {
        setNameDraft(displayName);
        dialogRef.current?.showModal();
      },
    }));

    const mine = myServices(state);

    return (
      <dialog ref={dialogRef}>
        <div className="modal">
          <h2>Your name</h2>
          <div className="field">
            <span className="step-label">Display name</span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = nameDraft.trim();
                if (trimmed && trimmed !== displayName) onSaveDisplayName(trimmed);
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                required
              />
              <button type="submit" className="btn-line">
                Save
              </button>
            </form>
            {nameError && <p className="hint">{nameError}</p>}
          </div>

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
              <button
                type="button"
                className="toggle"
                aria-pressed={showAgeRating}
                onClick={onToggleShowAgeRating}
              >
                Show age rating
              </button>
            </div>
            <p className="hint">
              Just this device — TMDB&rsquo;s own rating often reads very different from IMDb/RT, and age
              rating is off by default
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
