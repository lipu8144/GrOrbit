-- ============================================================
-- GrOrbit — 019: item add-ons (modifiers)
--
-- WHY THIS EXISTS, AND HOW IT DIFFERS FROM PORTIONS (018)
-- The restaurant industry separates two distinct concepts, and conflating them
-- is the classic menu-modelling mistake:
--
--   PORTIONS (018) — mutually exclusive SIZES, each with an ABSOLUTE price.
--                    "Half ₹90 / Full ₹160". Pick exactly one.
--
--   ADD-ONS  (019) — optional EXTRAS, each priced as a DELTA on top.
--                    "Extra cheese +₹30, Add egg +₹20". Pick any number.
--
-- Sizes get absolute prices because a half plate is not reliably "full minus a
-- fixed amount" — margins differ per size and owners price them independently.
-- Extras get deltas because they genuinely are an addition to whatever base the
-- customer already chose, and the same extra costs the same on any size.
--
--   [{"label": "Extra cheese", "price": 30}, {"label": "Add egg", "price": 20}]
--
-- BACKWARD COMPATIBLE: default is an empty array, meaning "no add-ons". Every
-- existing item is untouched, and the customer sees no extra step unless the
-- owner defines add-ons for that item.
--
-- Safe to run more than once.
-- ============================================================

alter table public.menu_items
  add column if not exists addons jsonb not null default '[]'::jsonb;

-- Guard the shape, exactly as 018 does for portions: a malformed write (object
-- or string instead of an array) must not be able to break the customer menu.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menu_items_addons_is_array'
  ) then
    alter table public.menu_items
      add constraint menu_items_addons_is_array
      check (jsonb_typeof(addons) = 'array');
  end if;
end $$;

comment on column public.menu_items.addons is
  'Optional add-ons priced as a delta on top of the chosen portion/base: [{"label":"Extra cheese","price":30},...]. Empty array = no add-ons.';
