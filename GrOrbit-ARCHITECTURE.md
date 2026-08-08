# GrOrbit — Architecture & Code Reference

A complete map of the codebase: what every module does, what every function does,
and line-by-line explanations of the tricky logic (the places where real bugs lived).

**Codebase size:** ~11,830 lines · 113 exported functions in `src/lib` · 27 pages · 17 SQL migrations

---

## Part 1 — The big picture

### What the app is

One React application serving **three completely different audiences**:

| Surface | Route | Who uses it | Auth |
|---|---|---|---|
| **Customer menu** | `/r/:slug` | Diners scanning a QR | None (anonymous) |
| **Restaurant dashboard** | `/app/*` | Restaurant owner/staff | Logged in (`RequireAuth`) |
| **Platform admin** | `/admin/*` | You (GrOrbit operator) | Logged in + `role='superadmin'` |

Plus public pages: `/` (landing), `/login`, `/reset-password`, `/confirm-email`,
`/auth/callback`, `/health` (diagnostics).

### The tech stack and why

- **React 18 + Vite** — Vite gives instant dev reloads and a small production bundle.
- **React Router 6** — client-side routing; `vercel.json` rewrites all paths to
  `index.html` so deep links like `/r/my-cafe` work on refresh.
- **Tailwind CSS** — styling via utility classes, no separate CSS files to manage.
- **Supabase** — Postgres database + authentication + file storage + realtime, all in one.
  Chosen so there is **no backend server to write or host**: the browser talks to
  Postgres directly, and Postgres itself enforces security via RLS (see Part 5).
- **Vitest + Playwright** — 114 unit/integration tests and 4 browser journeys.

### The single most important architectural idea: dual-mode stores

Every data module in `src/lib` works in **two modes with an identical public API**:

```
DEMO MODE  (no .env keys)  → localStorage is the source of truth
REMOTE MODE (Supabase set) → Postgres is the source of truth, live via Realtime
```

`REMOTE` is a boolean exported from `supabaseClient.js`. Every store branches on it.

**Why this matters:** the UI never knows which mode it's in. You can develop and run
the whole test suite with no database, and the same components work against live
Postgres in production.

**The danger it created (and the bug class it caused):** every store holds demo
seed data *and* live data paths. If a value isn't explicitly guarded with `REMOTE`,
demo data leaks into a real restaurant's dashboard. This caused the "Spice Junction
/ 142 orders / ₹38,420" bugs. The rule now enforced by tests:

```js
// WRONG — leaks demo data when the live fetch returns nothing
const cards = liveData ?? DEMO_CARDS;

// RIGHT — live mode shows honest zeros, demo mode shows samples
const cards = liveData ?? (REMOTE ? [] : DEMO_CARDS);
```

### Data flow, end to end

```
Customer scans QR
  → /r/:slug loads
  → CustomerMenuResolver looks up restaurant by slug   (public read, RLS-allowed)
  → checks: suspended? closed? scan-session expired?
  → setRid(restaurant.id)                              ← tenant is now pinned
  → menu items + categories fetched for that rid
  → customer builds cart → placeOrder()
      → INSERT into orders + order_items
      → Supabase Realtime pushes the new row
  → Owner's dashboard receives it, chime fires
  → Owner marks preparing → ready → completed
      → each UPDATE broadcasts back to the customer's phone
  → Customer sees green "ready to collect", then feedback screen
  → Review click → issue_coupon() mints a personal next-visit code
```

---

## Part 2 — Module reference (`src/lib`)

### `supabaseClient.js` (52 lines) — the foundation

Creates the Supabase connection and owns the concept of "which restaurant are we
operating on" (the *tenant*). Everything else depends on this.

| Export | What it does |
|---|---|
| `sb` | The Supabase client. `null` if env keys are absent. |
| `REMOTE` | `!!sb` — true when a real database is configured. Every store branches on this. |
| `DEFAULT_RESTAURANT_ID` | Placeholder UUID `00000000-…0001`, used before a real tenant resolves. |
| `rid()` | Returns the current tenant's restaurant ID. Called by nearly every query. |
| `setRid(id)` | Switches the tenant and notifies listeners so stores refetch. |
| `onTenantChange(fn)` | Subscribe to tenant switches (stores use this to clear caches). |
| `hasRealTenant()` | **Guard.** False if still on the placeholder ID. |
| `reportError(msg)` | Fires a `qm-error` event → red toast in the dashboard. |
| `reportSuccess(msg)` | Fires a `qm-success` event → green toast. |
| `requireTenant(action)` | **Guard.** Refuses a write and shows a message if no real tenant. |

