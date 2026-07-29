-- ============================================================
-- GrOrbit — 003: coupon check (no-burn), spin issuance timing,
--                and an order spam guard for QR abuse
-- Run AFTER 001 and 002.
-- ============================================================

-- ---------- A. check_coupon: validate WITHOUT redeeming ----------
-- Called when the customer taps "Apply" in the cart. Nothing is marked
-- used here — actual redemption happens at order placement.
create or replace function public.check_coupon(
  p_code text, p_phone text, p_restaurant uuid, p_subtotal int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; d jsonb; amt int;
begin
  select * into c from issued_coupons
   where code = upper(trim(p_code)) and restaurant_id = p_restaurant;
  if c is null then return jsonb_build_object('ok', false, 'error', 'Invalid code'); end if;
  if c.redeemed_at is not null then return jsonb_build_object('ok', false, 'error', 'Code already used'); end if;
  if c.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'Code expired'); end if;
  if coalesce(p_phone,'') = '' then
    return jsonb_build_object('ok', false, 'error', 'Enter your phone number to use this personal code');
  end if;
  if regexp_replace(c.customer_phone,'\D','','g') <> regexp_replace(p_phone,'\D','','g') then
    return jsonb_build_object('ok', false, 'error', 'This code belongs to a different phone number');
  end if;
  d := c.discount;
  if (d->>'minOrder') is not null and p_subtotal < (d->>'minOrder')::int then
    return jsonb_build_object('ok', false, 'error',
      'Add ₹' || ((d->>'minOrder')::int - p_subtotal) || ' more to use this code');
  end if;
  amt := case when d->>'type' = 'percent'
              then least(coalesce((d->>'max')::int, 2147483647), p_subtotal * (d->>'value')::int / 100)
              else (d->>'value')::int end;
  return jsonb_build_object('ok', true, 'discount', least(amt, p_subtotal),
                            'kind', c.kind, 'rule', d, 'description',
                            case c.kind
                              when 'spin' then 'Spin reward'
                              when 'next_visit' then 'Next-visit reward'
                              when 'review' then 'Review reward'
                              when 'whatsapp_join' then 'WhatsApp member reward'
                              else 'Reward' end);
end $$;
grant execute on function public.check_coupon(text, text, uuid, int) to anon, authenticated;

-- ---------- B. issue_coupon: allow spin during preparation ----------
-- Tradeoff (documented): the spin game runs while food is being made.
-- An order the kitchen has ACCEPTED (preparing) is a real customer, so we
-- allow issuance from 'preparing' onward. Scan-and-run gets nothing because
-- a 'new' unaccepted order still can't claim, and the spam guard below
-- limits fake orders in the first place.
create or replace function public.issue_coupon(
  p_order uuid, p_kind text, p_discount jsonb, p_days int default 30
) returns text language plpgsql security definer set search_path = public as $$
declare o record; v_code text;
begin
  select * into o from orders where id = p_order;
  if o is null then raise exception 'order not found'; end if;
  if o.status not in ('preparing','ready','completed') then
    raise exception 'reward unlocks once the kitchen accepts your order';
  end if;
  if coalesce(o.customer_phone,'') = '' then
    raise exception 'phone required to issue a reward';
  end if;
  if exists (select 1 from issued_coupons where source_order = p_order and kind = p_kind) then
    raise exception 'reward already claimed for this order';
  end if;
  v_code := upper(p_kind) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into issued_coupons (restaurant_id, code, kind, discount, customer_phone, source_order, expires_at)
  values (o.restaurant_id, v_code, p_kind, p_discount, o.customer_phone, p_order, now() + (p_days || ' days')::interval);
  return v_code;
end $$;

-- ---------- C. spam guard: throttle QR order floods ----------
-- No table system: limits are per PHONE (the identity we have) plus a
-- restaurant-wide burst cap for anonymous floods. The kitchen's Accept tap
-- remains the human firewall; this is the machine firewall.
create or replace function public.orders_spam_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent_phone int; open_same_phone int; burst int;
begin
  if coalesce(new.customer_phone,'') <> '' then
    -- max 3 brand-new orders from the same phone per 10 minutes
    select count(*) into recent_phone from orders
     where restaurant_id = new.restaurant_id
       and customer_phone = new.customer_phone
       and status = 'new'
       and placed_at > now() - interval '10 minutes';
    if recent_phone >= 3 then
      raise exception 'Too many pending orders from this number. Please ask our staff for help.';
    end if;
    -- max 2 open unpaid orders per phone at a time
    select count(*) into open_same_phone from orders
     where restaurant_id = new.restaurant_id
       and customer_phone = new.customer_phone
       and status in ('new','preparing')
       and payment = 'unpaid';
    if open_same_phone >= 2 then
      raise exception 'You already have open orders. Please complete them first.';
    end if;
  end if;

  -- anonymous flood cap: max 12 unaccepted orders per restaurant per 5 min
  select count(*) into burst from orders
   where restaurant_id = new.restaurant_id
     and status = 'new'
     and placed_at > now() - interval '5 minutes';
  if burst >= 12 then
    raise exception 'We are receiving too many orders right now. Please order at the counter.';
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_spam_guard on public.orders;
create trigger trg_orders_spam_guard
  before insert on public.orders
  for each row execute function public.orders_spam_guard();
