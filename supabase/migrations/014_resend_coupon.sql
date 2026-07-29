-- ============================================================
-- GrOrbit — 014: recover an unused coupon by phone
-- A customer who lost their code can look it up with the phone it was
-- issued to. Returns only ACTIVE (unused, unexpired) codes for THIS
-- restaurant — never another restaurant's, never used/expired ones.
-- ============================================================
create or replace function public.my_active_coupons(p_restaurant uuid, p_phone text)
returns table (code text, discount jsonb, expires_at timestamptz) 
language sql security definer set search_path = public as $$
  select ic.code, ic.discount, ic.expires_at
  from issued_coupons ic
  where ic.restaurant_id = p_restaurant
    and regexp_replace(ic.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    and ic.redeemed_at is null
    and (ic.expires_at is null or ic.expires_at > now())
  order by ic.issued_at desc
  limit 5;
$$;
grant execute on function public.my_active_coupons(uuid, text) to anon, authenticated;
