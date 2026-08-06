# PostgreSQL, taught through your own database

Every example here is from **your** GrOrbit schema. Learning SQL on your own tables
means you can run each query immediately in the Supabase SQL Editor and see real
results.

---

## 1. What Postgres actually is, and where it sits in your app

Postgres is a **relational database**: data lives in tables (rows and columns), and
tables reference each other by ID. "Relational" means the relationships between
tables are declared and enforced *by the database itself*, not by your app code.

In most apps the flow is `browser → backend server → database`. GrOrbit has **no
backend server**. Supabase exposes Postgres over HTTP, so it's `browser → Postgres`.

That has one enormous consequence: **the database is your security layer.** There's
no server code to check "is this user allowed?" — Postgres must decide that itself.
That's what Row Level Security (section 9) does, and why it matters so much for you.

Your six core tables and how they relate:

```
auth.users  (managed by Supabase Auth)
    │
    ├── profiles          (1:1 — adds role: owner / staff / superadmin)
    │
    └── restaurants       (1 per owner — the "tenant")
            │
            ├── menu_categories ──┐
            ├── menu_items ───────┘  (items belong to a category)
            ├── orders
            │     └── order_items    (the line items of one order)
            ├── coupons
            ├── issued_coupons
            ├── notifications
            └── qr_scans
```

**"Multi-tenant"** means many restaurants share these same tables, separated by the
`restaurant_id` column. That's why almost every query in your app filters on it.

---

## 2. Reading a table definition

Here's `menu_categories` from your `001_init.sql`, annotated:

```sql
create table if not exists public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  emoji         text default '🍽️',
  sort          int  not null default 0,
  active        boolean not null default true
);
```

| Piece | Meaning |
|---|---|
| `create table if not exists` | Don't error if it already exists — makes migrations re-runnable. |
| `public.` | The **schema** (a namespace). Your app tables live in `public`; Supabase's auth tables live in `auth`. |
| `uuid` | A 128-bit random ID like `3f8a…`. Used instead of 1,2,3 so IDs can be generated in the browser and can't be guessed. |
| `primary key` | Uniquely identifies the row; automatically indexed. |
| `default gen_random_uuid()` | Postgres generates the ID if you don't supply one. |
| `references restaurants(id)` | A **foreign key**: this value must exist in `restaurants.id`. The database refuses orphan rows. |
| `on delete cascade` | Delete the restaurant → its categories are deleted too. |
| `not null` | The column must always have a value. |
| `default 0` / `default true` | Value used when you don't specify one. |

### Delete behaviour matters

Compare two of your foreign keys:

```sql
restaurant_id uuid not null references public.restaurants(id) on delete cascade;
owner_id      uuid          references auth.users(id)         on delete set null;
```

- **`cascade`** — deleting a restaurant deletes all its categories, items, and orders.
  This is why I warned you to be careful deleting the duplicate restaurant row: it
  takes the menu and order history with it.
- **`set null`** — deleting a user leaves the restaurant in place but ownerless,
  rather than destroying a business record.

### `check` constraints — validation inside the database

```sql
status text not null default 'new'
       check (status in ('new','preparing','ready','completed','cancelled')),
role   text not null default 'owner'
       check (role in ('owner','staff','superadmin')),
```

The database rejects any other value. Even if a bug in your JavaScript tried to write
`status = 'done'`, Postgres refuses. This is a safety net your app code cannot bypass.

---

## 3. The data types you're using

| Type | Where you use it | Notes |
|---|---|---|
| `uuid` | every `id` | Random, unguessable, generatable client-side. |
| `text` | names, notes, codes | Unlimited length. Postgres has no penalty for `text` vs `varchar(n)`. |
| `int` | `subtotal`, `discount`, `total`, `sort` | **You store money in paise/whole rupees as integers.** Deliberate: floats can't represent 0.1 exactly, so never use them for money. |
| `boolean` | `active`, `popular`, `special` | true/false. |
| `timestamptz` | `created_at`, `placed_at`, `ready_at` | Timestamp **with timezone** — always prefer this over `timestamp`. Stored as UTC, converted on read. |
| `jsonb` | `restaurants.settings` | A whole JSON document in one column. See section 8. |

---

## 4. SELECT — the four clauses you'll use constantly

```sql
select   name, price          -- 1. which columns
from     menu_items          -- 2. which table
where    restaurant_id = 'your-uuid' and status = 'active'   -- 3. which rows
order by price desc          -- 4. what order
limit    10;                 --    how many
```

