-- The plea text was always attributed to recommended_by in the UI ("X
-- pleads the case"), even when a different group member wrote the plea to
-- bump it back. Track who actually pleaded.
alter table public.movies add column plea_by uuid references public.profiles (id);
