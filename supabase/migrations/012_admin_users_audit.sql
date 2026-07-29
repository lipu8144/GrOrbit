-- ============================================================
-- GrOrbit — 012: super-admin user management + audit log
--   admin_users()  → account list (NEVER passwords: they are one-way
--                    bcrypt hashes and cannot be read by anyone)
--   admin_audit    → records every super-admin view of a tenant
-- Run AFTER 011.
-- ============================================================

create or replace function public.admin_users()
returns table (
  id uuid, email text, name text, role text,
  confirmed boolean, created_at timestamptz, last_sign_in_at timestamptz,
  restaurant text
) language plpgsql security definer set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'superadmin only'; end if;
  return query
    select u.id,
           u.email::text,
           coalesce(p.name, split_part(u.email::text, '@', 1)),
           coalesce(p.role, 'owner'),
           u.email_confirmed_at is not null,
           u.created_at,
           u.last_sign_in_at,
           r.name
    from auth.users u
    left join profiles p on p.id = u.id
    left join restaurants r on r.owner_id = u.id
    order by u.created_at desc;
end $$;
grant execute on function public.admin_users() to authenticated;

-- ---------- audit trail for tenant impersonation ----------
create table if not exists public.admin_audit (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references auth.users(id) on delete cascade,
  admin_email   text,
  action        text not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_admin_audit on public.admin_audit(created_at desc);

alter table public.admin_audit enable row level security;
create policy "superadmin reads audit" on public.admin_audit
  for select using (is_superadmin());
create policy "superadmin writes audit" on public.admin_audit
  for insert with check (is_superadmin());
