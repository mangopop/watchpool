-- Lets a suggestion be removed outright, for the case where it was added by
-- mistake. Scoped to whoever recommended it (or a group admin cleaning up on
-- someone's behalf) — not open to every member, since a delete is
-- irreversible while reactions/plea/bump are all still editable in place.

create policy "recommender or admin can delete a pool entry"
  on public.movies for delete
  to authenticated
  using (recommended_by = auth.uid() or public.is_group_admin(group_id));
