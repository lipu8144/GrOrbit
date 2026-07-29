// Shared store for customer-placed (QR) orders.
// DEMO MODE (no .env): localStorage is the source of truth (cross-tab via storage event).
// REMOTE MODE (Supabase configured): Postgres is the source of truth; live updates
// arrive over Supabase Realtime. The public API is identical in both modes.
import { useEffect, useState } from "react";
import { isImpersonating, canEditImpersonated } from "./adminStore";
import { sb, REMOTE, rid, onTenantChange } from "./supabaseClient";
import { pushNotification } from "./notificationStore";

const KEY = "qm_live_orders_v1";
const listeners = new Set();

// Super-admins viewing a tenant are READ-ONLY: never mutate someone
// else's live restaurant by accident.
function readOnlyBlocked() {
  if (isImpersonating() && !canEditImpersonated()) {
    try { window.dispatchEvent(new CustomEvent("qm-readonly")); } catch {}
    console.warn("[GrOrbit] read-only: super-admin is viewing this restaurant");
    return true;
  }
  return false;
}
const notify = () => listeners.forEach((l) => l());

/* ------------------------------------------------------------------ */
/* LOCAL (demo) branch                                                  */
/* ------------------------------------------------------------------ */
function lRead() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function lWrite(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {} notify(); }

/* ------------------------------------------------------------------ */
/* REMOTE (Supabase) branch — in-memory cache + realtime                */
/* ------------------------------------------------------------------ */
let cache = [];
let channelStarted = false;
let channel = null;
if (REMOTE) onTenantChange(() => {
  if (channel) { try { sb.removeChannel(channel); } catch {} channel = null; }
  channelStarted = false; cache = []; notify();
  if (listeners.size > 0) rStart();
});

const rowToOrder = (r, items = []) => ({
  id: r.id, source: "qr", token: r.token,
  customer: r.customer_name, phone: r.customer_phone,
  type: r.order_type, table: r.table_no, status: r.status,
  payment: r.payment, method: r.method, notes: r.notes,
  subtotal: r.subtotal, discount: r.discount, coupon: r.coupon_code, total: r.total,
  placedAt: new Date(r.placed_at).getTime(),
  startedAt: r.started_at ? new Date(r.started_at).getTime() : undefined,
  readyAt: r.ready_at ? new Date(r.ready_at).getTime() : undefined,
  completedAt: r.completed_at ? new Date(r.completed_at).getTime() : undefined,
  returning: false,
  blockDevice: r.notes === "BLOCK_DEVICE",
  items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, type: i.food_type })),
});

async function rFetch() {
  // Load all of TODAY's orders — including completed and cancelled — so the
  // board keeps them visible until the restaurant clears them. Older completed
  // orders live in Order History, not the live board.
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const { data: orders, error } = await sb
    .from("orders").select("*, order_items(*)")
    .eq("restaurant_id", rid())
    .gte("placed_at", startOfToday.toISOString())
    .is("cleared_at", null)
    .order("placed_at", { ascending: false }).limit(200);
  if (error) { console.error("orders fetch:", error.message); return; }
  cache = orders.map((o) => rowToOrder(o, o.order_items));
  notify();
}

function rStart() {
  if (channelStarted || !sb) return;
  channelStarted = true;
  rFetch();
  channel = sb.channel("orders-live-" + rid())
    .on("postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${rid()}` },
      () => rFetch())
    .subscribe();
}

/* ------------------------------------------------------------------ */
/* Public API (mode-agnostic)                                           */
/* ------------------------------------------------------------------ */
export function getPlacedOrders() { return REMOTE ? cache : lRead(); }
export function getPlacedOrder(id) { return getPlacedOrders().find((o) => o.id === id) || null; }

let tokenSeq = 200 + Math.floor(Math.random() * 600);
export function placeOrder(partial) {
  const id = (globalThis.crypto?.randomUUID?.() || "qr_" + Date.now());
  const order = {
    id, source: "qr", token: `#${++tokenSeq}`,
    status: ((() => {
      try { return (JSON.parse(localStorage.getItem("qm_restaurant_v1"))?.ordering?.autoAccept) ? "preparing" : "new"; }
      catch { return "new"; }
    })()),
    placedAt: Date.now(),
    payment: "unpaid", method: "Pay at counter", type: "dinein",
    table: null, notes: "", returning: false, ...partial,
  };
  if (REMOTE) {
    cache = [order, ...cache]; notify();               // optimistic
    sb.from("orders").insert({
      id, restaurant_id: rid(), token: order.token,
      customer_name: order.customer, customer_phone: order.phone || "",
      order_type: order.type, table_no: order.table, status: order.status,
      payment: order.payment, method: order.method, notes: order.notes,
      subtotal: order.subtotal ?? order.total, discount: order.discount ?? 0,
      coupon_code: order.coupon ?? null, total: order.total,
    }).then(({ error }) => {
      if (error) { console.error("place order:", error.message); return; }
      return sb.from("order_items").insert(
        order.items.map((i) => ({ order_id: id, name: i.name, qty: i.qty, price: i.price, food_type: i.type || "veg" }))
      );
    }).then((res) => { if (res?.error) console.error("order items:", res.error.message); });
  } else {
    lWrite([order, ...lRead()]);
  }
  return order;
}

