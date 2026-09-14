-- Phase 3 — per-person streaming services.
--
-- One-time setup, per person (see TODO.md "Decide for me is personal, not
-- group"): drives "streaming on a service you have" in tonightPicks(), never
-- a shared/group setting. service_id matches the app-internal ids in
-- src/lib/watch-pool/constants.ts (SERVICES), not TMDB provider ids.

create table public.user_services (
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

alter table public.user_services enable row level security;

-- Personal setting — never visible to, or writable by, anyone else.
create policy "users manage their own services"
  on public.user_services for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
