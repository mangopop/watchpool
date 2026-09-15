"use client";

import { useEffect, useRef, useState } from "react";
import { TIER_ICON } from "@/lib/watch-pool/constants";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-shared";
import { ReactionStatusButtons } from "./ReactionStatusButtons";
import { ReactionTierButtons } from "./ReactionTierButtons";
import {
  ageRatingClass,
  daysAgoLabel,
  friendName,
  initials,
  myReaction,
  notePrompt,
  posterGradient,
  retireState,
  runtimeLabel,
  serviceName,
  tallyFor,
} from "@/lib/watch-pool/logic";
import type { Movie, PoolState, ReactionStatus, ReactionTier } from "@/lib/watch-pool/types";

interface MovieCardProps {
  state: PoolState;
  movie: Movie;
  hideTmdbRating: boolean;
  showAgeRating: boolean;
  onSetStatus: (movieId: string, status: ReactionStatus) => void;
  onSetRating: (movieId: string, rating: ReactionTier) => void;
  onSetNote: (movieId: string, note: string) => void;
  onDismissNote: (movieId: string) => void;
  onPlea: (movieId: string, plea: string) => void;
  onBump: (movieId: string) => void;
  onDelete: (movieId: string) => void;
  onEditPitch: (movieId: string, pitch: string) => void;
}

