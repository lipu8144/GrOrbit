-- ============================================================
-- GrOrbit — 013: contact details in the super-admin tenant list
-- Adds the restaurant's contact phone/email (from settings) and the
-- owner's login email so the platform admin can reach them.
-- Run AFTER 012.
-- ============================================================
create or replace function public.admin_tenants()
returns table (
  id uuid, name text, slug text, city text, plan text, status text,
  joined date, orders bigint, revenue bigint,
  phone text, email text, owner_email text, owner_name text
) language plpgsql security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'superadmin only'; end if;
  return query
    select r.id, r.name, r.slug, r.city, r.plan, r.status,
           r.created_at::date,
           count(o.id) filter (where o.status <> 'cancelled'),
           coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::bigint,
           nullif(r.settings->'contact'->>'phone', '')::text,
           nullif(r.settings->'contact'->>'email', '')::text,
           u.email::text,
           p.name
    from restaurants r
    left join orders o on o.restaurant_id = r.id
    left join auth.users u on u.id = r.owner_id
    left join profiles p on p.id = r.owner_id
    group by r.id, u.email, p.name
    order by r.created_at desc;
end $$;
grant execute on function public.admin_tenants() to authenticated;
