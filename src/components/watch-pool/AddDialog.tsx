"use client";

import { useRef } from "react";
import { useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-shared";
import type { TmdbMediaType, TmdbSearchResult } from "@/lib/tmdb-shared";
import type { ReactionTier } from "@/lib/watch-pool/types";
import { ReactionTierButtons } from "./ReactionTierButtons";

export interface AddDialogHandle {
  open: () => void;
}

interface AddDialogProps {
  onAdd: (
    title: string,
    pitch: string,
    tmdbId: number | null,
    mediaType: TmdbMediaType,
    rating: ReactionTier,
  ) => void;
}

export const AddDialog = forwardRef<AddDialogHandle, AddDialogProps>(function AddDialog(
  { onAdd },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [rating, setRating] = useState<ReactionTier | null>(null);
  const [ratingTouched, setRatingTouched] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setTitle("");
      setPitch("");
      setResults([]);
      setSelected(null);
      setSearchFailed(false);
      setRating(null);
      setRatingTouched(false);
      dialogRef.current?.showModal();
      titleRef.current?.focus();
    },
  }));

  useEffect(() => {
    const query = title.trim();
    // Once a result's been picked, further typing without re-picking means
    // the user's editing away from it — fall back to a manual title.
    if (selected && selected.title === title) return;
    if (selected) setSelected(null);
    if (query.length < 2) {
      setResults([]);
      setSearchFailed(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setResults(data.results ?? []);
        setSearchFailed(false);
      } catch {
        setResults([]);
        setSearchFailed(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  function pick(result: TmdbSearchResult) {
    setSelected(result);
    setTitle(result.title);
    setResults([]);
    setSearchFailed(false);
  }

  return (
    <dialog ref={dialogRef}>
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          const p = pitch.trim();
          if (!t) return;
          if (!rating) {
            setRatingTouched(true);
            return;
          }
          const match = selected?.title === t ? selected : null;
          onAdd(t, p, match?.tmdbId ?? null, match?.mediaType ?? "movie", rating);
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
            autoComplete="off"
            placeholder="e.g. Paddington 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {searching && <span className="hint">Searching…</span>}
          {results.length > 0 && (
            <ul className="search-results">
              {results.map((r) => (
                <li key={r.tmdbId}>
                  <button type="button" onClick={() => pick(r)}>
                    {r.posterPath ? (
                      <img src={`${TMDB_POSTER_BASE}${r.posterPath}`} alt="" />
                    ) : (
                      <span className="no-poster" />
                    )}
                    <span>
                      {r.title}
                      {r.releaseYear ? ` (${r.releaseYear})` : ""}
                      {r.mediaType === "tv" && <i className="media-tag"> Series</i>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!selected && title.trim().length >= 2 && results.length === 0 && !searching && (
            <span className="hint">
              {searchFailed
                ? "TMDB search unavailable right now — will be added with a placeholder poster"
                : "No TMDB match — will be added with a placeholder poster"}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="pitchInput">Why should the group watch it? (optional)</label>
          <textarea
            id="pitchInput"
            maxLength={220}
            placeholder="One or two sentences on why you're recommending it."
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Your take (recommending it means you&apos;ve seen it)</label>
          <ReactionTierButtons
            ariaLabel="Your rating"
            rating={rating}
            onSetRating={(r) => {
              setRating(r);
              setRatingTouched(false);
            }}
          />
          {ratingTouched && !rating && <span className="hint">Pick one before adding it</span>}
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