#### Line-by-line: the tenant guard that fixed silent save failures

```js
export function hasRealTenant() {
  return !REMOTE || (!!currentRid && currentRid !== "00000000-0000-0000-0000-000000000001");
}
```
- `!REMOTE ||` — in demo mode there's no tenant concept, so always allow.
- `currentRid !== "0000…0001"` — the placeholder means "we don't know the real
  restaurant yet".

**Why this exists.** Postgres treats `UPDATE … WHERE id = <nonexistent>` as
**success with 0 rows affected**, not an error. So a save against the placeholder ID
returned no error, the UI showed no problem, and nothing was written. Restaurant
names silently reverted, categories vanished, QR slugs stayed empty. This guard plus
`.select()` verification (see `restaurantStore`) closed that whole class of bug.

```js
export function requireTenant(action = "save") {
  if (hasRealTenant()) return true;
  reportError(`Can't ${action} yet — your restaurant isn't linked to this session.
               Log out and log back in, then try again.`);
  return false;
}
```
Called at the top of every remote write. Returns false and *tells the user* rather
than failing invisibly.

---

### `authStore.js` (177 lines) — login, session, tenant binding

Wraps Supabase Auth and maintains a **local mirror** of the session at
`localStorage["qm_auth_v1"]`, so the UI can render instantly without waiting on a
network round-trip.

| Function | What it does |
|---|---|
| `login(email, pw)` | Signs in; returns the user's `role` so the caller can route to `/admin` or `/app`. |
| `signup(...)` | Creates the account; a DB trigger creates the `profiles` row. |
| `mirrorSession(user)` | Reads `role` from `profiles`, calls `ensureRestaurant`, calls `setRid`. **The hinge of the whole app.** |
| `ensureRestaurant(user)` | Finds the owner's restaurant, or creates one (+ a starter category). |
| `patchSession(patch)` | Updates the local mirror (e.g. after a rename). |
| `requestPasswordReset(email)` | Sends the reset email (needs the Auth redirect URL configured). |
| `updatePassword(pw)` | Changes the password for the signed-in user. |
| `getUser()` / `isAuthed()` / `useAuth()` | Read the mirror; the hook re-renders on change. |
| `logout()` | Supabase `signOut()` + clears the mirror. Does **not** affect customers. |
| `demoLogin()` / `adminLogin()` | Demo-only shortcuts, hidden in live mode. |

#### Line-by-line: `ensureRestaurant` and the duplicate-restaurant bug

```js
const { data: mine, error } = await sb.from("restaurants")
  .select("id, slug, name").eq("owner_id", user.id).limit(1);
if (error) { console.error("restaurant lookup:", error.message); return null; }
if (mine?.length) return mine[0];
```
- Look for a restaurant this user already owns.
- **`if (error) … return null;` is critical.** Originally a failed lookup fell
  through to the INSERT below. During the "permission denied" period, lookups failed
  → the code created a *second* restaurant for an owner who already had one. That's
  why the admin dashboard showed the same restaurant twice, and why one login saw an
  empty restaurant with no banner while the real data sat on the other row.
- Migration `017` now adds a unique index so this is impossible at the database level.

```js
if (e2) {
  const { data: retry } = await sb.from("restaurants")
    .select("id, slug, name").eq("owner_id", user.id).limit(1);
  return retry?.length ? retry[0] : null;
}
```
If the INSERT fails, another tab may have won the race — re-check instead of leaving
the session with no restaurant.

#### Line-by-line: session self-heal

```js
sb.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") { if (read()?.remote) write(null); }
  else if (session?.user && !read()) mirrorSession(session.user);
  else if (session?.user && read()?.restaurantId) setRid(read().restaurantId);
  else if (session?.user) mirrorSession(session.user);   // ← self-heal
});
```
The last branch was missing originally. A cached session **with a user but no
`restaurantId`** matched none of the earlier branches, so the app stayed on the
placeholder tenant forever — producing the demo name in the topbar, an empty QR
slug, and 403 errors on order queries. Now that state re-runs setup automatically.

