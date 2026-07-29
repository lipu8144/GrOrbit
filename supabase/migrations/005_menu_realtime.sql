-- ============================================================
-- GrOrbit — 005: live menu updates
-- Publish menu tables over Realtime so an owner's edit appears on
-- customers' open menu pages instantly (no refresh needed).
-- ============================================================
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.menu_categories;
