-- ============================================================
-- GrOrbit — 018: item portions (half plate / full plate)
--
-- WHY THIS EXISTS
-- Indian restaurants routinely sell the same dish in more than one portion at
-- different prices ("Dal Fry — Half ₹90 / Full ₹160"). Modelling that as two
-- separate menu items doubles the menu, duplicates photos and descriptions, and
-- forces the owner to maintain two rows per dish.
--
-- Instead, an item keeps its single row and gains an OPTIONAL list of portions:
--
--   [{"label": "Half", "price": 90}, {"label": "Full", "price": 160}]
--
-- Labels are free text so the same mechanism covers "Small/Medium/Large",
-- "Single/Double", "250ml/500ml" — whatever the restaurant actually says.
--
-- BACKWARD COMPATIBLE: the default is an empty array, meaning "no portions".
-- Every existing item keeps its single `price` and behaves exactly as before.
-- The customer only sees a portion chooser on items that define portions.
--
-- Safe to run more than once.
-- ============================================================

alter table public.menu_items
  add column if not exists portions jsonb not null default '[]'::jsonb;

-- Guard the shape: must be a JSON array. Prevents a malformed write (e.g. an
-- object or a string) from reaching the customer menu and breaking rendering.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menu_items_portions_is_array'
  ) then
    alter table public.menu_items
      add constraint menu_items_portions_is_array
      check (jsonb_typeof(portions) = 'array');
  end if;
end $$;

comment on column public.menu_items.portions is
  'Optional portion list: [{"label":"Half","price":90},...]. Empty array = single-price item using menu_items.price.';
