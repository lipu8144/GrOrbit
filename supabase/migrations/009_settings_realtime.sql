-- ============================================================
-- GrOrbit — 009: live settings push
-- Storefront edits (prep time, offers, specials, name) appear on
-- customers' OPEN menu pages instantly — no refresh.
-- ============================================================
alter publication supabase_realtime add table public.restaurants;
