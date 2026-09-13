-- Watch Pool — initial schema
--
-- Multi-tenant from the start: every group's data is isolated by group_id,
-- enforced by RLS (not just app-layer filtering), because this project is
-- meant to host a handful of separate, non-overlapping friend groups on one
-- Supabase project. See TODO.md "Capacity note" for why one project is fine
-- at this scale.

-- ---------------------------------------------------------------------
-- profiles: one row per auth user. Kept intentionally thin — this app has
-- no public profile surface, just a display name shown on pitches/reactions.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Creates a profile row automatically whenever someone signs up (magic link).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- groups + membership
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Invite-only per group: a code joins exactly one group, never the whole app.
create table public.group_invites (
  code text primary key default substr(md5(random()::text), 1, 8),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- ---------------------------------------------------------------------
-- movies + reactions (the pool)
-- ---------------------------------------------------------------------
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null,
  pitch text not null check (char_length(pitch) > 0), -- no pick without a "why"
  recommended_by uuid not null references public.profiles (id),
  date_added timestamptz not null default now(),
  -- retirement/revival (see TODO.md "Two-bucket retirement")
  revived boolean not null default false,
  plea text,
  bumped_by uuid references public.profiles (id)
);

create table public.reactions (
  movie_id uuid not null references public.movies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text check (status in ('want', 'watched', 'skip')),
  rating text check (rating in ('loved', 'liked', 'meh', 'miss')),
  note text,
  note_dismissed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (movie_id, user_id),
  -- a rating only makes sense once something's been watched
  constraint rating_requires_watched check (rating is null or status = 'watched')
);

create index movies_group_id_idx on public.movies (group_id);
create index reactions_movie_id_idx on public.reactions (movie_id);

-- ---------------------------------------------------------------------
-- Row Level Security — every table scoped to "groups I'm a member of"
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.movies enable row level security;
alter table public.reactions enable row level security;

-- profiles: readable by anyone signed in (display name only, no email) so
-- pitches/reactions can show names across group members.
create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- groups: visible only if you're a member. Created via create_group() below,
-- not directly, so membership is never missed.
create policy "members can see their groups"
  on public.groups for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

-- group_members: visible only to fellow members of that same group.
create policy "members can see their group's roster"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

-- group_invites: only admins of a group can see/create its invite codes.
create policy "admins can see their group's invites"
  on public.group_invites for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_invites.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

create policy "admins can create invites"
  on public.group_invites for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.group_members
      where group_members.group_id = group_invites.group_id
        and group_members.user_id = auth.uid()
        and group_members.role = 'admin'
    )
  );

-- movies: readable/writable only by members of that movie's group.
create policy "members can see their group's pool"
  on public.movies for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = movies.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "members can recommend into their group's pool"
  on public.movies for insert
  to authenticated
  with check (
    recommended_by = auth.uid()
    and exists (
      select 1 from public.group_members
      where group_members.group_id = movies.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "members can update pool entries (revive/plea/bump)"
  on public.movies for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = movies.group_id
        and group_members.user_id = auth.uid()
    )
  );

-- reactions: everyone in the group can see everyone's reactions (that's the
-- whole point — social proof), but you can only write your own.
create policy "members can see their group's reactions"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.movies
      join public.group_members on group_members.group_id = movies.group_id
      where movies.id = reactions.movie_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "users manage only their own reaction"
  on public.reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies
      join public.group_members on group_members.group_id = movies.group_id
      where movies.id = reactions.movie_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "users update only their own reaction"
  on public.reactions for update
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- RPCs: the only way group membership rows get created. Kept as narrow,
-- security-definer entry points instead of open INSERT policies on
-- group_members, so "join a group" always means "via a real invite."
-- ---------------------------------------------------------------------
create function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  new_group public.groups;
begin
  insert into public.groups (name, created_by)
  values (group_name, auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, auth.uid(), 'admin');

  return new_group;
end;
$$;

create function public.join_group(invite_code text)
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  invite public.group_invites;
  joined_group public.groups;
begin
  select * into invite from public.group_invites where code = invite_code;

  if invite is null then
    raise exception 'Invalid invite code';
  end if;
  if invite.expires_at is not null and invite.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invite.group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  select * into joined_group from public.groups where id = invite.group_id;
  return joined_group;
end;
$$;

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
