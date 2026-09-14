-- Follow-up hardening after code review of the auth UI:
--
-- 1. Adds is_group_admin() alongside the existing is_group_member(), and
--    rewrites every policy that inlined `exists (select 1 from
--    group_members ...)` to use the helpers instead — same fix as the
--    group_members recursion, applied consistently, and cheaper than a
--    correlated subquery per row.
-- 2. Restricts `profiles` SELECT to yourself + people who share a group
--    with you. The previous `using (true)` let anyone who could sign up
--    (signups are open) read every group's member list via display_name,
--    which defeats the "invite-only per group" intent.
-- 3. Lets group admins revoke an invite (no DELETE policy existed before).
-- 4. Adds a WITH CHECK to the reactions UPDATE policy mirroring INSERT's —
--    without it, a member could update their own reaction row's movie_id
--    to point at a movie in a group they don't belong to.

create function public.is_group_admin(check_group_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = check_group_id and user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_group_admin(uuid) to authenticated;

-- profiles ---------------------------------------------------------------

drop policy "profiles are readable by any signed-in user" on public.profiles;

create policy "profiles are readable by co-members"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

-- groups -------------------------------------------------------------------

drop policy "members can see their groups" on public.groups;

create policy "members can see their groups"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

-- group_invites --------------------------------------------------------------

drop policy "admins can see their group's invites" on public.group_invites;
drop policy "admins can create invites" on public.group_invites;

create policy "admins can see their group's invites"
  on public.group_invites for select
  to authenticated
  using (public.is_group_admin(group_id));

create policy "admins can create invites"
  on public.group_invites for insert
  to authenticated
  with check (created_by = auth.uid() and public.is_group_admin(group_id));

create policy "admins can revoke their group's invites"
  on public.group_invites for delete
  to authenticated
  using (public.is_group_admin(group_id));

-- movies ---------------------------------------------------------------------

drop policy "members can see their group's pool" on public.movies;
drop policy "members can recommend into their group's pool" on public.movies;
drop policy "members can update pool entries (revive/plea/bump)" on public.movies;

create policy "members can see their group's pool"
  on public.movies for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "members can recommend into their group's pool"
  on public.movies for insert
  to authenticated
  with check (recommended_by = auth.uid() and public.is_group_member(group_id));

create policy "members can update pool entries (revive/plea/bump)"
  on public.movies for update
  to authenticated
  using (public.is_group_member(group_id));

-- reactions --------------------------------------------------------------------

drop policy "members can see their group's reactions" on public.reactions;
drop policy "users manage only their own reaction" on public.reactions;
drop policy "users update only their own reaction" on public.reactions;

create policy "members can see their group's reactions"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.movies
      where movies.id = reactions.movie_id
        and public.is_group_member(movies.group_id)
    )
  );

create policy "users manage only their own reaction"
  on public.reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies
      where movies.id = reactions.movie_id
        and public.is_group_member(movies.group_id)
    )
  );

create policy "users update only their own reaction"
  on public.reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.movies
      where movies.id = reactions.movie_id
        and public.is_group_member(movies.group_id)
    )
  );
