-- ============================================================
-- GrOrbit — 017: one restaurant per owner
--
-- WHY THIS EXISTS
-- The app creates a restaurant for an owner on first login if they don't
-- already have one. If that lookup ever failed transiently (an RLS/permission
-- error during setup, a network blip, two tabs racing), the create path could
-- run for an owner who ALREADY had a restaurant — producing a duplicate row
-- that then showed twice in the super-admin dashboard.
--
-- The app-side guard is fixed, but a database constraint makes it impossible
-- rather than merely unlikely.
--
-- BEFORE RUNNING: check for existing duplicates and clean them up, otherwise
-- creating the unique index will fail. Use this to inspect:
--
--   select r.id, r.name, r.slug, r.created_at, u.email as owner_email,
--          (select count(*) from orders o where o.restaurant_id = r.id) as orders,
--          (select count(*) from menu_items m where m.restaurant_id = r.id) as items
--   from restaurants r
--   left join auth.users u on u.id = r.owner_id
--   order by u.email, r.created_at;
--
-- Then delete ONLY the empty duplicate (0 orders, 0 items):
--   delete from restaurants where id = '<empty-duplicate-id>';
--   -- NOTE: deleting a restaurant cascades to its menu items and orders.
-- ============================================================

-- One restaurant per owner. Partial index so rows with a null owner (if any)
-- are not constrained.
create unique index if not exists uniq_restaurant_per_owner
  on public.restaurants (owner_id)
  where owner_id is not null;
