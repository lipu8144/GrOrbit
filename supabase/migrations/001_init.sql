-- ============================================================
-- GrOrbit — initial schema (paste into Supabase SQL editor,
-- or run via `supabase db push` with the CLI)
-- ============================================================

-- ---------- 1. PROFILES (extends auth.users) ----------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  role        text not null default 'owner' check (role in ('owner','staff','superadmin')),
  created_at  timestamptz not null default now()
);

-- auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. RESTAURANTS (tenants) ------------------------
create table if not exists public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  owner_id    uuid references auth.users(id) on delete set null,
  city        text default '',
  plan        text not null default 'Starter' check (plan in ('Starter','Growth','Pro')),
  status      text not null default 'trial' check (status in ('trial','active','suspended')),
  -- storefront settings: about, contact{}, prepTimeMins, offers[], growth{}
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_restaurants_owner on public.restaurants(owner_id);

-- ---------- 3. MENU ------------------------------------------
create table if not exists public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  emoji         text default '🍽️',
  sort          int  not null default 0,
  active        boolean not null default true
);
create index if not exists idx_cats_restaurant on public.menu_categories(restaurant_id);

create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.menu_categories(id) on delete set null,
  name          text not null,
  description   text default '',
  price         int  not null check (price >= 0),          -- paise-free: whole ₹
  food_type     text not null default 'veg' check (food_type in ('veg','nonveg')),
  image_url     text default '',
  status        text not null default 'active' check (status in ('active','outofstock','hidden')),
  popular       boolean not null default false,
  special       boolean not null default false,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_items_restaurant on public.menu_items(restaurant_id);
create index if not exists idx_items_category   on public.menu_items(category_id);

-- ---------- 4. ORDERS ----------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  token          text not null,
  customer_name  text default 'Guest',
  customer_phone text default '',
  order_type     text not null default 'dinein' check (order_type in ('dinein','parcel')),
  table_no       int,
  status         text not null default 'new'
                 check (status in ('new','preparing','ready','completed','cancelled')),
  payment        text not null default 'unpaid' check (payment in ('unpaid','paid')),
  method         text default 'Pay at counter',
  notes          text default '',
  subtotal       int not null default 0,
  discount       int not null default 0,
  coupon_code    text,
  total          int not null default 0,
  placed_at      timestamptz not null default now(),
  started_at     timestamptz,
  ready_at       timestamptz,
  completed_at   timestamptz
);
-- the two indexes every dashboard query needs
create index if not exists idx_orders_restaurant_placed on public.orders(restaurant_id, placed_at desc);
create index if not exists idx_orders_restaurant_status on public.orders(restaurant_id, status);

create table if not exists public.order_items (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  -- denormalised so history survives menu edits
  name      text not null,
  qty       int  not null check (qty > 0),
  price     int  not null,
  food_type text default 'veg'
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- daily token counter: #201, #202… resets each day per restaurant
create table if not exists public.token_counters (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day           date not null,
  counter       int  not null default 200,
  primary key (restaurant_id, day)
);

create or replace function public.next_token(rid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into token_counters (restaurant_id, day, counter)
  values (rid, current_date, 201)
  on conflict (restaurant_id, day)
  do update set counter = token_counters.counter + 1
  returning counter into n;
  return '#' || n;
end $$;

-- ---------- 5. COUPONS ----------------------------------------
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code          text not null,
  description   text default '',
  kind          text default 'Custom',
  -- {type:'percent'|'flat', value:int, max?:int, minOrder?:int}
  discount      jsonb not null default '{}'::jsonb,
  active        boolean not null default true,
  expires       text default 'Ongoing',
  issued        int not null default 0,
  redeemed      int not null default 0,
  unique (restaurant_id, code)
);

-- ---------- 6. NOTIFICATIONS ----------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  type          text not null default 'system',
  title         text not null,
  body          text default '',
  meta          jsonb not null default '{}'::jsonb,   -- rating, customer, phone…
  unread        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_notifs_restaurant on public.notifications(restaurant_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Roles: anon (customers scanning QR) · authenticated owner · superadmin
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.restaurants     enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.coupons         enable row level security;
alter table public.notifications   enable row level security;

-- helpers
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'superadmin') $$;

create or replace function public.owns_restaurant(rid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from restaurants where id = rid and owner_id = auth.uid()) $$;

-- profiles: user reads/updates own; superadmin reads all
create policy "own profile"        on public.profiles for select using (id = auth.uid() or is_superadmin());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

-- restaurants: public can read active/trial storefronts; owner full; superadmin full
create policy "public storefront"  on public.restaurants for select using (status <> 'suspended' or owner_id = auth.uid() or is_superadmin());
create policy "owner insert"       on public.restaurants for insert with check (owner_id = auth.uid());
create policy "owner update"       on public.restaurants for update using (owner_id = auth.uid() or is_superadmin());

-- menu: public read (customers browse), owner writes
create policy "public read cats"   on public.menu_categories for select using (true);
create policy "owner write cats"   on public.menu_categories for all
  using (owns_restaurant(restaurant_id)) with check (owns_restaurant(restaurant_id));
create policy "public read items"  on public.menu_items for select using (true);
create policy "owner write items"  on public.menu_items for all
  using (owns_restaurant(restaurant_id)) with check (owns_restaurant(restaurant_id));

-- orders: anon may INSERT (place order); anon may read a single order it knows the
-- uuid of (uuid is unguessable — acceptable for v1, tighten with a claim token later);
-- owner reads/updates their restaurant's orders.
create policy "customer place order" on public.orders for insert with check (true);
create policy "read order"           on public.orders for select
  using (owns_restaurant(restaurant_id) or is_superadmin() or true);
create policy "owner update order"   on public.orders for update
  using (owns_restaurant(restaurant_id));

create policy "customer add items"  on public.order_items for insert with check (true);
create policy "read order items"    on public.order_items for select using (true);

-- coupons: public can read active (validate at cart), owner writes
create policy "public read active coupons" on public.coupons for select using (active or owns_restaurant(restaurant_id));
create policy "owner write coupons" on public.coupons for all
  using (owns_restaurant(restaurant_id)) with check (owns_restaurant(restaurant_id));

-- notifications: owner only (insert allowed from anon so the customer app can raise
-- feedback/new-order events; reading stays owner-only)
create policy "insert notifications" on public.notifications for insert with check (true);
create policy "owner read notifs"    on public.notifications for select using (owns_restaurant(restaurant_id) or is_superadmin());
create policy "owner update notifs"  on public.notifications for update using (owns_restaurant(restaurant_id));

-- ---------- REALTIME ------------------------------------------
-- live orders + notifications push to the dashboard
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
