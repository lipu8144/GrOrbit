-- ============================================================
-- GrOrbit — 020: per-phone limits on reward issuance
--
-- WHY THIS EXISTS
-- issue_coupon previously guarded only "one reward per ORDER". A phone number
-- could therefore accumulate unlimited rewards, and — because GrOrbit supports
-- several separate orders in one sitting (the animal-tag multi-order model) — a
-- single visit placing three orders minted three next-visit coupons.
--
-- Two limits are added, both enforced HERE rather than in the browser. The
-- customer page runs on the anon key and anything it checks can be bypassed by
-- editing the request; only the database can actually enforce this.
--
--   1. ONE reward per phone per DAY (per restaurant, per kind).
--      Collapses a multi-order visit into a single reward.
--
--   2. An optional TOTAL cap per phone, set by the restaurant in
--      Settings → Ordering / Storefront → Next-visit reward:
--          settings.growth.nextVisit.maxPerPhone
--      0 or absent = unlimited (previous behaviour, so nothing changes for a
--      restaurant that doesn't set it).
--
-- The per-order guard is kept: it still stops the same order being re-claimed.
--
-- Idempotent: replaces the function definition.
-- ============================================================

create or replace function public.issue_coupon(
  p_order uuid, p_kind text, p_discount jsonb, p_days int default 30
) returns text language plpgsql security definer set search_path = public as $$
declare
  o        record;
  v_code   text;
  v_phone  text;
  v_max    int;
  v_count  int;
begin
  select * into o from orders where id = p_order;
  if o is null then raise exception 'order not found'; end if;
  if o.status not in ('completed','ready') then
    raise exception 'coupon only unlocks after the order is served';
  end if;
  if coalesce(o.customer_phone,'') = '' then
    raise exception 'phone required to issue a reward';
  end if;

  -- one reward per order per kind (stops re-claiming the same order)
  if exists (select 1 from issued_coupons where source_order = p_order and kind = p_kind) then
    raise exception 'reward already claimed for this order';
  end if;

  -- Compare on DIGITS ONLY so "+91 98765 43210" and "9876543210" are treated as
  -- the same customer — otherwise the cap is trivially sidestepped by typing the
  -- number in a different format.
  v_phone := regexp_replace(o.customer_phone, '\D', '', 'g');

  -- LIMIT 1 — one reward per phone per day, per restaurant, per kind.
  select count(*) into v_count
  from issued_coupons
  where restaurant_id = o.restaurant_id
    and kind = p_kind
    and regexp_replace(customer_phone, '\D', '', 'g') = v_phone
    and issued_at >= date_trunc('day', now());
  if v_count > 0 then
    raise exception 'reward already issued to this number today';
  end if;

  -- LIMIT 2 — optional lifetime cap per phone, from the restaurant's settings.
  select nullif(settings->'growth'->'nextVisit'->>'maxPerPhone','')::int
    into v_max
  from restaurants where id = o.restaurant_id;

  if coalesce(v_max, 0) > 0 then
    select count(*) into v_count
    from issued_coupons
    where restaurant_id = o.restaurant_id
      and kind = p_kind
      and regexp_replace(customer_phone, '\D', '', 'g') = v_phone;
    if v_count >= v_max then
      raise exception 'reward limit reached for this number';
    end if;
  end if;

  v_code := upper(p_kind) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into issued_coupons (restaurant_id, code, kind, discount, customer_phone, source_order, expires_at)
  values (o.restaurant_id, v_code, p_kind, p_discount, o.customer_phone, p_order, now() + (p_days || ' days')::interval);
  return v_code;
end $$;

grant execute on function public.issue_coupon(uuid, text, jsonb, int) to anon, authenticated;

-- Supports the per-phone counting above (the existing idx_issued_phone indexes
-- the raw column; these lookups normalise it, so add a matching expression index).
create index if not exists idx_issued_phone_digits
  on public.issued_coupons (restaurant_id, kind, (regexp_replace(customer_phone, '\D', '', 'g')));