---

### `restaurantStore.js` (201 lines) — settings, branding, business rules

Owns the `settings` JSONB column: name, contact, hours, ordering rules, growth
config (social links, next-visit reward), logo and banner URLs.

| Function | What it does |
|---|---|
| `DEFAULT_SETTINGS` | Rich demo settings (Spice Junction sample data). **Demo mode only.** |
| `NEUTRAL_SETTINGS` | Empty skeleton for live tenants. |
| `getRestaurant()` | Returns settings; on first call starts the fetch + realtime subscription. |
| `useRestaurant()` | Hook version, re-renders on change. |
| `updateRestaurant(patch)` | Merges a patch into settings and persists it. |
| `updateRestaurantName(name)` | Updates the `name` **column** (not settings) + syncs the session mirror. |
| `updateMenuSessionMins(n)` | Updates the `menu_session_mins` column. |

#### Line-by-line: `read()` and the demo-branding leak

```js
function read() {
  const base = REMOTE ? NEUTRAL_SETTINGS : DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return base;
    return { ...base, ...raw,
             contact: { ...base.contact, ...raw.contact },
             growth:  { ...base.growth,  ...raw.growth } };
  } catch { return base; }
}
```
- **Line 1 is the fix.** It used to be hardcoded to `DEFAULT_SETTINGS`, so a real
  restaurant inherited Spice Junction's phone number, address and offers underneath
  its own data.
- The nested spreads on `contact` and `growth` ensure that when you add a new
  default key later, existing saved data picks it up instead of showing `undefined`.

#### Line-by-line: `updateRestaurant` — the data-erasure bug

The dangerous original:

```js
const next = { ...read(), ...patch };                    // read() = localStorage
sb.from("restaurants").update({ settings: next })        // overwrites ENTIRE column
```
`settings` is one JSON blob. Writing it replaces **everything**. `read()` came from
localStorage, so any stale or partial local copy — new device, second tab, cleared
site data — overwrote the database with less than it contained. That is exactly how
banners, logos and addresses disappeared when saving something unrelated.

The fix:

```js
const { data: cur } = await sb.from("restaurants")
  .select("settings").eq("id", rid()).maybeSingle();     // 1. read the DB
const merged = { ...(cur?.settings || {}), ...patch };   // 2. merge onto DB truth
for (const key of ["contact", "growth", "ordering", "closedDays"]) {
  if (patch[key] && typeof patch[key] === "object" && !Array.isArray(patch[key])) {
    merged[key] = { ...(cur?.settings?.[key] || {}), ...patch[key] };   // 3. deep merge
  }
}
const { data, error } = await sb.from("restaurants")
  .update({ settings: merged }).eq("id", rid()).select("id");            // 4. verify
if (!data || data.length === 0) return reportError("…wasn't found for your account.");
write({ ...read(), ...merged });                                        // 5. resync
```
1. **Read current DB state** — never trust localStorage as the base for a write.
2. Shallow-merge the patch on top.
3. **Deep-merge nested objects**, so patching `contact.phone` doesn't delete
   `contact.address`.
4. `.select("id")` returns matched rows — **0 rows means the write silently did
   nothing**, which we now surface as an error.
5. Re-sync the local copy with what's actually stored.

#### Line-by-line: `rFetch` and "one restaurant loads, another doesn't"