Practical queries for your own app:

```sql
-- your restaurant's ID (start here — you need it for everything below)
select id, name, slug from restaurants;

-- today's orders, newest first
select token, customer_name, total, status, placed_at
from orders
where restaurant_id = 'your-uuid'
  and placed_at >= current_date
order by placed_at desc;

-- items missing a photo (useful before onboarding)
select name from menu_items
where restaurant_id = 'your-uuid'
  and (image_url is null or image_url = '');
```

Note `is null` — **not** `= null`. In SQL, `null` means "unknown", and unknown never
equals anything, not even itself. `where image_url = null` returns zero rows, always.

---

## 5. JOIN — combining tables

Your orders store only `restaurant_id`, not the restaurant name. A join fetches both:

```sql
select o.token, o.total, r.name as restaurant
from orders o
join restaurants r on r.id = o.restaurant_id
where o.placed_at >= current_date;
```

`o` and `r` are **aliases** — short names to avoid repeating the table name.

### inner vs left join

```sql
join       -- only rows that have a match in BOTH tables
left join  -- keep all rows from the left table; fill nulls where no match
```

Your `admin_tenants()` function uses `left join` deliberately:

```sql
from restaurants r
left join orders o        on o.restaurant_id = r.id
left join auth.users u    on u.id = r.owner_id
left join profiles p      on p.id = r.owner_id
```

A brand-new restaurant with **zero orders** must still appear in your admin list. With
a plain `join` it would vanish, because there'd be no matching order row.

---

## 6. Aggregation — turning many rows into one number

```sql
count(*)      -- how many rows
sum(total)    -- add them up
avg(total)    -- average
max / min     -- largest / smallest
```

```sql
-- today's revenue and order count for one restaurant
select count(*) as orders, sum(total) as revenue
from orders
where restaurant_id = 'your-uuid'
  and placed_at >= current_date
  and status <> 'cancelled';       -- <> means "not equal"
```

### GROUP BY — one result row per group

```sql
-- revenue per day for the last 7 days
select placed_at::date as day, count(*) as orders, sum(total) as revenue
from orders
where restaurant_id = 'your-uuid'
  and placed_at >= current_date - interval '7 days'
  and status <> 'cancelled'
group by placed_at::date
order by day;
```

- `::date` is a **cast** — it strips the time so all of one day groups together.
- `interval '7 days'` is Postgres date arithmetic.

**The rule for GROUP BY:** every column in your `select` must either be in the
`group by` list or be inside an aggregate function. Postgres will error otherwise —
it wouldn't know which of the grouped values to show.

### FILTER — aggregate only some rows

This is an elegant Postgres feature your `admin_tenants()` uses:

```sql
count(o.id)                       filter (where o.status <> 'cancelled'),
coalesce(sum(o.total), 0)::bigint filter (where o.status <> 'cancelled')
```

It counts and sums **only non-cancelled orders**, while still using the same single
scan of the joined rows. `coalesce(x, 0)` means "if x is null, use 0" — needed
because `sum()` over zero rows returns null, not 0.

---

## 7. Indexes — why your queries stay fast

An index is a lookup structure. Without one, finding matching rows means scanning the
entire table.

```sql
create index if not exists idx_cats_restaurant
  on public.menu_categories(restaurant_id);
```

**The rule:** index the columns you filter or join on. Since every GrOrbit query
filters by `restaurant_id`, every tenant table has an index on it. Without those,
performance would degrade as you add restaurants — each query would scan every
restaurant's rows to find one restaurant's data.

Primary keys are indexed automatically. `unique` constraints create an index too —
which is exactly how migration 017 prevents duplicate restaurants:

```sql
create unique index if not exists uniq_restaurant_per_owner
  on public.restaurants (owner_id)
  where owner_id is not null;      -- a PARTIAL index: ignores null owners
```

Now a second insert for the same owner **fails at the database level**. Bugs in app
code can no longer create duplicates.

---

## 8. JSONB — your `settings` column

Instead of 30 columns for branding, hours, and growth config, you store one JSON
document:

```sql
settings jsonb not null default '{}'::jsonb
```

### Reading inside JSON

Two operators, and the difference matters:

```sql
settings -> 'contact'             -- returns JSON
settings ->> 'about'              -- returns TEXT
settings -> 'contact' ->> 'phone' -- navigate in, then extract as text
```