const STAMP = { preparing: "startedAt", ready: "readyAt", completed: "completedAt" };
const COL = { preparing: "started_at", ready: "ready_at", completed: "completed_at" };

export function updateOrderStatus(id, status, extra = {}) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    cache = cache.map((o) => {
      if (o.id !== id) return o;
      const u = { ...o, status, ...extra };
      if (STAMP[status] && !u[STAMP[status]]) u[STAMP[status]] = Date.now();
      return u;
    });
    notify();
    const patch = { status };
    if (COL[status]) patch[COL[status]] = new Date().toISOString();
    if (extra.blockDevice) patch.notes = "BLOCK_DEVICE";   // signal rides on the row
    sb.from("orders").update(patch).eq("id", id)
      .then(({ error, count }) => {
        if (error) {
          console.error("update status:", error.message);
          pushNotification({ type: "system", title: "Order update failed", body: error.message });
        }
      });
    return;
  }
  lWrite(lRead().map((o) => {
    if (o.id !== id) return o;
    const u = { ...o, status, ...extra };
    if (STAMP[status] && !u[STAMP[status]]) u[STAMP[status]] = Date.now();
    return u;
  }));
}

export function removeOrder(id) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    // "clear from board" = set cleared_at; the order KEEPS its real status
    // (completed/cancelled) and stays in Postgres for history & analytics.
    cache = cache.filter((o) => o.id !== id); notify();
    sb.from("orders").update({ cleared_at: new Date().toISOString() })
      .eq("id", id).then(({ error }) => error && console.error("clear order:", error.message));
    return;
  }
  lWrite(lRead().filter((o) => o.id !== id));
}

export function subscribe(fn) {
  listeners.add(fn);
  if (REMOTE) rStart();
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  if (!REMOTE) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); if (!REMOTE) window.removeEventListener("storage", onStorage); };
}

export function usePlacedOrders() {
  const [v, setV] = useState(getPlacedOrders);
  useEffect(() => subscribe(() => setV(getPlacedOrders())), []);
  return v;
}

// Fetch a single order by id — no status filter. Used to hydrate a
// remembered order after reload and decide whether it is still live.
export async function fetchOrderById(id) {
  if (!REMOTE) return getPlacedOrder(id);
  const { data, error } = await sb.from("orders")
    .select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) { console.error("[GrOrbit] order-by-id fetch:", error.message); return null; }
  return data ? rowToOrder(data, data.order_items) : null;
}

// Completed / cancelled orders for the History page (remote mode).
export function useOrderHistory() {
  const [rows, setRows] = useState(null);   // null = demo mode / loading
  const live = usePlacedOrders();           // completing/cancelling changes this
  useEffect(() => {
    if (!REMOTE) return;
    let alive = true;
    sb.from("orders").select("*, order_items(*)")
      .eq("restaurant_id", rid())
      .in("status", ["completed", "cancelled"])
      .order("placed_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { console.error("history fetch:", error.message); return; }
        if (alive) setRows(data.map((r) => ({
          id: r.id, token: r.token, customer: r.customer_name, type: r.order_type,
          status: r.status, payment: r.payment, total: r.total,
          date: new Date(r.placed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          items: r.order_items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        })));
      });
    return () => { alive = false; };
  }, [live.length, live.map((o) => o.status).join()]);
  return rows;
}

// Live view of a fixed set of order ids (the customer's session orders).
// Re-resolves whenever the store changes, so status chips update instantly.
export function useSessionOrders(ids) {
  const key = (ids || []).join(",");
  const [orders, setOrders] = useState([]);
  const [tick, setTick] = useState(0);
  const board = usePlacedOrders();   // fires on every realtime status change
  // Safety-net poll: realtime can lag or drop on mobile networks, which is why
  // the tray sometimes needed a manual tap to refresh. A gentle 6s re-resolve
  // guarantees the customer's status chips catch up without any interaction.
  useEffect(() => {
    if (!ids || ids.length === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, [key]);
  useEffect(() => {
    if (!ids || ids.length === 0) { setOrders([]); return; }
    let alive = true;
    Promise.all(ids.map((id) => {
      const fromBoard = getPlacedOrder(id);
      // In remote mode, always fetch the authoritative row so a status change
      // made on another device (the kitchen dashboard) is reflected here.
      return REMOTE ? fetchOrderById(id).catch(() => fromBoard || null)
                    : Promise.resolve(fromBoard);
    })).then((list) => { if (alive) setOrders(list.filter(Boolean)); });
    return () => { alive = false; };
  }, [key, board, tick]);
  return orders;
}

export function usePlacedOrder(id) {
  const [v, setV] = useState(() => (id ? getPlacedOrder(id) : null));
  useEffect(() => {
    if (!id) return;
    let alive = true;
    // read from the board cache first (instant)…
    const fromCache = getPlacedOrder(id);
    if (fromCache) setV(fromCache);

    // …but in remote mode also authoritatively fetch THIS order by id, so a
    // status the board cache doesn't hold (or holds briefly stale) is correct.
    const pull = () => {
      const c = getPlacedOrder(id);
      if (c) { if (alive) setV(c); return; }
      if (REMOTE) fetchOrderById(id).then((o) => { if (alive && o) setV(o); });
    };
    pull();
    const unsub = subscribe(pull);
    return () => { alive = false; unsub(); };
  }, [id]);
  return v;
}