```js
const { data, error } = await sb.from("restaurants")
  .select("settings, menu_session_mins").eq("id", rid()).maybeSingle();
if (error) { reportError(`Couldn't load your restaurant settings: ${error.message}`); return; }
if (!data)  { reportError("…this restaurant wasn't found for your account."); return; }
```
- Originally `.single()`, which **throws when it matches zero rows**, and the handler
  only did `console.error(...)` then returned. Result: a blank dashboard with no
  explanation — indistinguishable from "my data was deleted".
- `maybeSingle()` + explicit user-visible errors makes the real cause obvious.

---

### `orderStore.js` (271 lines) — the live order pipeline

The busiest module. Maintains an in-memory cache of today's orders, kept fresh by
Supabase Realtime, and exposes hooks the dashboard and customer both subscribe to.

| Function | What it does |
|---|---|
| `placeOrder(partial)` | Creates an order + its items. Optimistically updates the cache first. |
| `updateOrderStatus(id, status)` | Moves an order through new → preparing → ready → completed. |
| `removeOrder(id)` | "Mark paid & clear" — sets `cleared_at` rather than deleting. |
| `fetchOrderById(id)` | Authoritative single-order read (used by the customer's phone). |
| `getPlacedOrders()` / `getPlacedOrder(id)` | Synchronous cache reads. |
| `usePlacedOrders()` | Hook: the live order board. |
| `usePlacedOrder(id)` | Hook: one order, live. |
| `useSessionOrders(ids)` | Hook: the customer's own orders, live + polled. |
| `useOrderHistory()` | Completed/cancelled orders for the history page. |
| `subscribe(fn)` | Low-level change subscription. |

#### Line-by-line: `placeOrder`

```js
const id = (globalThis.crypto?.randomUUID?.() || "qr_" + Date.now());
```
Generate the ID **client-side** so the optimistic cache entry and the database row
share an ID — no reconciliation needed when the insert returns.

```js
status: (() => {
  try { return JSON.parse(localStorage.getItem("qm_restaurant_v1"))
               ?.ordering?.autoAccept ? "preparing" : "new"; }
  catch { return "new"; }
})(),
```
Reads the `autoAccept` setting **straight from localStorage instead of importing
`restaurantStore`**. Deliberate: `orderStore ↔ restaurantStore ↔ adminStore` would
form a circular import that breaks the bundle. Reading the raw key sidesteps it.

```js
cache = [order, ...cache]; notify();     // optimistic — UI updates immediately
sb.from("orders").insert({ … }).then(({ error }) => {
  if (error) { console.error("place order:", error.message); return; }
  return sb.from("order_items").insert(order.items.map(…));
})
```
- **Optimistic update:** the customer sees their order instantly; the network catches up.
- **Two inserts:** the order header, then its line items (a separate table).
- `subtotal` / `discount` / `coupon_code` / `total` are all stored, so the dashboard
  can show the discount line and revenue reflects the **post-discount** amount.
  Getting this wrong previously overstated revenue — a real money bug.

#### Line-by-line: `updateOrderStatus`

```js
cache = cache.map((o) => (o.id === id ? { ...o, status } : o));
```
Creates a **new object** (`{...o, status}`) rather than mutating. React compares by
reference; mutating in place means the UI never re-renders.

#### Line-by-line: `useSessionOrders` — the tray that wouldn't update

```js
const board = usePlacedOrders();          // fires on every realtime change
useEffect(() => {
  const t = setInterval(() => setTick((n) => n + 1), 6000);   // safety net
  return () => clearInterval(t);
}, [key]);

