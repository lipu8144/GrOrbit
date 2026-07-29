-- ============================================================
-- GrOrbit — 016: base privilege grants (RUN LAST, after 001–015)
--
-- WHY THIS EXISTS
-- Row Level Security decides WHICH ROWS a role may see. It does NOT grant
-- access to the table itself — that is a separate, lower-level privilege.
-- A role with RLS policies but no base GRANT gets "permission denied for
-- table X" *before* any policy is even evaluated.
--
-- After a `drop schema public cascade; create schema public;` rebuild, a
-- one-time `grant all on all tables ...` only covers tables that existed at
-- that instant. Every table created afterwards by migrations 001–015
-- (profiles, restaurants, menu_items, orders, …) receives NO grant, so the
-- app hits "permission denied" even though RLS is correct. This migration
-- fixes that and — via ALTER DEFAULT PRIVILEGES — ensures any table created
-- later is granted automatically, so the problem can never recur.
--
-- Safe to run more than once (grants are idempotent).
-- ============================================================

-- Schema must be usable by the API roles.
grant usage on schema public to anon, authenticated;

-- Base table access. RLS still filters rows on top of these — this only
-- decides whether the role may touch the table at all.
grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant usage, select                  on all sequences in schema public to anon, authenticated;
grant execute                        on all routines  in schema public to anon, authenticated;

-- Auto-grant the same on anything created in this schema from now on, so a
-- future migration adding a table doesn't reintroduce "permission denied".
alter default privileges in schema public
  grant select, insert, update, delete on tables    to anon, authenticated;
alter default privileges in schema public
  grant usage, select                  on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute                        on routines  to anon, authenticated;

-- NOTE: RLS remains the real security boundary — these grants are deliberately
-- broad because every policy from 001–015 constrains access per row/tenant.
-- Do NOT disable RLS anywhere as a shortcut; the grants assume it stays on.
