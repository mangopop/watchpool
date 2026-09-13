# Watch Pool — TODO / Roadmap

A private, invite-only pool where friends recommend movies with a required
pitch, mark Want to Watch / Watched / Not Interested, and leave a lightweight
reaction. Built and validated as a clickable artifact POC; this doc tracks
turning that into a real web app.

POC reference: the "Projection Room" design — warm charcoal, projector amber,
ticket-stub cards, four-tier reactions (❤️/👍/😐/👎).

---

## Decisions locked from the POC

These were tested by clicking, not just discussed — treat them as settled
unless something real changes your mind:

- **Required pitch** on every recommendation — no pick without a "why"
- **Four-tier reaction** (Loved / Liked / Meh / Didn't like it), only after
  marking Watched. Loved counts full weight, Liked half, Miss subtracts —
  "loved" has to actually mean loved
- **What's Hot hero** — surfaces a title only when at most one person hasn't
  watched-or-skipped it (missingCount ≤ 1), it has real signal (2+ watchers),
  and net approval is positive. Hidden once *you've* watched it — no action
  left, no nudge. Capped at hero + 2 minis so it can't sprawl into a second
  pool
- **Blind spots are copy, not a surface** — folded into the hero
  ("everyone but you has already settled this one"), not a separate section
- **Decide for me is personal, not group** — chain is: in the pool → you
  haven't watched/passed it → streaming on one of your services → fits your
  time window → ranked by group verdict (unwatched pitches included, ranked
  last as "no verdicts yet")
- **Per-pair taste affinity, never a global hit rate** — "You & Priya 82% ·
  4 shared" reads as compatibility, not a scoreboard. No public "Jake: 1/5"
- **One-tap reaction notes, never a cold text box** — chips only appear at
  high-value moments (you're the outlier, you're the last watcher, replying
  to the recommender), framed as "Was Jake right?" rather than "leave a
  review"
- **Two-bucket retirement, one recoverable** — *Ignored* (no verdict + 45
  days stale or 2+ passes) can be bumped back, with a plea if it's your own
  pick. *Panned* (watched, net-negative, nobody queued) retires for good —
  "the group has spoken," no revive
- **Attribution travels with the text, always** — every pitch quote ends in
  `— Jake` (or `— You`), in the hero and on every card, not just in the
  byline above it
- **"Defend your pick" was cut** — no real job once the Ignored-plea existed
- **Multi-tenant from Phase 1** — this will host a handful of separate,
  non-overlapping friend groups on one Supabase project (not just your own
  four), so `groups`/membership/`group_id` scoping is core schema, not a
  "someday." At this scale (a few groups of 4–8) it's nowhere near any
  Supabase free-tier limit — see the capacity note below

## Parked / rejected in the POC

- WhatsApp group-read integration — **not viable**, no group-read API exists
- "Defend your pick" as its own affordance — replaced by the ignored-plea
- Global hit-rate / recommender reputation score — replaced by per-pair
  affinity; a public score reads as judging your friends, not helping them
- Cold text-box reviews — replaced by one-tap chips

---

## Phased plan

### Phase 0 — POC (done)
Clickable artifact, mock data, localStorage only. Validated: hero rules,
four-tier reactions, decide-for-me chain, retirement, attribution.

### Phase 1 — Real repo, no external APIs yet
- [ ] `git init`, pick stack (see Open Decisions)
- [ ] Schema is multi-tenant from day one: `groups`, `group_members`,
      `group_id` on movies/reactions. Every table, every query, every RLS
      policy scoped to "groups I'm a member of" — retrofitting this once a
      group has real data is the thing to avoid
- [ ] Auth (see Open Decisions) — invite-only per group (an invite joins one
      group, not the whole app)
- [ ] Real database replacing localStorage
- [ ] A "create a group" / "join via invite" flow — you're the first admin,
      but any group can bootstrap itself without you touching the database
- [x] Pool view, add-recommendation flow, status toggles, reactions —
      functionally identical to the POC, still manual title entry. Ported
      to React (`src/components/watch-pool/`), still running on the POC's
      mock friend group + `localStorage` — needs rewiring to Supabase once
      auth/groups exist
- [ ] Deploy somewhere reachable on friends' phones (even rough) so the
      group can start actually using it

### Phase 2 — TMDB integration
- [ ] Title search/autocomplete on add, replacing manual entry
- [ ] Real poster art, runtime, release year pulled from TMDB
- [ ] Keep the duotone-placeholder poster as the fallback when TMDB has no
      match (manual entries, obscure titles)

### Phase 3 — Decide for me + streaming providers
- [ ] Pull `/watch/providers` from TMDB (JustWatch-sourced, free) per title
- [ ] Per-person "your services" settings screen (as in the POC)
- [ ] Wire the real filter chain: pool → not watched/passed → on your
      service → fits your time → ranked by group verdict
- [ ] Re-evaluate: is TMDB's provider data enough, or is there a real gap
      only a JustWatch partner deal would close? (Likely no — revisit only
      if something concrete is missing)

### Phase 4 — Social polish
- [ ] Activity feed (who watched/reacted to what, recently)
- [ ] Movie detail view (needed before comment threads make sense)
- [ ] Comment threads per movie
- [ ] Revisit "Most Divisive" as a periodic callout / year-in-review moment,
      once there's enough real history for it to be fun rather than sad

### Phase 5 — Ingestion from where the group already talks
Investigate once the app itself is proven with real use:
- [ ] PWA share-sheet target — share a link out of WhatsApp, app opens with
      title pre-filled into the add flow
- [ ] Forward-to-email or SMS "magic inbox" that creates a draft
      recommendation
- [ ] Telegram/Discord bot (reads groups properly) — only if the group is
      willing to move off WhatsApp for this; don't assume they will

### Someday / needs more real usage first
- [ ] Elo or bracket-style "best of" events, seeded from the pool
- [ ] Recommender reputation, reframed to avoid a public score

---

## Open decisions

- **Movie data API**: TMDB vs OMDb ("standard IMDb API"). TMDB covers
  metadata *and* watch-providers in one integration; OMDb is metadata only
  (title/poster/plot/ratings) with no streaming data. Since Phase 3 needs
  provider data regardless, defaulting to **TMDB** avoids a second
  integration later — flip this if there's a reason to prefer OMDb I'm
  missing.
- **JustWatch**: no public self-serve API exists (partner/commercial only).
  TMDB's `/watch/providers` endpoint *is* JustWatch data, free, via their
  partnership. Building a custom streaming-picks engine only makes sense if
  TMDB's provider data proves incomplete or wrong for your region in
  practice — don't build it pre-emptively.
- **Auth**: shared invite code vs. magic-link email, scoped per group either
  way (joining via an invite adds you to one group, not the whole app).
  Leaning magic-link — no shared secret to leak, and it travels cleanly as a
  link shared into each group's own chat.
- **Stack / hosting**: **Next.js (React) + Supabase**, deployed on Vercel —
  see capacity note below for why this comfortably covers a handful of
  friend groups on the free tier.
- **Where friends actually watch**: worth confirming UK availability/region
  settings for TMDB providers matches what each group actually uses.

## Capacity note — hosting a few separate friend groups

Confirmed scope: one Supabase project hosting a handful of small (4–8
person), non-overlapping friend groups — not just one group of four.
Checked against current Supabase free tier limits (Sep 2026):

- **500MB database storage** — each group's movies/reactions/members data
  is a few hundred KB even after years of use. Thousands of groups' worth
  of headroom.
- **5GB uncached egress/month** — traffic per group is small JSON reads and
  writes from casual, occasional use. Poster images load from TMDB's own
  CDN, not through Supabase, so they don't count against this. Comfortably
  150+ active groups before this is a factor.
- **50,000 monthly active users** — at ~6 people/group that's roughly 8,000
  groups' worth of headroom; never the real constraint.
- Caps to know about: **2 active projects** and auto-pause after a week of
  inactivity — irrelevant as long as it stays one project serving every
  group via `group_id` scoping (don't spin up a project per group).

At "a handful of groups I know," this is nowhere near any limit — Supabase
Pro ($25/mo) is the fallback if that ever changes, and by then it'd mean
enough people are using it to easily justify the cost.