useEffect(() => {
  Promise.all(ids.map((id) => REMOTE
    ? fetchOrderById(id).catch(() => getPlacedOrder(id) || null)
    : Promise.resolve(getPlacedOrder(id))))
    .then((list) => { if (alive) setOrders(list.filter(Boolean)); });
}, [key, board, tick]);
```
- Depends on `board`, so any realtime event re-resolves the list.
- **The 6-second poll is a deliberate safety net.** Realtime websockets drop or lag
  on mobile networks — that's why the customer's order list "needed a second tap".
  Polling guarantees the status catches up without any interaction.
- In remote mode it always **fetches the authoritative row**, because the status was
  changed on a *different device* (the kitchen dashboard) and may not be in this
  device's cache.

#### The read-only guard

```js
function readOnlyBlocked() {
  if (isImpersonating() && !canEditImpersonated()) {
    window.dispatchEvent(new CustomEvent("qm-readonly"));
    return true;
  }
  return false;
}
```
When you (super-admin) view a restaurant, every mutation is blocked unless you
explicitly enable edit mode. Prevents accidentally modifying a real customer's live
restaurant while investigating.

---

### `menuStore.js` (205 lines) — items and categories

| Function | What it does |
|---|---|
| `saveItem(data)` | Insert or update a menu item. |
| `duplicateItem(item)` | Copy an item (`special` reset to false). |
| `removeItem(id)` / `setItemStatus(id, s)` | Delete / activate-deactivate. |
| `addCategory({name, emoji})` | Create a category (max 100). |
| `renameCategory(id, name)` | Rename only. |
| `setCategoryEmoji(id, emoji)` | Change the icon of an existing category. |
| `toggleCategory(id)` / `deleteCategory(id)` / `moveCategory(id, dir)` | Visibility, delete, reorder. |
| `getMenuItems()` / `useMenuItems()` / `useMenuCategories()` | Reads + hooks. |
| `normalisePortions(raw)` | Defensively cleans the `portions` jsonb into `[{label, price}]`. |
| `normaliseAddons(raw)` | Same cleaner for `addons`; also drops duplicate labels. |

#### Portions (half plate / full plate)

An item optionally carries portions:

```json
[{"label": "Half", "price": 90}, {"label": "Full", "price": 160}]
```

An empty array means a single-price item using `menu_items.price` — so every
pre-existing item is unaffected. Labels are free text, covering "Small/Large",
"250ml/500ml", whatever the restaurant actually says.

`normalisePortions` runs on **both** read and write, in **both** modes. It coerces
prices to numbers and drops entries with a blank label or invalid price, so a
malformed jsonb write can never break the customer menu render.

**Cart keying.** A cart entry is keyed by item id alone for portionless items
(unchanged), or `"<id>::<label>"` when a portion is chosen:

```js
const cartKey = (id, label) => (label ? `${id}::${label}` : String(id));
```

Two details that matter:
- The line's price comes from the **chosen portion**, not `item.price`. If the owner
  renames or deletes that portion mid-session, the line is dropped rather than
  charged at a stale price.
- The cart drawer's React `key` must include the portion — two portions of one dish
  share an item id and would otherwise collide.

**Order lines** fold the portion into the name (`"Dal Fry (Half)"`) so the kitchen
ticket, the bill, and the customer's order list all read correctly with no extra
plumbing.

#### Add-ons (modifiers)

The industry separates two concepts, and GrOrbit follows that split:

| | Portions (018) | Add-ons (019) |
|---|---|---|
| Meaning | mutually exclusive **sizes** | optional **extras** |
| Selection | pick exactly one | pick any number |
| Pricing | **absolute** — replaces the base | **delta** — added on top |
| Example | Half ₹90 / Full ₹160 | Extra cheese +₹30 |
| One entry valid? | No — blocked | Yes |

Sizes are absolute because a half plate isn't reliably "full minus a fixed
amount"; margins differ per size. Extras are deltas because the same extra costs
the same on any size.

**Cart key** carries all three parts, with add-on labels **sorted** so that
picking {Egg, Cheese} and {Cheese, Egg} produce the same key and merge into one
line rather than two:

```js
const cartKey = (id, portion, addons) => {
  const a = (addons || []).slice().sort();
  if (!portion && a.length === 0) return String(id);   // plain item — unchanged
  return `${id}::${portion || ""}::${a.join("|")}`;
};
```

`::` and `|` are separators, so the editor rejects labels containing them.

**One card, one sheet.** Every menu item renders through a single `ItemRow` with
an identical shape — image right, ADD button floating on the image edge. Only the
tap behaviour differs:

| Item has | Tapping ADD |
|---|---|
| nothing | adds straight to the cart, then shows a stepper |
| portions and/or add-ons | opens `CustomiseSheet` |

An earlier version gave portions their own inline layout and add-ons a third
one — three card shapes on one menu, which read as inconsistent and made
portioned items several times taller than their neighbours. Unifying cost one
extra tap for portions and removed two whole components.

A hint line under the description ("Half · Full", "2 extras available") tells the
customer what's inside before they tap, so ADD is never a surprise.

#### Line-by-line: `saveItem` and the vanishing photos

```js
const row = { restaurant_id: rid(), name: data.name, description: data.desc || "",
              price: data.price, food_type: data.type,
              category_id: catIdByName(data.category),
              status: data.status || "active",
              popular: !!data.popular, special: !!data.special };

