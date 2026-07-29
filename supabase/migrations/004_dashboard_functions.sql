-- ============================================================
-- GrOrbit — 004: dashboard data functions
--   admin_tenants()          → super-admin tenant list with live stats
--   restaurant_customers(rid)→ CRM list derived from real orders
-- Run AFTER 001–003.
-- ============================================================

create or replace function public.admin_tenants()
returns table (
  id uuid, name text, slug text, city text, plan text, status text,
  joined date, orders bigint, revenue bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'superadmin only'; end if;
  return query
    select r.id, r.name, r.slug, r.city, r.plan, r.status,
           r.created_at::date,
           count(o.id) filter (where o.status <> 'cancelled'),
           coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::bigint
    from restaurants r
    left join orders o on o.restaurant_id = r.id
    group by r.id
    order by r.created_at desc;
end $$;
grant execute on function public.admin_tenants() to authenticated;

create or replace function public.restaurant_customers(rid uuid)
returns table (
  name text, phone text, orders bigint, spend bigint, last_order timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not (owns_restaurant(rid) or is_superadmin()) then
    raise exception 'not your restaurant';
  end if;
  return query
    select coalesce(nullif(max(o.customer_name), 'Guest'), 'Guest') as name,
           o.customer_phone,
           count(*) as orders,
           coalesce(sum(o.total), 0)::bigint as spend,
           max(o.placed_at) as last_order
    from orders o
    where o.restaurant_id = rid
      and coalesce(o.customer_phone, '') <> ''
      and o.status <> 'cancelled'
    group by o.customer_phone
    order by max(o.placed_at) desc;
end $$;
grant execute on function public.restaurant_customers(uuid) to authenticated;
