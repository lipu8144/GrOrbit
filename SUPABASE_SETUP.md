# GrOrbit — Supabase Setup Guide

The app runs in two modes:

| Mode | When | Data |
|------|------|------|
| **Demo** | no `.env` (default) | localStorage, seeded dummy data |
| **Remote** | `.env` filled in | Supabase Postgres + Auth + Realtime |

Switching is automatic — no code changes.

---

## 1. Create the project (5 min)

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. Pick a region close to your users (e.g. `ap-south-1` Mumbai for India).
3. Wait for provisioning, then open **SQL Editor**.

## 2. Run the migrations

1. SQL Editor → **New query** → paste the whole of
   `supabase/migrations/001_init.sql` → **Run**.
   This creates all tables, indexes, RLS policies, the daily token counter
   function, and enables Realtime on `orders` + `notifications`.
2. New query → `supabase/migrations/002_coupon_issuance.sql` → **Run**
   (unique phone-bound reward codes + atomic redemption).
3. New query → `supabase/migrations/003_coupon_check_and_guard.sql` → **Run**
   (apply-time validation without burning the code, spin-time issuance, and
   the order **spam guard** that throttles QR abuse).
4. New query → `supabase/migrations/004_dashboard_functions.sql` → **Run**
   (admin tenant stats + customers derived from real orders).
5. New query → `supabase/migrations/005_menu_realtime.sql` → **Run**
   (menu edits push live to open customer pages).
6. New query → `supabase/migrations/006_storage.sql` → **Run**
   (creates the public `menu-images` bucket + upload policies for photos).
7. New query → `supabase/migrations/007_attach_phone.sql` → **Run**
   (late phone capture at reward moments — fills only EMPTY phones).
8. New query → `supabase/migrations/008_qr_scans.sql` → **Run**
   (real QR scan counting for the dashboard).
9. New query → `supabase/migrations/009_settings_realtime.sql` → **Run**
   (storefront edits push live to open customer pages).
10. New query → `supabase/migrations/010_menu_session.sql` → **Run**.
11. New query → `supabase/migrations/011_fix_profile_rls.sql` → **Run**
    (fixes a role-read recursion — REQUIRED for super-admin login to work).
12. New query → `supabase/migrations/012_admin_users_audit.sql` → **Run**
    (super-admin Users page + tenant-view audit log).
13. New query → `supabase/migrations/013_admin_contacts.sql` → **Run**
    (owner phone/email in the super-admin tenant list).
14. New query → paste `supabase/seed.sql` → **Run** *(optional — demo data)*.
   This seeds the demo restaurant **Spice Junction** (`/r/spice-junction`)
   with its menu and coupons.

## 3. Connect the app

1. Supabase dashboard → **Settings → API**. Copy the *Project URL* and the
   *anon public* key.
2. In the project root:
   ```bash
   cp .env.example .env
   ```
   and fill in:
   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_RESTAURANT_ID=00000000-0000-0000-0000-000000000001
   ```
3. Restart the dev server (`npm run dev`). The app is now in remote mode.

## 3b. Auth URLs (required for signup confirmation)

Supabase → **Authentication → URL Configuration**:
- **Site URL**: your app's address (`http://localhost:5173` in dev, your domain in prod)
- **Redirect URLs**: add `http://localhost:5173/auth/callback` (and later
  `https://yourdomain.com/auth/callback`)

With email confirmation ON (Authentication → Providers → Email), the signup
flow is: sign up → **Confirm your email** screen → click the emailed link →
lands on `/auth/callback` → your restaurant is created → dashboard opens.

## 3c. Multi-tenancy — how new restaurants work

Every signup gets its **own empty restaurant** (created automatically at first
login/confirmation, named from the signup form). The dashboard always shows
the logged-in owner's restaurant; the customer page resolves the restaurant
from the QR link's `/r/:slug`. The seeded Spice Junction is only for the demo
`VITE_RESTAURANT_ID` and anyone you attach to it.

## 4. Verify it works — one command

```bash
npm run check:supabase
```

