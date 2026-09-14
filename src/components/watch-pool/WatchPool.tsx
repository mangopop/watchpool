"use client";

import { useRef, useState } from "react";
import { addMovieAction, setReactionAction, updateMovieAction } from "@/lib/watch-pool/actions";
import {
  HOT_MAX_ITEMS,
  affinity,
  friendName,
  hotCandidates,
  passesFilter,
  retireState,
  runtimeLabel,
  serviceName,
} from "@/lib/watch-pool/logic";
import type { Friend, Movie, PoolState, Reaction, ReactionStatus, ReactionTier } from "@/lib/watch-pool/types";
import { AddDialog, type AddDialogHandle } from "./AddDialog";
import { MovieCard } from "./MovieCard";
import { SettingsDialog, type SettingsDialogHandle } from "./SettingsDialog";
import { TonightDialog, type TonightDialogHandle } from "./TonightDialog";
import "./watch-pool.css";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "want", label: "Want to watch" },
  { id: "watched", label: "Watched" },
  { id: "skip", label: "Passed" },
  { id: "mine", label: "My picks" },
  { id: "ignored", label: "Ignored" },
  { id: "panned", label: "Panned" },
];

export function WatchPool({
  viewerName,
  onSignOut,
  currentUserId,
  groupId,
  friends,
  initialMovies,
}: {
  viewerName: string;
  onSignOut: () => Promise<void>;
  currentUserId: string;
  groupId: string;
  friends: Friend[];
  initialMovies: Movie[];
}) {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [filter, setFilter] = useState("all");
  const [tonight, setTonight] = useState<PoolState["tonight"]>(null);
  const [timeLimit, setTimeLimit] = useState(120);
  const [myServices, setMyServices] = useState<string[]>([]);

  const addRef = useRef<AddDialogHandle>(null);
  const tonightRef = useRef<TonightDialogHandle>(null);
  const settingsRef = useRef<SettingsDialogHandle>(null);

  const state: PoolState = {
    currentFriend: currentUserId,
    friends,
    filter,
    tonight,
    timeLimit,
    services: { [currentUserId]: myServices },
    movies,
  };

  function reportError() {
    alert("Couldn't save that — check your connection and try again.");
  }

  function applyReaction(movieId: string, reaction: Reaction) {
    setMovies((s) =>
      s.map((m) => (m.id === movieId ? { ...m, reactions: { ...m.reactions, [currentUserId]: reaction } } : m)),
    );
  }

  async function persistReaction(movieId: string, cur: Reaction, next: Reaction) {
    applyReaction(movieId, next);
    try {
      await setReactionAction(movieId, {
        status: next.status,
        rating: next.rating,
        note: next.note,
        noteDismissed: next.noteDismissed ?? false,
      });
    } catch {
      applyReaction(movieId, cur);
      reportError();
    }
  }

  function setStatus(movieId: string, status: ReactionStatus) {
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;
    const cur = movie.reactions[currentUserId] ?? { status: null, rating: null, note: null };
    const next: Reaction =
      cur.status === status
        ? { status: null, rating: null, note: null }
        : {
            status,
            rating: status === "watched" ? cur.rating : null,
            note: status === "watched" ? cur.note : null,
          };
    persistReaction(movieId, cur, next);
  }

  function setRating(movieId: string, rating: ReactionTier) {
    const movie = movies.find((m) => m.id === movieId);
    const cur = movie?.reactions[currentUserId];
    if (!cur) return;
    const next: Reaction = { ...cur, rating: cur.rating === rating ? null : rating, noteDismissed: false };
    persistReaction(movieId, cur, next);
  }

  function setNote(movieId: string, note: string) {
    const movie = movies.find((m) => m.id === movieId);
    const cur = movie?.reactions[currentUserId];
    if (!cur) return;
    persistReaction(movieId, cur, { ...cur, note });
  }

  function dismissNote(movieId: string) {
    const movie = movies.find((m) => m.id === movieId);
    const cur = movie?.reactions[currentUserId];
    if (!cur) return;
    persistReaction(movieId, cur, { ...cur, noteDismissed: true });
  }

  async function submitPlea(movieId: string, plea: string) {
    const prev = movies.find((m) => m.id === movieId);
    setMovies((s) => s.map((m) => (m.id === movieId ? { ...m, plea, revived: true } : m)));
    try {
      await updateMovieAction(movieId, { plea, revived: true });
    } catch {
      if (prev) setMovies((s) => s.map((m) => (m.id === movieId ? prev : m)));
      reportError();
    }
  }

  async function bumpBack(movieId: string) {
    const prev = movies.find((m) => m.id === movieId);
    setMovies((s) =>
      s.map((m) => (m.id === movieId ? { ...m, revived: true, bumpedBy: currentUserId } : m)),
    );
    try {
      await updateMovieAction(movieId, { revived: true, bumped_by: currentUserId });
    } catch {
      if (prev) setMovies((s) => s.map((m) => (m.id === movieId ? prev : m)));
      reportError();
    }
  }

  async function addMovie(title: string, pitch: string) {
    try {
      const row = await addMovieAction(groupId, title, pitch);
      setMovies((s) => [
        {
          id: row.id,
          title: row.title,
          recommendedBy: row.recommended_by,
          runtime: 110,
          providers: ["prime"],
          pitch: row.pitch,
          dateAdded: row.date_added,
          reactions: {},
        },
        ...s,
      ]);
    } catch {
      reportError();
    }
  }

  function lockTonight(movieId: string, service: string) {
    setTonight({ id: movieId, service });
  }

  function clearTonight() {
    setTonight(null);
  }

  function toggleService(serviceId: string) {
    setMyServices((s) => (s.includes(serviceId) ? s.filter((id) => id !== serviceId) : [...s, serviceId]));
  }

  const tonightMovie = tonight ? movies.find((m) => m.id === tonight.id) : null;
  const hot = hotCandidates(state);
  const hero = hot[0];
  const minis = hot.slice(1, HOT_MAX_ITEMS);
  const overflow = hot.length - HOT_MAX_ITEMS;

  const tastePairs = friends
    .filter((f) => f.id !== currentUserId)
    .map((f) => {
      const a = affinity(state, currentUserId, f.id);
      return a ? { name: f.name, ...a } : null;
    })
    .filter((p): p is { name: string; pct: number; shared: number } => p !== null)
    .sort((a, b) => b.pct - a.pct);

  const visibleMovies = [...movies]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .filter((m) => passesFilter(state, m));

  let ignoredCount = 0;
  let pannedCount = 0;
  for (const m of movies) {
    const r = retireState(state, m);
    if (!r) continue;
    if (r.bucket === "ignored") ignoredCount++;
    else pannedCount++;
  }
  const shelfHead =
    filter === "ignored"
      ? `Ignored · ${visibleMovies.length} going unwatched`
      : filter === "panned"
        ? `Panned · ${visibleMovies.length} retired for good`
        : `The pool · ${visibleMovies.length} live${ignoredCount ? ` · ${ignoredCount} ignored` : ""}${
            pannedCount ? ` · ${pannedCount} panned` : ""
          }`;

  return (
    <div className="watch-pool">
      <div className="wrap">
        <div className="bar">
          <h1 className="mark">
            Watch<i>·</i>Pool
          </h1>
          <span className="spacer" />
          <span className="who">
            <span>Signed in as {viewerName}</span>
            <form action={onSignOut}>
              <button type="submit" className="icon-btn" title="Sign out" aria-label="Sign out">
                ⏻
              </button>
            </form>
          </span>
          <button
            className="icon-btn"
            title="Your streaming services"
            aria-label="Your streaming services"
            onClick={() => settingsRef.current?.open()}
          >
            ☰
          </button>
          <button className="btn-line" onClick={() => tonightRef.current?.open()}>
            Decide for me
          </button>
          <button className="btn-add" onClick={() => addRef.current?.open()}>
            + Recommend
          </button>
        </div>

        {tonightMovie && tonight && (
          <div className="tonight-strip">
            Watching tonight · <b>{tonightMovie.title}</b> · {runtimeLabel(tonightMovie.runtime)} · on{" "}
            {serviceName(tonight.service)}
            <button type="button" onClick={clearTonight}>
              Clear
            </button>
          </div>
        )}

        {hero && (
          <section className="hot">
            <div>
              <div className="eyebrow">
                {hero.missing <= 1 && hero.tally.watched >= hero.tally.total - 1
                  ? "One seat left"
                  : "Landing well"}
              </div>
              <h2>{hero.movie.title}</h2>
              <div className="blindspot">
                {hero.missing <= 1 && hero.tally.watched >= hero.tally.total - 1 ? (
                  <>
                    Your blind spot — <b>everyone but you</b> has already settled this one
                  </>
                ) : (
                  <>
                    <b>
                      {hero.tally.watched} of {hero.tally.total}
                    </b>{" "}
                    have seen it and it landed
                  </>
                )}
              </div>
              <q>{hero.movie.pitch}</q>
              <cite className="said">
                —{" "}
                {hero.movie.recommendedBy === currentUserId ? (
                  <b className="yours">You</b>
                ) : (
                  <b>{friendName(friends, hero.movie.recommendedBy)}</b>
                )}
              </cite>
            </div>
            <div>
              <div className="verdict">
                <span className="figure">
                  <b>
                    {hero.tally.watched}/{hero.tally.total}
                  </b>
                  <span>watched</span>
                </span>
                <span className="figure gold">
                  <b>{hero.tally.loved > 0 ? hero.tally.lovedPct : hero.tally.likedPct}%</b>
                  <span>{hero.tally.loved > 0 ? "loved it" : "liked it"}</span>
                </span>
              </div>
              <div className="cta">
                <button type="button" onClick={() => setStatus(hero.movie.id, "watched")}>
                  Mark watched
                </button>
                <button type="button" className="solid" onClick={() => setStatus(hero.movie.id, "want")}>
                  Want to watch
                </button>
              </div>
            </div>
          </section>
        )}

        {minis.length > 0 && (
          <div className="hot-extra">
            {minis.map((c) => (
              <div className="hot-mini" key={c.movie.id}>
                <h3>{c.movie.title}</h3>
                <div className="line">
                  <b>
                    {c.tally.watched}/{c.tally.total}
                  </b>{" "}
                  watched · {c.tally.loved > 0 ? `${c.tally.lovedPct}% loved it` : `${c.tally.likedPct}% liked it`}
                </div>
              </div>
            ))}
            {overflow > 0 && <span className="hot-more">+{overflow} more in the pool</span>}
          </div>
        )}

        {tastePairs.length > 0 && (
          <div className="taste">
            <span>Taste overlap</span>
            {tastePairs.map((p) => (
              <span
                className={`pair${p.pct >= 75 ? " high" : p.pct <= 40 ? " low" : ""}`}
                key={p.name}
              >
                You &amp; {p.name} <b>{p.pct}%</b> · {p.shared} shared
              </span>
            ))}
          </div>
        )}

        <div className="shelf-head">
          <span>{shelfHead}</span>
          <span className="ruled" />
        </div>

        <div className="filters" role="group" aria-label="Filter pool">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="chip"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid">
          {visibleMovies.length === 0 ? (
            <div className="empty">Nothing here — try another filter, or recommend something</div>
          ) : (
            visibleMovies.map((m) => (
              <MovieCard
                key={m.id}
                state={state}
                movie={m}
                onSetStatus={setStatus}
                onSetRating={setRating}
                onSetNote={setNote}
                onDismissNote={dismissNote}
                onPlea={submitPlea}
                onBump={bumpBack}
              />
            ))
          )}
        </div>
      </div>

      <AddDialog ref={addRef} onAdd={addMovie} />
      <TonightDialog ref={tonightRef} state={state} onSetTimeLimit={setTimeLimit} onLock={lockTonight} />
      <SettingsDialog ref={settingsRef} state={state} onToggleService={toggleService} />
    </div>
  );
}
