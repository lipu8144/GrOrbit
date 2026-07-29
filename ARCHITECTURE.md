# GrOrbit — Project Architecture

GrOrbit is a QR-based, in-restaurant ordering platform built as a **multi-tenant SaaS**.
It has three audiences in one codebase:

1. **Customers** — scan a QR, browse the menu, order, get a token, rate & get rewards.
2. **Restaurant owners** — a dashboard to run orders, menu, customers and growth.
3. **Platform admin (GrOrbit)** — a super-admin console to manage every restaurant.

Stack: **React 18 + Vite + Tailwind CSS + React Router 6**, Framer Motion (landing only),
lucide-react icons, and a **Vitest + Testing Library** suite. Backend: **Supabase-ready** — every store is a dual-mode adapter: localStorage in demo
mode, Postgres + Auth + Realtime when `.env` is configured (see §5 and SUPABASE_SETUP.md).

---

## 1. Route map

```
PUBLIC
  /                      Landing page (marketing, animated, lazy-loaded)
  /r/:slug               Customer QR ordering app (lazy-loaded)  e.g. /r/spice-junction
  /login                 Login / signup (owner) + super-admin demo entry

RESTAURANT  (/app/*)  — guarded by <RequireAuth>, wrapped in <DashboardLayout>
  /app                       Overview (widget-based control center)
  /app/orders/live           Live Orders (kanban + kitchen display)
  /app/orders/history        Order History
  /app/menu/items            Menu Items
  /app/menu/specials         Today's Specials
  /app/categories            Categories
  /app/customers             Customers (CRM)
  /app/growth/reviews        Review growth + private-feedback inbox
  /app/growth/social         Social growth
  /app/growth/whatsapp       WhatsApp marketing
  /app/growth/coupons        Coupons & loyalty
  /app/qr                    QR codes (PNG/SVG/print)
  /app/storefront            Storefront editor (what customers see)
  /app/analytics             Analytics
  /app/notifications         Notifications
  /app/settings              Settings (tabbed)

PLATFORM ADMIN  (/admin/*)  — guarded by <RequireAdmin> (role === "superadmin")
  /admin                     Platform overview
  /admin/restaurants         All tenants (suspend / change plan / view)
  /admin/subscriptions       Plans & MRR
  /admin/analytics           Platform analytics
```

Auth/role gating lives in `components/RequireAuth.jsx` and `components/RequireAdmin.jsx`.

---

## 2. Folder structure

```
src/
├── main.jsx                      # entry — <BrowserRouter><App/></BrowserRouter>
├── App.jsx                       # all routes + guards + lazy loading
├── index.css                     # Tailwind layers + shared .qm-* classes/animations
│
├── lib/                          # framework-free logic (see §5)
│   ├── theme.js                  # BRAND, CHARCOAL, ORDER_STATUS, ORDER_TYPE
│   ├── format.js                 # inr(), orderTotal(), fmtClock(), fmtElapsed()
│   ├── coupons.js                # coupon validation + discount math
│   ├── download.js               # CSV / SVG / PNG / print / share / WhatsApp helpers
│   ├── authStore.js              # session auth (login/signup/demo/admin/logout) + useAuth
│   ├── orderStore.js             # customer (QR) orders — source of truth
│   ├── restaurantStore.js        # storefront settings (about, offers, prep, growth)
│   ├── notificationStore.js      # live notifications (new orders, private feedback)
│   └── adminStore.js             # platform tenants + stats (super-admin)
│
├── data/                         # seed/dummy data — swap for an API later
│   ├── menu.js  categories.js  orders.js  customers.js
│   ├── notifications.js  growth.js          # reviews, social, coupons, loyalty
│   └── tenants.js                            # multi-tenant data for super-admin
│
├── components/
│   ├── RequireAuth.jsx           # gate for /app
│   ├── RequireAdmin.jsx          # gate for /admin (role check)
│   ├── ui/
│   │   ├── primitives.jsx        # Card, StatCard, Badge, Button, Toggle, Avatar,
│   │   │                         #   ProgressBar, EmptyState, SectionTitle
│   │   └── charts.jsx            # Sparkline, Bars, GroupedBars, Ring, Donut (pure SVG)
│   ├── widgets/                  # independent, reusable dashboard widgets (§4)
│   │   ├── SummaryCardsWidget, LiveOrdersWidget, RevenueChartWidget,
│   │   ├── BestSellersWidget, TodaysSpecialsWidget,
│   │   ├── OverviewWidgets.jsx   #   RecentActivity, QuickActions, CustomerVerification,
│   │   │                         #   ProfileCompletion
│   │   └── GrowthWidgets.jsx     #   GrowthSummary, ReviewGrowth, SocialGrowth, CouponsLoyalty
│   └── layout/
│       ├── DashboardLayout.jsx   # restaurant shell (sidebar + topbar + <Outlet/>)
│       ├── Sidebar.jsx           # nested nav groups, active states, badges
│       └── Topbar.jsx            # global search, notification bell, switcher, profile/logout
│
└── pages/
    ├── Landing.jsx  Login.jsx
    ├── Overview.jsx              # composes widgets only
    ├── orders/{LiveOrders, OrderHistory}.jsx
    ├── menu/{MenuItems, TodaysSpecials}.jsx
    ├── Categories.jsx  Customers.jsx  QRCodes.jsx  Storefront.jsx
    ├── Analytics.jsx  Notifications.jsx  Settings.jsx
    ├── growth/{Reviews, Social, WhatsApp, Coupons}.jsx
    ├── customer/Menu.jsx         # the whole QR ordering experience
    └── admin/{AdminLayout, AdminOverview, Restaurants, AdminPages}.jsx

src/test/                         # Vitest + Testing Library
    ├── setup.js                  # jsdom stubs (canvas, clipboard, matchMedia)
    ├── stores.test.jsx           # unit tests for every lib store
    └── components.test.jsx       # render + interaction tests for every page
```