This connects to YOUR project and checks everything the app needs:
keys valid → tables exist → seed data present → coupon RPCs (002/003)
installed → an order can be placed (spam-guard trigger fires) → Realtime
subscribes. Every failure prints a hint for the exact fix. The dashboard
sidebar also shows a **Live / Demo** badge so you always know which mode
the app is running in.

## 5. Create your account & attach the restaurant

1. In the app, go to `/login` → **Create an account** (this is real Supabase
   Auth now; if email confirmation is on, confirm first — or turn it off in
   *Authentication → Providers → Email* for development).
2. Back in the SQL Editor, attach the seeded restaurant to your user and
   (optionally) make yourself super-admin:
   ```sql
   update public.restaurants
     set owner_id = (select id from auth.users where email = 'YOUR_EMAIL')
     where slug = 'spice-junction';

   update public.profiles set role = 'superadmin'
     where id = (select id from auth.users where email = 'YOUR_EMAIL');
   ```

## 6. Verify the realtime loop

Open two windows:
- `/r/spice-junction` — place an order.
- `/app/orders/live` — it appears via **Supabase Realtime** (check the row in
  *Table editor → orders* too). Advance it in the kanban; the customer's
  status screen updates. This now works **across devices**, not just tabs.

---

## What's wired to Supabase in this phase

| Area | Status |
|------|--------|
| Orders + order items (place, live board, status, history rows) | ✅ Postgres + Realtime |
| Auth (signup / login / logout, role from `profiles`) | ✅ Supabase Auth |
| Storefront settings (about, offers, prep time, growth prompts) | ✅ `restaurants.settings` jsonb |
| Notifications (new order / private feedback) | ✅ dual-written to `notifications` |
| Coupons (apply in cart, spin rewards) | ✅ static codes from `coupons` table; personal codes checked via `check_coupon`, burned atomically via `redeem_coupon`; spin mints real codes via `issue_coupon` |
| Menu & categories (dashboard CRUD ↔ customer menu) | ✅ Postgres + Realtime — owner edits appear on OPEN customer pages instantly |
| Order history | ✅ reads completed/cancelled orders from Postgres |
| Notifications (read + mark read + realtime) | ✅ Postgres + Realtime |
| Customers (CRM) | ✅ derived live from real orders (`restaurant_customers`) |
| Super-admin tenants (list, plan, suspend) | ✅ `admin_tenants()` + restaurant updates |
| Image uploads (menu photos, banner, logo) | ✅ Supabase Storage `menu-images` bucket → public URL saved on the record |
| Auth extras | ✅ email-exists check, strong-password rules, forgot/reset password flow |
| Super-admin tenant list | schema ready; UI still demo data (next phase) |

## Security notes (before real launch)

- RLS is enabled on every table. Owners can only touch their own restaurant.
- Customers (anon) can insert orders and read an order **by its uuid** —
  unguessable but not private; tighten with a signed claim token later.
- Never expose the `service_role` key in the frontend; only the anon key.
- Turn on email confirmation + rate limits in Supabase Auth for production.

## Load reality check

20,000 API calls/day ≈ 0.23 req/s average (~2–5 req/s at meal-time peaks).
Supabase free tier comfortably handles this; Realtime replaces polling so the
call count stays low. Verify with k6/autocannon once deployed.

14. New query → `supabase/migrations/014_resend_coupon.sql` → **Run**
    (lets customers recover a lost reward code by phone).

15. New query → `supabase/migrations/015_order_cleared.sql` → **Run**
    (lets the restaurant clear completed/cancelled orders off the live
    board without deleting them — they stay in history & analytics).

16. New query → `supabase/migrations/016_grants.sql` → **Run** (LAST).
    Grants the API roles base access to the migration-created tables. Without
    this you get "permission denied for table …" even though RLS is correct.
    This step is REQUIRED after any `drop schema public cascade` rebuild.

## WhatsApp Business API (optional, live sends)
The WhatsApp Marketing page works without setup using free wa.me links.
To send real broadcast campaigns, the restaurant adds their own Meta
WhatsApp Cloud API credentials (Growth → WhatsApp → Add credentials):
phone number ID + access token, plus Meta-approved message templates.
No credentials = free wa.me fallback; credentials present = live sends.
