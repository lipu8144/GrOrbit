-- ============================================================
-- GrOrbit — 011: fix profiles RLS recursion
-- The old SELECT policy called is_superadmin(), which itself SELECTs
-- from profiles → infinite recursion → the role read ERRORS, so every
-- login silently fell back to role='owner' (superadmins landed on /app).
-- A user reading their OWN row needs no superadmin check at all.
-- ============================================================

-- make the helper bypass RLS so it can never recurse
create or replace function public.is_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin')
$$;

drop policy if exists "own profile" on public.profiles;

-- self-read: no recursion, just the id match
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- superadmins can read all profiles; safe now because is_superadmin() is
-- SECURITY DEFINER and bypasses this policy instead of re-triggering it
create policy "superadmin reads profiles" on public.profiles
  for select using (is_superadmin());
