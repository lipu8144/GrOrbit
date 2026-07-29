-- ============================================================
-- GrOrbit — 007: late phone capture
-- A customer who ordered WITHOUT a phone can add it at a reward
-- moment (spin game / next-visit gift) to claim their coupon.
-- Safe: only fills an EMPTY phone on that specific order — it can
-- never overwrite an existing number (no identity hijacking).
-- ============================================================
create or replace function public.attach_phone(p_order uuid, p_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
declare digits text;
begin
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(digits) < 10 then
    raise exception 'Please enter a valid phone number';
  end if;
  update orders
     set customer_phone = trim(p_phone)
   where id = p_order
     and coalesce(customer_phone, '') = '';
  return found;
end $$;
grant execute on function public.attach_phone(uuid, text) to anon, authenticated;
