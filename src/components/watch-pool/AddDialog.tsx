"use client";

import { useRef } from "react";
import { useImperativeHandle, forwardRef, useState } from "react";

export interface AddDialogHandle {
  open: () => void;
}

interface AddDialogProps {
  onAdd: (title: string, pitch: string) => void;
}

export const AddDialog = forwardRef<AddDialogHandle, AddDialogProps>(function AddDialog(
  { onAdd },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");

  useImperativeHandle(ref, () => ({
    open: () => {
      setTitle("");
      setPitch("");
      dialogRef.current?.showModal();
      titleRef.current?.focus();
    },
  }));

  return (
    <dialog ref={dialogRef}>
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          const p = pitch.trim();
          if (!t || !p) return;
          onAdd(t, p);
          dialogRef.current?.close();
        }}
      >
        <h2>New recommendation</h2>
        <div className="field">
          <label htmlFor="titleInput">Title</label>
          <input
            id="titleInput"
            ref={titleRef}
            required
            maxLength={80}
            placeholder="e.g. Paddington 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pitchInput">Why should the group watch it?</label>
          <textarea
            id="pitchInput"
            required
            maxLength={220}
            placeholder="One or two sentences on why you're recommending it."
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
          />
          <span className="hint">Required — a pick without a pitch isn&rsquo;t a recommendation</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn-solid">
            Add to pool
          </button>
        </div>
      </form>
    </dialog>
  );
});
