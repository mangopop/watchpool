# Watch Pool

A private, invite-only pool where a friend group recommends movies to each
other — every recommendation carries a required pitch, gets a Want to
Watch / Watched / Not Interested status, and a lightweight four-tier
reaction once watched. See `TODO.md` for the full design decisions and
phased roadmap; this file is just setup.

Stack: **Next.js (App Router) + Supabase (Postgres, Auth, RLS)**, deployed
on Vercel. One Supabase project hosts several separate, non-overlapping
friend groups — see `TODO.md`'s capacity note for why that's fine on the
free tier.

## First-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the migration** against it — either paste
   `supabase/migrations/20260913000000_init.sql` into the SQL Editor in the
   Supabase dashboard, or, if you have the Supabase CLI linked to the
   project, `supabase db push`.
3. **Enable email (magic link) auth**: Authentication → Providers → Email,
   with "Confirm email" using the magic-link flow (no password).
4. **Copy env vars**: `cp .env.local.example .env.local`, then fill in the
   Project URL and anon key from Project Settings → API, plus a TMDB v3 API
   key from [themoviedb.org](https://www.themoviedb.org/settings/api)
   (account settings → API) — needed for title search and poster/runtime
   lookup.
5. `pn install`
6. `pn run dev` — [localhost:3000](http://localhost:3000)

## Common commands

App:

- `pn run dev` — dev server at [localhost:3000](http://localhost:3000)
- `pn run build` / `pn run start` — production build and serve
- `pn run lint` — ESLint
- `pn run typecheck` — `tsc --noEmit`

Supabase, if you're running the local stack (CLI, `.env.local` pointed at
`127.0.0.1:54321`) rather than a hosted project:

- `supabase start` / `supabase stop` — spin the local stack up/down
  (Postgres, Auth, Studio, ...)
- `supabase status` — show local URLs/keys, including Studio at
  [localhost:54323](http://localhost:54323)
- `supabase migration up` — apply any `supabase/migrations/*.sql` files not
  yet run against the local DB (do this after pulling new migrations)
- `supabase db reset` — rebuild the local DB from scratch (every migration,
  replayed in order) — **destructive**, wipes local data
- `supabase db push` — apply pending migrations to a *linked remote*
  project. Only run this deliberately against production; `supabase
  status`'s `linked_project` shows what you're currently linked to
- `supabase migration new <name>` — scaffold a new timestamped migration
  file in `supabase/migrations/`

## What's here vs. not yet

- ✅ Next.js + TypeScript + Tailwind scaffold
- ✅ Supabase client/server/middleware helpers (`src/lib/supabase/`),
  following the SSR cookie-refresh pattern
- ✅ Full multi-tenant schema with RLS: `profiles`, `groups`,
  `group_members`, `group_invites`, `movies`, `reactions`, plus
  `create_group` / `join_group` RPCs so membership is never granted outside
  a real invite
- ✅ Auth UI — magic-link sign-in (`/login`, `/auth/confirm`), sign-out, and
  a create/join-group flow (`/groups`) with invite-code generation. All
  routes except `/login` and `/auth/*` require a session (enforced in
  `proxy.ts`); `/` additionally requires group membership
- ✅ The pool UI — ported from the design POC (Projection Room: warm
  charcoal, projector amber, ticket-stub cards, the What's Hot hero,
  Decide for me, per-pair affinity, retirement), backed by Supabase —
  see `src/components/watch-pool/` and `src/lib/watch-pool/`
- ✅ TMDB integration — title search/autocomplete on add, with real poster
  art, runtime, and release year; falls back to the duotone placeholder
  poster for manual entries with no TMDB match (`src/lib/tmdb.ts`,
  `/api/tmdb/search`)
- ⬜ Streaming providers / Decide for me filter chain (Phase 3 in
  `TODO.md`)

## Notes on the schema

- Every table is scoped by `group_id` (directly, or via a join to `movies`
  for `reactions`) and enforced with Postgres row-level security — not just
  filtered in application code. A bug in a query can't leak one group's
  pool into another's.
- `group_members` rows are only ever created through the `create_group` and
  `join_group` RPCs (`SECURITY DEFINER`), not direct inserts — so "being in
  a group" always traces back to either creating it or redeeming a real
  invite code.
- `movies.pitch` has a `check (char_length(pitch) > 0)` constraint —
  the "no pick without a why" rule is enforced by the database, not just
  the form.
- `reactions.rating` has a `check` tying it to `status = 'watched'` — you
  can't rate something you haven't marked watched, at the schema level.