From your `admin_tenants()`:

```sql
nullif(r.settings->'contact'->>'phone', '')::text
```
- `-> 'contact'` — step into the contact object (still JSON).
- `->> 'phone'` — pull the phone out as text.
- `nullif(x, '')` — turn an empty string into null, so the UI shows "—" rather than blank.

Try it:

```sql
select name,
       settings->'contact'->>'phone'   as phone,
       settings->>'logoUrl'            as logo,
       settings->'growth'->'nextVisit' as reward
from restaurants;
```

### The trade-off you already discovered

JSONB is flexible but **it's one value**. Writing the column replaces the *entire*
document. That's precisely the bug that erased your banner and address: the app wrote
`settings` built from stale localStorage, wiping keys it didn't know about.

The lesson generalises: **with a JSON column you must read-modify-write**, never
blind-write. Your `updateRestaurant` now reads the current JSON from Postgres, merges,
then writes.

Postgres can also merge server-side, which avoids the race entirely:

```sql
-- merge one key without touching the rest
update restaurants
set settings = settings || '{"logoUrl":"https://…"}'::jsonb
where id = 'your-uuid';
```

`||` on jsonb means "merge, right side wins". Worth knowing if you later move these
writes into a database function.

---

## 9. Row Level Security — the most important section for you

Because the browser talks to Postgres directly, **anyone can craft any query**. What
stops a customer reading every restaurant's orders? RLS.

RLS attaches rules to a table. Every query is automatically filtered by them —
invisibly, at the database level, with no way to bypass from the client.

```sql
alter table public.orders enable row level security;
```

Once enabled, **all access is denied** until a policy allows it.

### Reading a policy

```sql
create policy "public storefront"
  on public.restaurants
  for select
  using (status <> 'suspended' or owner_id = auth.uid() or is_superadmin());
```

| Piece | Meaning |
|---|---|
| `for select` | Applies to reads. (Also `insert`, `update`, `delete`, or `all`.) |
| `using (...)` | The condition a row must satisfy to be **visible**. |
| `auth.uid()` | Supabase function: the ID of the currently authenticated user, or null for anonymous. |

In plain English: you can read a restaurant if it isn't suspended (so customers can
load menus), **or** you own it, **or** you're a super-admin.

### `using` vs `with check`

```sql
create policy "owner insert" on public.restaurants
  for insert with check (owner_id = auth.uid());
```

- **`using`** filters rows you're allowed to *see or modify*.
- **`with check`** validates rows you're trying to *write*.

This policy means: you may insert a restaurant only if you set yourself as the owner.
You cannot create a restaurant owned by someone else.

### Helper functions keep policies readable

```sql
create or replace function public.owns_restaurant(rid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from restaurants where id = rid and owner_id = auth.uid()) $$;
```

Then policies across many tables stay short:

```sql
create policy "owner read notifs" on public.notifications
  for select using (owns_restaurant(restaurant_id) or is_superadmin());
```

### `security definer` — and the recursion trap

`security definer` means the function runs with **its author's** privileges, not the
caller's. It's essential here: `is_superadmin()` must read `profiles` to check your
role, but the RLS policy *on* `profiles` might itself call `is_superadmin()` —
infinite recursion. `security definer` lets the function read the table directly,
breaking the loop.

That recursion is exactly what migration **011** fixes, and why super-admin login
fails without it.

**Rule when writing `security definer` functions:** always add
`set search_path = public`. Without it, someone could create a malicious table
earlier in the search path and hijack the elevated function.

---

## 10. GRANT vs RLS — the distinction that cost you hours

These are **two independent layers**, and you need both:

| Layer | Question it answers | Failure message |
|---|---|---|
| **GRANT** | May this role touch this table at all? | `permission denied for table X` |
| **RLS** | Which rows may it see? | (no error — you just get 0 rows) |

GRANT is checked **first**. If the base grant is missing, RLS is never even consulted.

That's why the distinction was so confusing: you had *correct* RLS policies and still
got `permission denied`. The cause was a missing GRANT.

```sql
-- layer 1: may the role use the table?
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated;

-- layer 2 (already in 001): which rows?
-- ... create policy ...
```

### Why a schema rebuild broke it

```sql
drop schema public cascade;
create schema public;
grant all on all tables in schema public to anon, authenticated;   -- ← the trap
```