### Dependency direction
`pages → widgets/layout → ui → lib/data`. Lower layers never import upward, so the
design-system atoms and logic helpers stay reusable and testable.

---

## 3. The three surfaces

**Customer (`pages/customer/Menu.jsx`)** — a single self-contained mobile-first app:
menu with veg/non-veg marks, search, category tabs, offers & specials banner (from the
Storefront), cart with quantity steppers + coupon apply, optional name/phone capture,
order placement → token + live status timeline, a spin-to-win game during the wait, and a
post-meal review screen that routes 4-5★ to Google and ≤3★ privately to the owner. A 20-min
inactivity timer expires the session.

**Restaurant (`/app`)** — `DashboardLayout` (collapsible sidebar + topbar) wraps every page.
The Overview is widget-based (§4); other pages manage orders, menu, customers, growth, QR,
storefront and settings.

**Platform admin (`/admin`)** — `AdminLayout` (distinct dark sidebar) wraps the tenant
console. Reads/writes `adminStore`.

---

## 4. Widget-based dashboard

The Overview is composition only — each card is an independent component in
`components/widgets/` that owns its own data/state and has no required props, so widgets can
be rearranged, reused, or made user-toggleable later without touching the others.

```jsx
// pages/Overview.jsx
<SummaryCardsWidget />
<LiveOrdersWidget />        <ProfileCompletionWidget />
<RevenueChartWidget />
<BestSellersWidget /> <TodaysSpecialsWidget /> <CustomerVerificationWidget />
<QuickActionsWidget />
<GrowthSummaryWidget />  + Review / Social / Coupons growth widgets
<RecentActivityWidget />
```

---

## 5. State & "dummy storage"

There is no server yet. Each domain has a tiny store in `lib/` backed by `localStorage`,
exposing plain functions + a React hook and a cross-tab `storage` subscription:

| Store | Owns | Key hook |
|-------|------|----------|
| `authStore` | session + role (owner / superadmin) | `useAuth()` |
| `orderStore` | customer-placed (QR) orders + status | `usePlacedOrders()` |
| `restaurantStore` | storefront settings | `useRestaurant()` |
| `notificationStore` | live notifications + feedback | `useLiveNotifications()` |
| `adminStore` | platform tenants + stats | `useTenants()` |

**Why this matters:** the customer app and the dashboard talk through `orderStore`, so an
order placed at `/r/:slug` appears live in `/app/orders/live`, and a status change there
flows back to the customer's screen (cross-tab via the `storage` event). Swapping any store
for a real API (Supabase / Node + Postgres) is a contained change — the UI only depends on
the hook + functions, not on `localStorage`.

Static seed data (menu, customers, tenants, growth) lives in `data/`. Stores seed from there
on first run.

---

## 6. Theming & styling

Brand tokens live once in `lib/theme.js` (`BRAND #FF6B35`, `CHARCOAL #1F2937`) and as CSS
variables in `index.css`. Components apply the exact brand colour via inline styles so the
look never depends on Tailwind's arbitrary-value JIT. Shared animation/utility classes are
namespaced `.qm-*` (`qm-btn-primary`, `qm-focus`, `qm-slide`, `qm-pulse`, `qm-pop`,
`qm-spin`). The landing page uses its own coral (`#FF6B4A`) from its source design and is the
only place using Framer Motion (lazy-loaded so it never weighs down the app).

---

## 7. Build, run & test

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview
npm test           # Vitest suite (37 tests: stores + every page renders)
npm run test:watch
```

Node 18+. SPA fallback (`/* → /index.html`) is provided via `public/_redirects` so deep
links like `/app/orders/live` and `/admin/restaurants` work on static hosts.

---

## 8. Testing

`src/test/` uses Vitest + Testing Library + jsdom:
- **stores.test.jsx** — unit tests for auth, orders, notifications, restaurant settings,
  admin tenants, coupon math and formatting.
- **components.test.jsx** — renders all 21 pages without crashing, renders layout
  components, and exercises real interactions (add-to-cart + checkout, add category, create
  coupon, save storefront, admin tables).

---

## 9. Roadmap (to production)

1. **Backend** — replace the `lib/*Store` modules with a real API (Supabase or Node +
   Postgres). Tables roughly map 1:1 to the stores: `users`, `restaurants` (tenants),
   `menu_categories`, `menu_items`, `orders`, `order_items`, `sessions`, `coupons`.
2. **Realtime** — swap the cross-tab `storage` events for Socket.io / Supabase realtime.
3. **Real auth** — proper credentials, sessions and the role gate enforced server-side.
4. **Integrations** — WhatsApp Business API, Google review deep-links, payments (UPI/Razorpay).
