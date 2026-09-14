"use client";

import { useRef, useState } from "react";
import { REACTIONS, TIER_ICON } from "@/lib/watch-pool/constants";
import { TMDB_POSTER_BASE } from "@/lib/tmdb-shared";
import {
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
  onSetStatus: (movieId: string, status: ReactionStatus) => void;
  onSetRating: (movieId: string, rating: ReactionTier) => void;
  onSetNote: (movieId: string, note: string) => void;
  onDismissNote: (movieId: string) => void;
  onPlea: (movieId: string, plea: string) => void;
  onBump: (movieId: string) => void;
  onDelete: (movieId: string) => void;
}

export function MovieCard({
  state,
  movie,
  hideTmdbRating,
  onSetStatus,
  onSetRating,
  onSetNote,
  onDismissNote,
  onPlea,
  onBump,
  onDelete,
}: MovieCardProps) {
  const [pleaText, setPleaText] = useState("");
  const [trailerHover, setTrailerHover] = useState(false);
  const trailerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerFrame = useRef<HTMLIFrameElement>(null);

  function startTrailerHover() {
    if (!movie.trailerKey) return;
    trailerTimer.current = setTimeout(() => setTrailerHover(true), 350);
  }
  function stopTrailerHover() {
    if (trailerTimer.current) clearTimeout(trailerTimer.current);
    setTrailerHover(false);
  }
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
    <article className={`card${ret ? " ghosted" : ""}`}>
      <div className="card-top">
        <span className="poster-wrap" onMouseEnter={startTrailerHover} onMouseLeave={stopTrailerHover}>
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
            </span>
          )}
        </span>
        <div>
          <h3>
            {movie.title}
            {movie.releaseYear && <span className="year"> ({movie.releaseYear})</span>}
            {movie.mediaType === "tv" && <span className="media-tag"> Series</span>}
            {!hideTmdbRating && movie.tmdbRating !== null && (
              <span className="rating" title="TMDB rating">
                {" "}
                ★ {movie.tmdbRating.toFixed(1)}
              </span>
            )}
            {movie.runtime !== null && <span className="runtime"> · {runtimeLabel(movie.runtime)}</span>}
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

      <p className="pitch">{movie.pitch}</p>

      {movie.plea && (
        <p className="defence">
          <span>{friendName(state.friends, movie.recommendedBy)} pleads the case</span>
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
          <div className="seg" role="group" aria-label={`Your status for ${movie.title}`}>
            {(["want", "watched", "skip"] as ReactionStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                data-state={s}
                aria-pressed={mine.status === s}
                onClick={() => onSetStatus(movie.id, s)}
              >
                {s === "want" ? "Want" : s === "watched" ? "Watched" : "Pass"}
              </button>
            ))}
          </div>

          {mine.status === "watched" && (
            <div className="react-row">
              <span>Your take</span>
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="react-btn"
                  aria-pressed={mine.rating === r.id}
                  title={r.label}
                  aria-label={r.label}
                  onClick={() => onSetRating(movie.id, r.id)}
                >
                  {r.icon}
                </button>
              ))}
            </div>
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
