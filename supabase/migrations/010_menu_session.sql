-- ============================================================
-- GrOrbit — 010: menu session window
-- Minutes a scanned menu stays usable before a re-scan is required.
-- 0 (default) = feature OFF (menu never expires).
-- ============================================================
alter table public.restaurants
  add column if not exists menu_session_mins integer not null default 0;