`grant … on all tables` applies only to tables that exist **at that moment**. The
schema was empty, so it granted nothing. Every table then created by migrations
001–015 had no grant at all.

Migration **016** fixes it and future-proofs it:

```sql
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
```

`ALTER DEFAULT PRIVILEGES` says "anything created here *from now on* gets these
grants automatically". This is why the problem can't recur.

### The two roles

- **`anon`** — an anonymous visitor. Your diners. Can read active menus and insert
  orders, nothing more.
- **`authenticated`** — a logged-in user. Your restaurant owners.

Both are heavily constrained by RLS. The broad grants in 016 are safe *because* RLS
narrows every one of them to the right rows.

---

## 11. Functions — logic that lives in the database

Your `issue_coupon` mints next-visit reward codes. Why in the database rather than
JavaScript? **Because anything in the browser can be edited by the user.** A
client-side check on "have you already claimed this reward?" is not a control.

```sql
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
  if exists (select 1 from issued_coupons
             where source_order = p_order and kind = p_kind) then
    raise exception 'reward already claimed for this order';
  end if;
  v_code := upper(p_kind) || '-' ||
            upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into issued_coupons (restaurant_id, code, kind, discount,
                              customer_phone, source_order, expires_at)
  values (o.restaurant_id, v_code, p_kind, p_discount,
          o.customer_phone, p_order, now() + (p_days || ' days')::interval);
  return v_code;
end $$;

grant execute on function public.issue_coupon(uuid, text, jsonb, int)
  to anon, authenticated;
```

Line by line:

| Line | What it does |
|---|---|
| `returns text` | Hands back the generated code. |
| `language plpgsql` | Procedural SQL — allows variables, `if`, loops. (Plain `language sql` is for single expressions, like your `is_superadmin`.) |
| `declare o record; v_code text;` | Local variables. `record` holds a whole row. |
| `select * into o` | Load the order into the variable. |
| `status not in ('completed','ready')` | **No reward before the food is served.** |
| `raise exception` | Abort **and roll back**. The whole function is one transaction — a failure part-way leaves nothing behind. |
| `if exists (…)` | The duplicate guard: one reward per order per kind, keyed on `source_order`. |
| `md5(random() \|\| clock_timestamp())` | Randomness + time, hashed, first 6 chars → `NEXT_VISIT-A3F9C2`. |
| `now() + (p_days \|\| ' days')::interval` | Build an interval from a number, so `30` becomes 30 days from now. |
| `grant execute … to anon` | **Required.** Customers are anonymous, so the `anon` role must be allowed to call it — the same GRANT layer from section 10, applied to functions. |

### Row locking — how redemption stays safe under concurrency

Its sibling `redeem_coupon` uses a row lock:

```sql
select ... from issued_coupons where code = p_code for update;
```

`for update` **locks that row** until the transaction ends. If two requests try to
redeem the same code at the same instant, the second waits for the first to finish,
then sees it already redeemed and refuses. Without the lock, both could read
"unredeemed" simultaneously and both succeed — the classic double-spend bug. This is
the kind of guarantee you simply cannot get from client-side JavaScript.

### Volatility markers

```sql
language sql stable    -- is_superadmin(): same inputs → same result within a query
language plpgsql       -- issue_coupon(): writes data, so volatile (the default)
```

Marking a read-only function `stable` lets Postgres cache it within a single query —
a real speed-up when it's called from an RLS policy evaluated on every row.

---

## 12. Triggers — code that fires automatically

When someone signs up, Supabase inserts into `auth.users`. You need a matching
`profiles` row. A trigger does that without your app having to remember:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

| Piece | Meaning |
|---|---|
| `returns trigger` | Required signature for a trigger function. |
| `new` | The row being inserted. `new.id` is the new user's ID. |
| `raw_user_meta_data->>'name'` | Pulls the name out of the signup metadata JSON. |
| `on conflict (id) do nothing` | **Idempotency.** If the profile somehow exists, don't error. |
| `after insert … for each row` | Fire once per inserted row, after it lands. |

**The gotcha you hit:** triggers only fire on **new** inserts. Users who existed
*before* this trigger was created never got a profile row — which is why your
pre-existing account had no profile and super-admin login failed.

---

## 13. Transactions

```sql
begin;
  update orders set status = 'completed' where id = '…';
  insert into notifications (...) values (...);
commit;      -- or: rollback;
```