if (data.image !== undefined) row.image_url = data.image || "";
```
The last line used to be unconditional: `image_url: data.image || ""`. Any save
where the form hadn't populated `data.image` (mid-upload, partial edit, stale form
state) wrote an **empty string over the existing photo**. Now the column is only
touched when a value is actually supplied — absence means "leave it alone".

```js
if (!requireTenant("save this item")) return;
```
Every remote write starts with this guard (see `supabaseClient`).

---

### `coupons.js` (161 lines) — discounts, identity, rewards

Two distinct coupon systems live here:

1. **Marketing coupons** — the owner creates them by hand in Growth → Coupons.
   One shared code (`SUMMER20`) anyone can use.
2. **Next-visit rewards** — auto-minted, one unique code per customer, bound to
   their phone, single-use, expiring.

| Function | What it does |
|---|---|
| `computeDiscount(coupon, subtotal)` | Calculates ₹ off from a flat or percent rule. |
| `validateCoupon(code, subtotal, phone)` | Demo-mode validation. |
| `validateCouponRemote(code, phone, subtotal)` | Live validation via RPC (checks expiry, min order, prior use). |
| `redeemCouponRemote(code, phone, subtotal)` | Atomically marks a coupon used. |
| `issueCouponRemote(orderId, kind, discount, days)` | Mints a new personal coupon via the `issue_coupon` RPC. |
| `publicCoupons()` | The restaurant's active marketing coupons, for the customer cart. |
| `myActiveCoupons(phone)` | Lost-code recovery by phone number. |
| `visitInfoRemote(phone)` / `countVisits(ts)` / `hasPriorOrderRemote(phone)` | Repeat-customer detection. |
| `attachPhoneRemote(orderId, phone)` | Adds a phone to an existing order (the reward capture moment). |

#### Why validation and redemption live in the database

```js
export async function issueCouponRemote(orderId, kind, discount, days = 30) {
  const { data, error } = await sb.rpc("issue_coupon",
    { p_order: orderId, p_kind: kind, p_discount: discount, p_days: days });
  return error ? { ok: false, error: error.message } : { ok: true, code: data };
}
```
The code is generated **inside Postgres**, not the browser. Anything in the browser
can be edited by the user — a client-side coupon check is not a security control.
The database function enforces:
- the order exists and has actually been served,
- a phone number is present,
- **one reward per order per kind** (no re-generating codes),
- and it builds the code atomically.

See Part 5 for the SQL.

---

### The remaining modules

| Module | Lines | Purpose |
|---|---|---|
| `analyticsStore.js` | 140 | `summarize` (revenue, orders, new/total customers, repeat rate), `seriesOf` (time series), `peakHours`, `topItems`, `useAnalyticsOrders` (90-day window), `useQrScansToday`. All aggregation happens client-side over fetched orders. |
| `notificationStore.js` | 88 | `pushNotification`, `useLiveNotifications`, `markRead`, `markAllRead`. Drives the bell menu and the Overview activity feed. |
| `adminStore.js` | 154 | Super-admin: `useTenants` (via the `admin_tenants` RPC), `platformStats`, `useAdminUsers`, `setStatus`/`setPlan`, and the impersonation system (`startImpersonation`, `canEditImpersonated`, `setImpersonationEdit`). |
| `storage.js` | 32 | `uploadImage(file, folder)` — validates type and 5 MB limit, uploads to the `menu-images` bucket at `<rid>/<folder>/<timestamp>.<ext>`, returns a public URL. |
| `menuSession.js` | 28 | `startSession`, `touchSession`, `sessionExpired` — the scan-window that makes a shared/bookmarked menu link go stale. |
| `deviceBlock.js` | 19 | `blockFor`, `isBlocked`, `blockRemaining` — abuse throttle for a device. |
| `groupTag.js` | 36 | `phoneLast4`, `groupTag`, `groupTint` — the animal-emoji identity (🦊 8842). Hashes **only the last 4 digits**, so `+91 98765 43210` and `9876543210` produce the same tag. |
| `whatsapp.js` | 69 | `isConfigured`, `sendWhatsAppTemplate` (real Cloud API), `waFallbackLink` (free wa.me), `saveWhatsAppConfig`. |
| `download.js` | 150 | `downloadCSV`, `downloadSVG`, `downloadSvgAsPng`, `printBill`, `printPoster` (the print-ready QR poster). |
| `validation.js` | 19 | `checkPassword` — strength rules. |
| `format.js` | 10 | `inr` (₹ formatting), `orderTotal`, `fmtClock`, `fmtElapsed`. |
| `theme.js` | 19 | Brand colours and status/type maps. |

---

## Part 3 — Pages and components

### Customer surface

**`src/pages/customer/Menu.jsx`** — the largest single file. Contains:
- `CustomerMenuResolver` — resolves `/r/:slug` → restaurant; enforces suspended,
  **closed** (accepting-orders + closed-days), and scan-session checks before the
  menu renders.
- `CustomerMenuInner` — categories, items, cart, coupon entry, phone capture,
  order placement.
- `OrderStatus` — token display, progress steps, the green **ready-to-collect**
  highlight, the live "Your orders" list (active + last 2 finished).
- `ReviewScreen` — rating, Google review click-through, and the review-gated reward.

Key guards inside it:
```js
if (expired && !placedId) { … }        // never expire someone tracking an order
const currentSettled = !order || order.status === "completed" || …;
const allDone = allSettled && anyCompleted;   // feedback only when ALL orders finish
```

### Dashboard pages (`/app/*`)

| Page | Route | Notes |
|---|---|---|
| `Overview.jsx` | `/app` | Summary cards, revenue chart, best sellers, live orders, profile completion, customer mix, growth widgets. All wired to real data with honest empty states. |
| `orders/LiveOrders.jsx` | `orders/live` | Kanban board, realtime, repeating chime + mute, group tags, open/closed toggle, kitchen view. |
| `orders/OrderHistory.jsx` | `orders/history` | Completed and cancelled orders, CSV export. |
| `menu/MenuItems.jsx` | `menu/items` | Item CRUD, image upload, customer preview. |
| `menu/TodaysSpecials.jsx` | `menu/specials` | Feature items on the customer menu. |
| `Categories.jsx` | `categories` | Category CRUD, 88-icon picker, reorder. |
| `Customers.jsx` | `customers` | Captured customers, tiers, WhatsApp offers. |
| `growth/Reviews.jsx` · `Social.jsx` · `WhatsApp.jsx` · `Coupons.jsx` | `growth/*` | Growth engine. Reviews/followers show `—` (need paid APIs). |
| `QRCodes.jsx` | `qr` | QR generation (encodes `?src=qr`), print-ready poster, location QRs. |
| `Storefront.jsx` | `storefront` | Branding, prep time, growth prompts, next-visit reward. |
| `Analytics.jsx` | `analytics` | Revenue/orders trends, peak hours, top items, repeat vs new. |
| `Settings.jsx` | `settings` | Name, contact, hours, ordering rules, session window, reward, logo/banner, password. |
| `Health.jsx` | `/health` | **Your diagnostic tool.** Per-migration checks plus a "Your account" audit (signed in → profile → restaurant → tenant → write → categories → image upload → settings save). |

### Shared components

- `components/layout/DashboardLayout.jsx` — pins the tenant, shows the
  impersonation banner, and hosts the **red error toast** (`qm-error`) and
  **green success toast** (`qm-success`).
- `components/layout/Topbar.jsx` / `Sidebar.jsx` — navigation, live badges,
  restaurant switcher, notification menu.
- `components/ui/primitives.jsx` — `Card`, `Button`, `Toggle`, `Badge`, `StatCard`,
  `EmptyState`, `ProgressBar`, `Avatar`.
- `components/ui/charts.jsx` — `Sparkline`, `Bars`, `GroupedBars`, `Ring`, `Donut`
  (hand-rolled SVG, no chart library). Each guards against empty data.
- `components/widgets/*` — the Overview cards.

---

## Part 4 — Testing

```bash
npm run test        # 114 Vitest tests
npm run test:e2e    # 4 Playwright browser journeys
```

`vitest.config.js` **hard-pins the Supabase env vars to empty**, forcing demo mode.
Without this, running tests would write real orders into your production database.

The suite has caught 12+ real bugs before they reached you: a hooks-order crash, a
badge scope crash, discount double-counting, a country-code tag mismatch, blob-URL
saves, silent-save failures, and the demo-data leaks. Several tests assert *source
code patterns* (e.g. that `updateRestaurant` merges against the DB) specifically so
a fixed bug cannot silently return.

---

## Part 5 — Database

17 migrations in `supabase/migrations/`, run **in order 001 → 017**.

| # | File | What it adds |
|---|---|---|
| 001 | `init` | Core tables + RLS: `profiles` (+ signup trigger), `restaurants`, `menu_categories`, `menu_items`, `orders`, `order_items`, `coupons`, `notifications`, `token_counters`. |
| 002 | `coupon_issuance` | `issued_coupons` (phone, issued_at, expires_at, redeemed_at). |
| 003 | `coupon_check_and_guard` | Validation + redemption functions. |
| 004 | `dashboard_functions` | `admin_tenants()` for the super-admin list. |
| 005 | `menu_realtime` | Realtime publication for menu tables. |
| 006 | `storage` | The `menu-images` bucket + 4 storage policies. **Required for image uploads.** |
| 007 | `attach_phone` | Attach a phone to an existing order. |
| 008 | `qr_scans` | Scan tracking table. |
| 009 | `settings_realtime` | Realtime for `restaurants`. |
| 010 | `menu_session` | `restaurants.menu_session_mins`. |
| 011 | `fix_profile_rls` | **Required for super-admin login.** Non-recursive profile policies. |
| 012 | `admin_users_audit` | Admin user listing + audit log. |
| 013 | `admin_contacts` | Extends `admin_tenants` (needs `drop function` first — return type changes). |
| 014 | `resend_coupon` | `my_active_coupons` for lost-code recovery. |
| 015 | `order_cleared` | `orders.cleared_at` + index. |
| 016 | `grants` | **Base table grants. Mandatory after any schema rebuild.** |
| 017 | `one_restaurant_per_owner` | Unique index preventing duplicate restaurants. |
| 018 | `item_portions` | `menu_items.portions` jsonb — half plate / full plate pricing. |
| 019 | `item_addons` | `menu_items.addons` jsonb — optional extras priced as a delta. |
| 020 | `reward_limits` | Per-phone caps on next-visit reward issuance (one/day + owner-set total). |

### Why migration 016 exists — the lesson worth remembering

RLS decides **which rows** a role may see. It does **not** grant access to the table
itself — that's a separate, lower-level privilege. A role with perfect RLS policies
but no base `GRANT` gets `permission denied for table X` **before any policy is
evaluated**.

After `drop schema public cascade; create schema public;`, a one-time
`grant all on all tables` only covers tables that existed *at that instant*. Every
table created afterwards by migrations 001–015 receives **no grant**. That is the
entire cause of the permission-denied saga. 016 grants them and — via
`ALTER DEFAULT PRIVILEGES` — makes future tables auto-granted so it cannot recur.

---

## Part 6 — Deployment and operations

### Go-live sequence

1. Push to GitHub → import in Vercel (auto-detects Vite).
2. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   **Never set `VITE_RESTAURANT_ID`** — it pins the placeholder tenant.
3. Supabase → Auth → URL Configuration: Site URL + `{origin}/auth/callback`.
4. Run migrations 001 → 017 in order.
5. `/health` → everything green, including "Your account".
6. Sign up → promote to super-admin:
   ```sql
   update public.profiles set role = 'superadmin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Then log out and back in.
7. QR Codes → set the website address to your real domain **before printing**.
8. Real-phone smoke test over mobile data.

### Operational gotchas

- **After any env-var change in Vercel you must redeploy.** Env vars are baked in at
  build time.
- **Clear browser site data after deploying** — stale localStorage carries old demo
  settings across.
- **Free-tier Supabase pauses after 7 days idle** and gives 500 MB DB / 1 GB storage.
  Storage is the real ceiling: without image compression, ~4–5 restaurants; with it,
  ~50–60.
- **Audio on mobile:** the context suspends on screen-lock and needs a real tap to
  unlock. On iPhone the **physical silent switch mutes browser audio entirely** —
  unfixable in code.
- **Known limits by design:** review counts and social follower numbers show `—`
  (need paid Google/Meta APIs); loyalty has no backing table yet; review-gating
  unlocks on *click-through* to Google, since no platform reports whether a review
  was actually written.

### Still outstanding

- **DPDP consent line** at the three phone-capture points + a privacy policy.
  Trigger: **before the first restaurant serves real customers.**
- **Image compression** before upload — the single highest-value remaining change
  (storage ceiling, menu load speed, and HEIC compatibility).
