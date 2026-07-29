-- ============================================================
-- GrOrbit — 015: clear orders off the live board without deleting them
-- "Mark paid & clear" (completed) and "Clear" (cancelled) set cleared_at.
-- The live board hides cleared orders; Order History still shows everything.
-- Nothing is ever deleted — the row stays for analytics & history.
-- ============================================================
alter table public.orders
  add column if not exists cleared_at timestamptz;
create index if not exists idx_orders_cleared on public.orders(restaurant_id, cleared_at);
