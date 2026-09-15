"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TmdbMediaType } from "@/lib/tmdb-shared";
import {
  addMovieAction,
  backfillTrailersAction,
  deleteMovieAction,
  setMyServiceAction,
  setReactionAction,
  updateDisplayNameAction,
  updateMovieAction,
} from "@/lib/watch-pool/actions";
import {
  HOT_MAX_ITEMS,
  affinity,
  friendName,
  hotCandidates,
  ignoredSpotlight,
  mustSee,
  myPickAverageRating,
  myReaction,
  passesFilter,
  retireState,
  runtimeLabel,
  serviceName,
  tallyVerdict,
} from "@/lib/watch-pool/logic";
import type { Friend, Movie, PoolState, Reaction, ReactionStatus, ReactionTier } from "@/lib/watch-pool/types";
import { AddDialog, type AddDialogHandle } from "./AddDialog";
import { HeroBlurb } from "./HeroBlurb";
import { MovieCard } from "./MovieCard";
import { ReactionStatusButtons } from "./ReactionStatusButtons";
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
  groups,
  onSwitchGroup,
  friends,
  initialMovies,
  initialServices,
}: {
  viewerName: string;
  onSignOut: () => Promise<void>;
  currentUserId: string;
  groupId: string;
  groups: { id: string; name: string }[];
  onSwitchGroup: (formData: FormData) => Promise<void>;
  friends: Friend[];
  initialMovies: Movie[];
  initialServices: string[];
}) {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [filter, setFilter] = useState("all");
  const [tonight, setTonight] = useState<PoolState["tonight"]>(null);
  const [timeLimit, setTimeLimit] = useState(999);
  const [myServices, setMyServices] = useState<string[]>(initialServices);
  const [displayName, setDisplayName] = useState(viewerName);
  const [nameError, setNameError] = useState<string | null>(null);

  async function saveDisplayName(name: string) {
    const previous = displayName;
    setDisplayName(name);
    setNameError(null);
    try {
      await updateDisplayNameAction(name);
    } catch (err) {
      setDisplayName(previous);
      setNameError(err instanceof Error ? err.message : "Couldn't save your name");
    }
  }

  // Per-device display preference, not group state — shown by default, but
  // not worth a synced column since it's just a display toggle.
  const [hideTmdbRating, setHideTmdbRating] = useState(false);
  useEffect(() => {
    // localStorage doesn't exist during SSR — this is a one-time read of the
    // stored device preference after mount, not state synced from React.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHideTmdbRating(localStorage.getItem("watch-pool:hide-tmdb-rating") === "1");
  }, []);
  function toggleHideTmdbRating() {
    setHideTmdbRating((prev) => {
      const next = !prev;
      localStorage.setItem("watch-pool:hide-tmdb-rating", next ? "1" : "0");
      return next;
    });
  }

  // Same per-device pattern as hideTmdbRating, but opt-in — off by default.
  const [showAgeRating, setShowAgeRating] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowAgeRating(localStorage.getItem("watch-pool:show-age-rating") === "1");
  }, []);
  function toggleShowAgeRating() {
    setShowAgeRating((prev) => {
      const next = !prev;
      localStorage.setItem("watch-pool:show-age-rating", next ? "1" : "0");
      return next;
    });
  }

  // Movies added before trailer/genre/age-rating fetching existed are
  // missing those fields — catch them up in the background, a few at a
  // time, per load. Self-limiting: once every movie has them all, the
  // action finds nothing stale and this becomes a no-op query, so it's
  // safe to leave running rather than pulling it out once the backlog
  // clears.
  useEffect(() => {
    backfillTrailersAction(groupId)
      .then((results) => {
        if (results.length === 0) return;
        setMovies((s) =>
          s.map((m) => {
            const hit = results.find((r) => r.id === m.id);
            if (!hit) return m;
            return {
              ...m,
              trailerKey: hit.trailerKey,
              genres: hit.genres ?? m.genres,
              ageRating: hit.ageRating,
            };
          }),
        );
      })
      .catch(() => {});
  }, [groupId]);

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
    setMovies((s) =>
      s.map((m) => (m.id === movieId ? { ...m, plea, pleaBy: currentUserId, revived: true } : m)),
    );
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
      await updateMovieAction(movieId, { revived: true, bumped: true });
    } catch {
      if (prev) setMovies((s) => s.map((m) => (m.id === movieId ? prev : m)));
      reportError();
    }
  }

  async function addMovie(
    title: string,
    pitch: string,
    tmdbId: number | null,
    mediaType: TmdbMediaType,
    rating: ReactionTier,
  ) {
    try {
      const row = await addMovieAction(groupId, title, pitch, tmdbId, mediaType);
      // Recommending a title means you've already seen it, so mark it watched for the recommender.
      const ownReaction: Reaction = { status: "watched", rating, note: null };
      setMovies((s) => [
        {
          id: row.id,
          title: row.title,
          mediaType: row.media_type,
          recommendedBy: row.recommended_by,
          runtime: row.runtime_minutes ?? null,
          providers: row.providers,
          pitch: row.pitch,
          dateAdded: row.date_added,
          reactions: { [currentUserId]: ownReaction },
          tmdbId: row.tmdb_id ?? null,
          posterPath: row.poster_path ?? null,
          releaseYear: row.release_year ?? null,
          tmdbRating: row.tmdb_rating ?? null,
          genres: row.genres ?? [],
          trailerKey: row.trailer_key ?? null,
          ageRating: row.age_rating ?? null,
        },
        ...s,
      ]);
      try {
        await setReactionAction(row.id, {
          status: ownReaction.status,
          rating: ownReaction.rating,
          note: ownReaction.note,
          noteDismissed: false,
        });
      } catch {
        applyReaction(row.id, { status: null, rating: null, note: null });
        reportError();
      }
    } catch {
      reportError();
    }
  }

  async function editPitch(movieId: string, pitch: string) {
    const prev = movies.find((m) => m.id === movieId);
    setMovies((s) => s.map((m) => (m.id === movieId ? { ...m, pitch } : m)));
    try {
      await updateMovieAction(movieId, { pitch });
    } catch {
      if (prev) setMovies((s) => s.map((m) => (m.id === movieId ? prev : m)));
      reportError();
    }
  }

  async function deleteMovie(movieId: string) {
    const prev = movies;
    setMovies((s) => s.filter((m) => m.id !== movieId));
    try {
      await deleteMovieAction(movieId);
    } catch {
      setMovies(prev);
      reportError();
    }
  }

  function lockTonight(movieId: string, service: string) {
    setTonight({ id: movieId, service });
  }

  function clearTonight() {
    setTonight(null);
  }

  async function toggleService(serviceId: string) {
    const wasEnabled = myServices.includes(serviceId);
    setMyServices((s) => (wasEnabled ? s.filter((id) => id !== serviceId) : [...s, serviceId]));
    try {
      await setMyServiceAction(serviceId, !wasEnabled);
    } catch {
      setMyServices((s) => (wasEnabled ? [...s, serviceId] : s.filter((id) => id !== serviceId)));
      reportError();
    }
  }

  const tonightMovie = tonight ? movies.find((m) => m.id === tonight.id) : null;
  const hot = hotCandidates(state);
  const hero = hot[0];
  const minis = hot.slice(1, HOT_MAX_ITEMS);
  const overflow = hot.length - HOT_MAX_ITEMS;
  const spotlight = ignoredSpotlight(state);
  const topPick = mustSee(state);

  const myPickAvg = myPickAverageRating(state);

  const tastePairs = friends
    .filter((f) => f.id !== currentUserId)
    .map((f) => {
      const a = affinity(state, currentUserId, f.id);
      return a ? { name: f.name, ...a } : null;
    })
    .filter((p): p is { name: string; pct: number; shared: number; topGenre: string | null } => p !== null)
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
  // "All" now includes ignored/panned titles too, so its count needs the
  // retired ones subtracted back out; every other filter already excludes
  // them at the source (passesFilter).
  const liveCount = filter === "all" ? visibleMovies.length - ignoredCount - pannedCount : visibleMovies.length;
  const shelfHead =
    filter === "ignored"
      ? `Ignored · ${visibleMovies.length} going unwatched`
      : filter === "panned"
        ? `Panned · ${visibleMovies.length} retired for good`
        : `The pool · ${liveCount} live${ignoredCount ? ` · ${ignoredCount} ignored` : ""}${
            pannedCount ? ` · ${pannedCount} panned` : ""
          }`;

  return (
    <div className="watch-pool">
      <div className="wrap">
        <div className="bar">
          <h1 className="mark">A Few Good Films</h1>
          {groups.length > 1 && (
            <form action={onSwitchGroup}>
              <select
                name="groupId"
                defaultValue={groupId}
                aria-label="Switch group"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </form>
          )}
          <span className="spacer" />
          <span className="who">
            <span>Signed in as {displayName}</span>
            <form action={onSignOut}>
              <button type="submit" className="icon-btn" title="Sign out" aria-label="Sign out">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path
                    d="M12 3v8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.5 6.5a8 8 0 1 0 11 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </form>
          </span>
          <Link href="/groups" className="icon-btn" title="Manage group & invites" aria-label="Manage group & invites">
            👥
          </Link>
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
            Watching tonight · <b>{tonightMovie.title}</b>
            {tonightMovie.runtime !== null && <> · {runtimeLabel(tonightMovie.runtime)}</>} · on{" "}
            {serviceName(tonight.service)}
            <button type="button" onClick={clearTonight}>
              Clear
            </button>
          </div>
        )}

        {hero && (
          <section className="hot">
            <HeroBlurb
              eyebrow={
                hero.missing <= 1 && hero.tally.watched >= hero.tally.total - 1 ? "One seat left" : "Landing well"
              }
              title={hero.movie.title}
              detail={
                hero.missing <= 1 && hero.tally.watched >= hero.tally.total - 1 ? (
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
                )
              }
              pitch={hero.movie.pitch}
              recommendedBy={hero.movie.recommendedBy}
              currentUserId={currentUserId}
              friends={friends}
            />
            <div>
              <div className="verdict">
                <span className="figure">
                  <b>
                    {hero.tally.watched}/{hero.tally.total}
                  </b>
                  <span>watched</span>
                </span>
                <span className="figure gold">
                  <b>{tallyVerdict(hero.tally).pct}%</b>
                  <span>{tallyVerdict(hero.tally).label}</span>
                </span>
              </div>
              <div className="cta">
                <button type="button" onClick={() => setStatus(hero.movie.id, "watched")}>
                  Mark watched
                </button>
                <button type="button" onClick={() => setStatus(hero.movie.id, "want")}>
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

        {topPick && (
          <section className="must-see">
            <HeroBlurb
              eyebrow="Highest rated · you haven’t seen it"
              title={topPick.movie.title}
              detail={
                <>
                  <b>★ {topPick.tmdbRating.toFixed(1)}</b> on TMDB
                  {topPick.tally.watched > 0 && (
                    <>
                      {" "}
                      — {topPick.tally.watched} of {topPick.tally.total} in the group have watched it
                    </>
                  )}
                </>
              }
              pitch={topPick.movie.pitch}
              recommendedBy={topPick.movie.recommendedBy}
              currentUserId={currentUserId}
              friends={friends}
            />
            <ReactionStatusButtons
              title={topPick.movie.title}
              status={myReaction(topPick.movie, currentUserId).status}
              onSetStatus={(s) => setStatus(topPick.movie.id, s)}
            />
          </section>
        )}

        {spotlight && (
          <section className="ignored-spotlight">
            <div>
              <div className="eyebrow">Lost in the sea</div>
              <h3>{spotlight.movie.title}</h3>
              <div className="why">
                {friendName(friends, spotlight.movie.recommendedBy)}&rsquo;s pick — {spotlight.why}
              </div>
            </div>
            <ReactionStatusButtons
              title={spotlight.movie.title}
              status={myReaction(spotlight.movie, currentUserId).status}
              onSetStatus={(s) => setStatus(spotlight.movie.id, s)}
            />
          </section>
        )}

        {tastePairs.length > 0 && (
          <div className="taste">
            <span className="taste-label">
              Taste overlap{" "}
              <span className="taste-info">
                ⓘ
                <span className="taste-info-bubble">
                  How closely your ratings match on movies you&rsquo;ve both watched.
                </span>
              </span>
            </span>
            {tastePairs.map((p) => (
              <span
                className={`pair${p.pct >= 75 ? " high" : p.pct <= 40 ? " low" : ""}`}
                key={p.name}
              >
                You &amp; {p.name} <b>{p.pct}%</b> · {p.shared} shared
                {p.topGenre && <> · mostly {p.topGenre}</>}
              </span>
            ))}
          </div>
        )}

        <div className="shelf-head">
          <span>{shelfHead}</span>
          <span className="ruled" />
          {myPickAvg !== null && (
            <span className="pick-stat">
              Your picks average <b>{myPickAvg.toFixed(1)}</b> on TMDB
            </span>
          )}
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
                hideTmdbRating={hideTmdbRating}
                showAgeRating={showAgeRating}
                onSetStatus={setStatus}
                onSetRating={setRating}
                onSetNote={setNote}
                onDismissNote={dismissNote}
                onPlea={submitPlea}
                onBump={bumpBack}
                onDelete={deleteMovie}
                onEditPitch={editPitch}
              />
            ))
          )}
        </div>
      </div>

      <AddDialog ref={addRef} onAdd={addMovie} />
      <TonightDialog ref={tonightRef} state={state} onSetTimeLimit={setTimeLimit} onLock={lockTonight} />
      <SettingsDialog
        ref={settingsRef}
        state={state}
        onToggleService={toggleService}
        hideTmdbRating={hideTmdbRating}
        onToggleHideTmdbRating={toggleHideTmdbRating}
        showAgeRating={showAgeRating}
        onToggleShowAgeRating={toggleShowAgeRating}
        displayName={displayName}
        onSaveDisplayName={saveDisplayName}
        nameError={nameError}
      />
    </div>
  );
}