Everything between `begin` and `commit` is **all-or-nothing**. A failure rolls back
the whole block. Functions like `issue_coupon` are automatically one transaction —
which is why a `raise exception` half-way leaves no partial coupon behind.

---

## 14. Queries worth keeping for running GrOrbit

```sql
-- 1. Health: does every owner have exactly one restaurant?
select u.email, count(r.id) as restaurants
from auth.users u
left join restaurants r on r.owner_id = u.id
group by u.email
having count(r.id) <> 1;          -- HAVING filters AFTER grouping

-- 2. Accounts missing a profile row (breaks role/login)
select u.email from auth.users u
left join profiles p on p.id = u.id
where p.id is null;

-- 3. Business summary per restaurant
select r.name,
       count(o.id) filter (where o.status = 'completed')  as completed,
       count(o.id) filter (where o.status = 'cancelled')  as cancelled,
       coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as revenue
from restaurants r
left join orders o on o.restaurant_id = r.id
group by r.name
order by revenue desc;

-- 4. Best-selling items (last 30 days)
select i.name, sum(i.qty) as sold, sum(i.qty * i.price) as revenue
from order_items i
join orders o on o.id = i.order_id
where o.restaurant_id = 'your-uuid'
  and o.placed_at >= now() - interval '30 days'
  and o.status <> 'cancelled'
group by i.name
order by sold desc
limit 10;

-- 5. Reward funnel: issued vs actually redeemed
select count(*) as issued,
       count(redeemed_at) as redeemed,     -- count() skips nulls
       round(100.0 * count(redeemed_at) / greatest(count(*), 1), 1) as pct
from issued_coupons
where restaurant_id = 'your-uuid';

-- 6. Repeat customers
select customer_phone, count(*) as visits, sum(total) as spent
from orders
where restaurant_id = 'your-uuid' and customer_phone <> ''
group by customer_phone
having count(*) > 1
order by visits desc;
```

Query 5 is the one I'd watch most closely during your pilot: **issued vs redeemed**
tells you whether the next-visit reward is actually bringing people back, which is
the core promise of the whole product.

---

## 15. Inspecting your own database

```sql
-- what tables exist?
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;

-- what columns does a table have?
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'orders'
order by ordinal_position;

-- is RLS on, and what policies exist?
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';

select tablename, policyname, cmd, qual
from pg_policies where schemaname = 'public' order by tablename;

-- who has base grants? (the migration-016 check)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name;

-- what indexes exist?
select tablename, indexname from pg_indexes
where schemaname = 'public' order by tablename;
```

These five are your debugging toolkit. When something behaves oddly, they answer
"does the structure actually look how I think it does?" — which is usually where the
answer is.

---

## 16. Safety habits

1. **`select` before you `delete` or `update`.** Run the `where` clause as a `select`
   first and confirm the row count. There's no undo.
2. **`where` on every update.** `update orders set status='completed'` with no `where`
   updates *every order in every restaurant*.
3. **Wrap risky work in a transaction:** `begin;` … inspect … then `commit;` or
   `rollback;`.
4. **Never disable RLS to "fix" a permissions problem.** That exposes every
   restaurant's data to everyone. If access is blocked, the cause is a missing GRANT
   or a policy gap — fix that.
5. **Keep migrations append-only.** Add `018_…`, don't edit `001`. Your database is
   already built from the old file; editing it changes nothing and desyncs your
   history.
6. **Test destructive SQL on a second Supabase project first** once you have real
   restaurant data.

---

## 17. Where to go next

Ranked by usefulness to you specifically:

1. **Window functions** (`row_number() over (partition by …)`) — for "each
   restaurant's top 3 items" style questions in one query.
2. **CTEs** (`with recent as (select …) select … from recent`) — name a subquery to
   make long analytics readable.
3. **`explain analyze <query>`** — shows whether an index was used. Run it if a
   dashboard page ever feels slow.
4. **Database functions for writes** — moving coupon/order logic into Postgres makes
   it tamper-proof, as `issue_coupon` already demonstrates.
5. **Postgres official tutorial** — postgresql.org/docs/current/tutorial.html
6. **Supabase RLS docs** — the most valuable external reading for your architecture,
   since RLS is doing the security work a backend would normally do.

The fastest way to learn from here: open the Supabase SQL Editor and run the queries
in section 14 against your own data. Change the filters, break them, read the errors.
Postgres error messages are unusually good — they normally name the exact column or
constraint at fault.
