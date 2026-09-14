"use client";

import { useEffect, useRef, useState } from "react";
import { FRIENDS, STORAGE_KEY } from "@/lib/watch-pool/constants";
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
import { createInitialState } from "@/lib/watch-pool/mock-data";
import type { FriendId, PoolState, ReactionStatus, ReactionTier } from "@/lib/watch-pool/types";
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
}: {
  viewerName?: string;
  onSignOut?: () => Promise<void>;
}) {
  const [state, setState] = useState<PoolState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);

  const addRef = useRef<AddDialogHandle>(null);
  const tonightRef = useRef<TonightDialogHandle>(null);
  const settingsRef = useRef<SettingsDialogHandle>(null);

  useEffect(() => {
    // One-time hydration from localStorage: must run post-mount so the
    // server-rendered mock data matches the client's first render.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setState(JSON.parse(saved) as PoolState);
    } catch {
      // ignore corrupt storage — fall back to mock data
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — state stays in memory only
    }
  }, [state, loaded]);

  function setCurrentFriend(id: FriendId) {
    setState((s) => ({ ...s, currentFriend: id }));
  }

  function setFilter(filter: string) {
    setState((s) => ({ ...s, filter }));
  }

  function setStatus(movieId: string, status: ReactionStatus) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) => {
        if (m.id !== movieId) return m;
        const cur = m.reactions[s.currentFriend] ?? { status: null, rating: null, note: null };
        const next =
          cur.status === status
            ? { status: null, rating: null, note: null }
            : {
                status,
                rating: status === "watched" ? cur.rating : null,
                note: status === "watched" ? cur.note : null,
              };
        return { ...m, reactions: { ...m.reactions, [s.currentFriend]: next } };
      }),
    }));
  }

  function setRating(movieId: string, rating: ReactionTier) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) => {
        if (m.id !== movieId) return m;
        const cur = m.reactions[s.currentFriend];
        if (!cur) return m;
        const next = { ...cur, rating: cur.rating === rating ? null : rating, noteDismissed: false };
        return { ...m, reactions: { ...m.reactions, [s.currentFriend]: next } };
      }),
    }));
  }

  function setNote(movieId: string, note: string) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) => {
        if (m.id !== movieId) return m;
        const cur = m.reactions[s.currentFriend];
        if (!cur) return m;
        return { ...m, reactions: { ...m.reactions, [s.currentFriend]: { ...cur, note } } };
      }),
    }));
  }

  function dismissNote(movieId: string) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) => {
        if (m.id !== movieId) return m;
        const cur = m.reactions[s.currentFriend];
        if (!cur) return m;
        return { ...m, reactions: { ...m.reactions, [s.currentFriend]: { ...cur, noteDismissed: true } } };
      }),
    }));
  }

  function submitPlea(movieId: string, plea: string) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) => (m.id === movieId ? { ...m, plea, revived: true } : m)),
    }));
  }

  function bumpBack(movieId: string) {
    setState((s) => ({
      ...s,
      movies: s.movies.map((m) =>
        m.id === movieId ? { ...m, revived: true, bumpedBy: s.currentFriend } : m,
      ),
    }));
  }

  function addMovie(title: string, pitch: string) {
    setState((s) => ({
      ...s,
      movies: [
        {
          id: `m${Date.now()}`,
          title,
          recommendedBy: s.currentFriend,
          pitch,
          runtime: 110,
          providers: ["prime"],
          dateAdded: new Date().toISOString(),
          reactions: {},
        },
        ...s.movies,
      ],
    }));
  }

  function setTimeLimit(mins: number) {
    setState((s) => ({ ...s, timeLimit: mins }));
  }

  function lockTonight(movieId: string, service: string) {
    setState((s) => ({ ...s, tonight: { id: movieId, service } }));
  }

  function clearTonight() {
    setState((s) => ({ ...s, tonight: null }));
  }

  function toggleService(serviceId: string) {
    setState((s) => {
      const arr = s.services[s.currentFriend] ?? [];
      const next = arr.includes(serviceId) ? arr.filter((id) => id !== serviceId) : [...arr, serviceId];
      return { ...s, services: { ...s.services, [s.currentFriend]: next } };
    });
  }

  const tonightMovie = state.tonight ? state.movies.find((m) => m.id === state.tonight!.id) : null;
  const hot = hotCandidates(state);
  const hero = hot[0];
  const minis = hot.slice(1, HOT_MAX_ITEMS);
  const overflow = hot.length - HOT_MAX_ITEMS;

  const tastePairs = FRIENDS.filter((f) => f.id !== state.currentFriend)
    .map((f) => {
      const a = affinity(state, state.currentFriend, f.id);
      return a ? { name: f.name, ...a } : null;
    })
    .filter((p): p is { name: string; pct: number; shared: number } => p !== null)
    .sort((a, b) => b.pct - a.pct);

  const visibleMovies = [...state.movies]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .filter((m) => passesFilter(state, m));

  let ignoredCount = 0;
  let pannedCount = 0;
  for (const m of state.movies) {
    const r = retireState(m);
    if (!r) continue;
    if (r.bucket === "ignored") ignoredCount++;
    else pannedCount++;
  }
  const shelfHead =
    state.filter === "ignored"
      ? `Ignored · ${visibleMovies.length} going unwatched`
      : state.filter === "panned"
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
          {viewerName && onSignOut && (
            <span className="who">
              <span>Signed in as {viewerName}</span>
              <form action={onSignOut}>
                <button type="submit" className="icon-btn" title="Sign out" aria-label="Sign out">
                  ⏻
                </button>
              </form>
            </span>
          )}
          <span className="who">
            <span>Viewing as</span>
            <select
              aria-label="Switch viewer"
              value={state.currentFriend}
              onChange={(e) => setCurrentFriend(e.target.value)}
            >
              {FRIENDS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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

        {tonightMovie && state.tonight && (
          <div className="tonight-strip">
            Watching tonight · <b>{tonightMovie.title}</b> · {runtimeLabel(tonightMovie.runtime)} · on{" "}
            {serviceName(state.tonight.service)}
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
                {hero.movie.recommendedBy === state.currentFriend ? (
                  <b className="yours">You</b>
                ) : (
                  <b>{friendName(hero.movie.recommendedBy)}</b>
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
              aria-pressed={state.filter === f.id}
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
