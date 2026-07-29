-- ============================================================
-- GrOrbit — 002: coupon issuance & fraud-proof redemption
-- Static shared codes (WELCOME10) are marketing; REAL rewards are
-- issued per-customer: unique code, phone-bound, single-use, expiring.
-- ============================================================

create table if not exists public.issued_coupons (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  code           text not null unique,                    -- e.g. SPIN-7F3K9Q
  kind           text not null default 'spin'
                 check (kind in ('spin','next_visit','review','whatsapp_join','referral')),
  discount       jsonb not null,                          -- {type,value,max?,minOrder?}
  customer_phone text not null,                           -- the identity anchor
  source_order   uuid references public.orders(id),       -- the order that EARNED it
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '30 days',
  redeemed_at    timestamptz,
  redeemed_order uuid references public.orders(id)
);
create index if not exists idx_issued_phone on public.issued_coupons(restaurant_id, customer_phone);

alter table public.issued_coupons enable row level security;
-- owners see their restaurant's issued coupons; customers never list them
create policy "owner read issued" on public.issued_coupons for select
  using (owns_restaurant(restaurant_id) or is_superadmin());

-- ---------- issue: only after a COMPLETED order with a phone ----------
create or replace function public.issue_coupon(
  p_order uuid, p_kind text, p_discount jsonb, p_days int default 30
) returns text language plpgsql security definer set search_path = public as $$
declare o record; v_code text;
begin
  select * into o from orders where id = p_order;
  if o is null then raise exception 'order not found'; end if;
  if o.status not in ('completed','ready') then
    raise exception 'coupon only unlocks after the order is served';
  end if;
  if coalesce(o.customer_phone,'') = '' then
    raise exception 'phone required to issue a reward';
  end if;
  -- one reward per order per kind (stops re-spinning the same order)
  if exists (select 1 from issued_coupons where source_order = p_order and kind = p_kind) then
    raise exception 'reward already claimed for this order';
  end if;
  v_code := upper(p_kind) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into issued_coupons (restaurant_id, code, kind, discount, customer_phone, source_order, expires_at)
  values (o.restaurant_id, v_code, p_kind, p_discount, o.customer_phone, p_order, now() + (p_days || ' days')::interval);
  return v_code;
end $$;

-- ---------- redeem: atomic — same phone, unused, unexpired ----------
-- The row lock (FOR UPDATE) means two simultaneous redemptions of the same
-- code can never both succeed, even under concurrent requests.
create or replace function public.redeem_coupon(
  p_code text, p_phone text, p_restaurant uuid, p_subtotal int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; d jsonb; amt int;
begin
  select * into c from issued_coupons
   where code = upper(trim(p_code)) and restaurant_id = p_restaurant
   for update;                                             -- lock the row
  if c is null then return jsonb_build_object('ok', false, 'error', 'Invalid code'); end if;
  if c.redeemed_at is not null then return jsonb_build_object('ok', false, 'error', 'Code already used'); end if;
  if c.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'Code expired'); end if;
  if regexp_replace(c.customer_phone,'\D','','g') <> regexp_replace(p_phone,'\D','','g') then
    return jsonb_build_object('ok', false, 'error', 'This code belongs to a different phone number');
  end if;
  d := c.discount;
  if (d->>'minOrder') is not null and p_subtotal < (d->>'minOrder')::int then
    return jsonb_build_object('ok', false, 'error', 'Order below minimum for this code');
  end if;
  amt := case when d->>'type' = 'percent'
              then least(coalesce((d->>'max')::int, 2147483647), p_subtotal * (d->>'value')::int / 100)
              else (d->>'value')::int end;
  amt := least(amt, p_subtotal);
  update issued_coupons set redeemed_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'discount', amt, 'kind', c.kind);
end $$;

-- customers call these via RPC with the anon key; RLS on the table itself
-- stays owner-only because the functions are SECURITY DEFINER.
grant execute on function public.issue_coupon(uuid, text, jsonb, int) to anon, authenticated;
grant execute on function public.redeem_coupon(text, text, uuid, int) to anon, authenticated;