export function MovieCard({
  state,
  movie,
  hideTmdbRating,
  showAgeRating,
  onSetStatus,
  onSetRating,
  onSetNote,
  onDismissNote,
  onPlea,
  onBump,
  onDelete,
  onEditPitch,
}: MovieCardProps) {
  const [pleaText, setPleaText] = useState("");
  const [editingPitch, setEditingPitch] = useState(false);
  const [pitchDraft, setPitchDraft] = useState(movie.pitch);
  const [trailerHover, setTrailerHover] = useState(false);
  const trailerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerFrame = useRef<HTMLIFrameElement>(null);
  const posterWrapRef = useRef<HTMLSpanElement>(null);

  function startTrailerHover() {
    if (!movie.trailerKey) return;
    trailerTimer.current = setTimeout(() => setTrailerHover(true), 350);
  }
  function stopTrailerHover() {
    if (trailerTimer.current) clearTimeout(trailerTimer.current);
    setTrailerHover(false);
  }

  // Small/narrow windows leave little room to move the mouse off the
  // popover without it landing back on the poster or a neighboring card,
  // and touch devices have no hover-off at all — so once the preview is
  // open, any tap/click outside it (or Escape) closes it directly instead
  // of relying on mouseleave.
  useEffect(() => {
    if (!trailerHover) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (posterWrapRef.current?.contains(e.target as Node)) return;
      stopTrailerHover();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") stopTrailerHover();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [trailerHover]);
  function unmuteTrailer() {
    // Browsers only allow autoplay when it starts muted (mute=1 in the
    // embed URL) — unmuting it a beat later via the player API is the
    // standard workaround, and works here without a click because the
    // video is already playing by the time this fires.
    trailerFrame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "unMute", args: [] }),
      "*",
    );
  }

  const t = tallyFor(state, movie);
  const mine = myReaction(movie, state.currentFriend);
  const ret = retireState(state, movie);
  const divisive = t.loved + t.liked > 0 && t.miss > 0;

  const split: { cls: string; tier: ReactionTier }[] = (
    ["loved", "liked", "meh", "miss"] as ReactionTier[]
  )
    .filter((tier) => t.names[tier].length > 0)
    .map((tier) => ({
      cls: tier === "loved" ? "adored" : tier === "liked" ? "loved" : tier === "meh" ? "mixed" : "panned",
      tier,
    }));

  const prompt = notePrompt(state, movie, t, mine);

  const byline =
    movie.recommendedBy === state.currentFriend ? (
      <>
        <span className="yours">Your pick</span> · {daysAgoLabel(movie.dateAdded)}
      </>
    ) : (
      <>
        <b>{friendName(state.friends, movie.recommendedBy)}</b>&rsquo;s pick · {daysAgoLabel(movie.dateAdded)}
      </>
    );

  let revive: React.ReactNode = null;
  if (ret && ret.bucket === "ignored") {
    revive =
      movie.recommendedBy === state.currentFriend ? (
        <div className="defend-row">
          <input
            type="text"
            maxLength={140}
            placeholder="Make your plea and bump it back…"
            value={pleaText}
            onChange={(e) => setPleaText(e.target.value)}
          />
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              if (!pleaText.trim()) return;
              onPlea(movie.id, pleaText.trim());
              setPleaText("");
            }}
          >
            Bump
          </button>
        </div>
      ) : (
        <button type="button" className="mini-btn" onClick={() => onBump(movie.id)}>
          Bump it back
        </button>
      );
  } else if (ret) {
    revive = <div className="ruled-out">Retired for good — the group has spoken</div>;
  }

  return (
    <article className={`card${ret ? " ghosted" : ""}${trailerHover ? " trailer-open" : ""}`}>
      <div className="card-top">
        <span
          ref={posterWrapRef}
          className="poster-wrap"
          onMouseEnter={startTrailerHover}
          onMouseLeave={stopTrailerHover}
          onClick={() => {
            if (!movie.trailerKey || trailerHover) return;
            setTrailerHover(true);
          }}
        >
          <span className="poster" style={{ background: posterGradient(movie.title) }}>
            {movie.posterPath ? (
              <img src={`${TMDB_POSTER_BASE}${movie.posterPath}`} alt="" />
            ) : (
              <>
                <i />
                <b>{initials(movie.title)}</b>
              </>
            )}
            {movie.trailerKey && (
              <span className="play-badge" aria-hidden="true">
                ▶
              </span>
            )}
          </span>
          {trailerHover && movie.trailerKey && (
            <span className="trailer-popover">
              <iframe
                ref={trailerFrame}
                src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                title={`${movie.title} trailer`}
                allow="autoplay; encrypted-media"
                frameBorder={0}
                onLoad={() => setTimeout(unmuteTrailer, 400)}
              />
              <button
                type="button"
                className="trailer-close"
                aria-label="Close trailer preview"
                onClick={(e) => {
                  e.stopPropagation();
                  stopTrailerHover();
                }}
              >
                ×
              </button>
            </span>
          )}
        </span>
        <div>
          <h3>
            {movie.tmdbId ? (
              <a
                className="title-link"
                href={`https://www.themoviedb.org/${movie.mediaType}/${movie.tmdbId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {movie.title}
              </a>
            ) : (
              movie.title
            )}
            {movie.releaseYear && <span className="year"> ({movie.releaseYear})</span>}
            {movie.mediaType === "tv" && <span className="media-tag"> Series</span>}
            {!hideTmdbRating && movie.tmdbRating !== null && (
              <span className="rating" title="TMDB rating">
                {" "}
                ★ {movie.tmdbRating.toFixed(1)}
              </span>
            )}
            {showAgeRating && movie.ageRating && (
              <span
                className={`age-rating age-rating-${ageRatingClass(movie.ageRating)}`}
                title="Age rating"
              >
                {movie.ageRating}
              </span>
            )}
            {movie.runtime !== null && <span className="runtime">{runtimeLabel(movie.runtime)}</span>}
          </h3>
          {movie.genres.length > 0 && <div className="genres">{movie.genres.join(" · ")}</div>}
          <div className="by">{byline}</div>
        </div>

        {(divisive || ret || movie.providers.length > 0 || movie.tmdbId) && (
          <div className="flags">
            {divisive && <span className="flag divisive">Most divisive</span>}
            {ret && (
              <span className="flag archived">
                {ret.bucket === "panned" ? "Panned" : "Ignored"} · {ret.why}
              </span>
            )}
            {movie.providers.length > 0 ? (
              <span className={`flag where service-${movie.providers[0]}`}>
                {serviceName(movie.providers[0])}
              </span>
            ) : (
              movie.tmdbId && (
                // A real TMDB match with no providers — genuinely not on any
                // tracked service right now, not a missing-data gap.
                <span className="flag where">N/A</span>
              )
            )}
          </div>
        )}
      </div>

      {editingPitch ? (
        <div className="pitch-edit">
          <textarea
            autoFocus
            maxLength={220}
            placeholder="One or two sentences on why you're recommending it."
            value={pitchDraft}
            onChange={(e) => setPitchDraft(e.target.value)}
          />
          <div className="pitch-edit-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setPitchDraft(movie.pitch);
                setEditingPitch(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-solid"
              onClick={() => {
                onEditPitch(movie.id, pitchDraft.trim());
                setEditingPitch(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        (movie.pitch || movie.recommendedBy === state.currentFriend) && (
          <p className="pitch">
            {movie.pitch}
            {movie.recommendedBy === state.currentFriend && (
              <button
                type="button"
                className="pitch-edit-btn"
                aria-label="Edit comment"
                onClick={() => {
                  setPitchDraft(movie.pitch);
                  setEditingPitch(true);
                }}
              >
                Edit
              </button>
            )}
          </p>
        )
      )}

      {movie.plea && (
        <p className="defence">
          <span>{friendName(state.friends, movie.pleaBy ?? movie.recommendedBy)} pleads the case</span>
          {movie.plea}
        </p>
      )}
      {movie.bumpedBy && (
        <div className="ruled-out">Bumped back by {friendName(state.friends, movie.bumpedBy)}</div>
      )}

      <div className="tally">
        <span>
          <b>{t.watched}</b>/{t.total} watched
        </span>
        <span>
          <b>{t.want}</b> queued
        </span>
        {split.length > 0 && (
          <span className="split">
            {split.map(({ cls, tier }) => (
              <span className={cls} key={tier}>
                {TIER_ICON[tier]} {t.names[tier].join(", ")}
              </span>
            ))}
          </span>
        )}
        {movie.recommendedBy === state.currentFriend && (
          <button
            type="button"
            className="delete-btn"
            title="Remove this suggestion"
            aria-label="Remove this suggestion"
            onClick={() => {
              if (confirm(`Remove "${movie.title}" from the pool? This can't be undone.`)) {
                onDelete(movie.id);
              }
            }}
          >
            Remove
          </button>
        )}
      </div>

      {t.notes.length > 0 && (
        <div className="notes">
          {t.notes.slice(0, 2).map((n, i) => (
            <div key={i}>
              <b>{n.who}</b> &ldquo;{n.note}&rdquo;
            </div>
          ))}
        </div>
      )}

      {ret ? (
        revive
      ) : (
        <>
          <ReactionStatusButtons
            title={movie.title}
            status={mine.status}
            onSetStatus={(s) => onSetStatus(movie.id, s)}
          />

          {mine.status === "watched" && (
            <ReactionTierButtons
              ariaLabel="Your rating"
              label="Your take"
              rating={mine.rating}
              onSetRating={(r) => onSetRating(movie.id, r)}
            />
          )}

          {prompt && (
            <div className="ask">
              <span className="q">{prompt.question}</span>
              <div className="row">
                {prompt.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="note-chip"
                    onClick={() => onSetNote(movie.id, chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <button type="button" className="skip-ask" onClick={() => onDismissNote(movie.id)}>
                No comment
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
