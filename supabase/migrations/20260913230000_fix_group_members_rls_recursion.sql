-- Fix: "members can see their group's roster" queried group_members from
-- within its own group_members policy, so Postgres re-evaluated the same
-- policy for the subquery's row and recursed forever ("infinite recursion
-- detected in policy for relation group_members"). A SECURITY DEFINER
-- function bypasses RLS internally, breaking the loop, and is a stable
-- building block for group-membership checks elsewhere too.

create function public.is_group_member(check_group_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = check_group_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

drop policy "members can see their group's roster" on public.group_members;

create policy "members can see their group's roster"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));
