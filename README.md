# GrOrbit — Restaurant Growth Platform

A premium SaaS dashboard that helps restaurants **grow** — digital menus, QR ordering,
customer capture, reviews and repeat business. Built with **React + Vite + Tailwind CSS**
and **React Router**, with realistic dummy data so you can run and click through everything
immediately.

Brand `#FF6B35` · Charcoal `#1F2937` · ₹ / Indian formatting · mobile-first.

## Run it (test with dummy data)

```bash
npm install
npm run dev        # open http://localhost:5173
```

- `/`      → marketing landing page
- `/app`   → the dashboard (Overview control center)
- `/admin` → **super-admin (platform) dashboard** — manage all restaurants/tenants (from `/login`, tap **Enter super-admin demo**)
- `/login` → restaurant login / signup (demo: any email & password, or **Continue to demo**)
- `/app/storefront` → manage the customer menu (offers, specials, prep time, about, after-order prompts)
- `/r/:slug` → **customer QR ordering page** (e.g. `/r/spice-junction`) — browse, add to cart, place order, get a token

```bash
npm run build      # production build → dist/
npm run preview    # preview the build
```

> Requires Node.js 18+. All data is in-memory dummy data under `src/data/` — edits reset on
> refresh. No backend or keys needed.

## What's inside (GrOrbit v1 spec)

- **Overview** — widget-based control center: 6 summary cards, live orders (Accept/Ready),
  revenue chart (Today/7d/30d/Custom), best sellers, today's specials, customer mix
  (first-time vs returning), profile completion, quick actions, recent activity.
- **Orders** — Live Orders (token kanban + kitchen display) and Order History.
- **Menu** — Menu Items (search, filters, availability/special toggles, image upload) and
  Today's Specials with a live customer preview.
- **Categories**, **Customers** (CRM + profile drawer), **QR Codes** (PNG/SVG/Print,
  Active/Inactive, preview), **Analytics**, **Notifications**, and tabbed **Settings**.
- **WhatsApp Marketing** — broadcast composer with audience segments & templates, automated
  order/ready/review messages, and a live WhatsApp-style preview.
- **Feedback routing** — after a meal, low ratings (≤3★) are kept private and routed to the
  owner (Notifications + a "Needs attention" list on the Reviews page with a WhatsApp reach-out),
  while 4-5★ are pushed to Google. New customer orders also raise a live notification.
- **Growth** (the channels promised on the landing page) — Review Growth (ratings, feed,
  reply, request more), Social Growth (Instagram/Facebook/WhatsApp followers + in-flow
  prompts), and Coupons & Loyalty (codes, redemptions, tiers, points). Growth widgets also
  appear on the Overview.
- **Apply coupon in cart** — enter a code (e.g. WELCOME10, COMEBACK50) for a live discount; valid codes are the ones managed in Coupons & Loyalty.
- **Spin-to-win while you wait** — during preparation, customers can spin for a next-visit coupon; the reward screen also nudges social follows.
- **Customer ordering app** (`/r/:slug`) — mobile-first menu with veg/non-veg marks, search,
  category tabs, cart with quantity steppers, optional name, **Pay at counter**, a generated
  **token number** with a live status timeline (placed → preparing → ready), and 20-minute
  session expiry — matching the QR ordering flow in the product spec.
- **Login & auth gate** — `/app` is protected by a route guard; unauthenticated users are sent to `/login`. Profile menu shows the logged-in user; **Log out** ends the session and returns to login. (Client-side demo auth — swap for a real backend later.)
- **Orders are wired end-to-end** — placing an order on `/r/:slug` makes it appear live in the
  dashboard's Live Orders (and the Overview widget) via a shared `localStorage` store; when the
  kitchen advances it, the customer's status screen updates too. Open `/r/spice-junction` and
  `/app/orders/live` in two tabs to see it.
- Global search, live notification bell, empty states, and a responsive collapsible sidebar.
- **Landing page** (`/`) — the full animated marketing site: hero growth-loop, scroll story, growth-engine orbit, live impact counters, before/after slider, bento features, ROI calculator, live dashboard preview, pricing and CTA (Framer Motion, lazy-loaded).

## Backend (Supabase)

The app auto-switches from demo mode (localStorage) to a real backend when `.env` is
configured. Schema + seed live in `supabase/`, full walkthrough in
**[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** — orders, auth, storefront settings and
notifications are wired to Postgres + Realtime.

## Documentation

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full folder structure, layering, the
widget-based dashboard design, and where each spec feature lives.

## Project structure (short)

```
src/
├── lib/        theme tokens + format helpers
├── data/       dummy data (menu, orders, customers, categories, notifications)
├── components/
│   ├── ui/       Card, StatCard, Badge, Button, charts… (design system)
│   ├── widgets/  independent dashboard widgets
│   └── layout/   Sidebar, Topbar, DashboardLayout
└── pages/      one component per route (Landing, Overview, orders/*, menu/*, …)
```

## Roadmap (post-v1)

Authentication in front of `/app`, real API behind `data/*`, per-restaurant widget layouts,
and the Promotions / Staff / Reviews / Branches modules.


## Testing

The app ships with a Vitest + Testing Library suite covering the logic stores and a render/interaction smoke test for every page and the customer flow.

```bash
npm test          # run all tests once (37 tests)
npm run test:watch
```
