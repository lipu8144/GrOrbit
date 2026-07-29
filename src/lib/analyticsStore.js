// Real analytics computed from the orders table (remote mode).
// Pure functions do the math (unit-tested); the hook fetches once and
// re-aggregates client-side per selected range. Demo mode returns null and
// pages fall back to their illustrative seed data.
import { useEffect, useState } from "react";
import { usePlacedOrders } from "./orderStore";
import { sb, REMOTE, rid, onTenantChange } from "./supabaseClient";

const DAY = 86400000;

/* ---------------- pure aggregations (testable) ---------------- */

export function seriesOf(orders, rangeDays, now, field) {
  const start = now - rangeDays * DAY;
  const buckets = 12, out = Array(buckets).fill(0);
  for (const o of orders) {
    if (o.placedAt < start || o.placedAt > now) continue;
    const i = Math.min(buckets - 1, Math.floor((o.placedAt - start) / ((rangeDays * DAY) / buckets)));
    out[i] += field === "revenue" ? o.total : 1;
  }
  return out;
}

export function peakHours(orders, rangeDays, now) {
  const start = now - rangeDays * DAY;
  const slots = [["9a", 9], ["11a", 11], ["1p", 13], ["3p", 15], ["5p", 17], ["7p", 19], ["9p", 21], ["11p", 23]];
  return slots.map(([l, h]) => ({
    l,
    v: orders.filter((o) => {
      if (o.placedAt < start) return false;
      const hr = new Date(o.placedAt).getHours();
      return hr >= h && hr < h + 2;
    }).length,
  }));
}

export function topItems(orders, rangeDays, now, prevWindow = false) {
  const end = prevWindow ? now - rangeDays * DAY : now;
  const start = end - rangeDays * DAY;
  const map = new Map();
  for (const o of orders) {
    if (o.placedAt < start || o.placedAt > end) continue;
    for (const it of o.items || []) {
      const cur = map.get(it.name) || { name: it.name, category: it.category || "—", emoji: "🍽️", orders: 0, revenue: 0 };
      cur.orders += it.qty;
      cur.revenue += it.qty * it.price;
      map.set(it.name, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders);
}

export function summarize(orders, rangeDays, now) {
  const start = now - rangeDays * DAY, prevStart = start - rangeDays * DAY;
  const cur = orders.filter((o) => o.placedAt >= start && o.placedAt <= now);
  const prev = orders.filter((o) => o.placedAt >= prevStart && o.placedAt < start);
  const revenue = cur.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0);
  const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : 0);

  // customer identity = phone; "new" = first-ever order falls inside range
  const firstSeen = new Map();
  for (const o of [...orders].sort((a, b) => a.placedAt - b.placedAt)) {
    if (o.phone && !firstSeen.has(o.phone)) firstSeen.set(o.phone, o.placedAt);
  }
  const phonesInRange = new Set(cur.filter((o) => o.phone).map((o) => o.phone));
  let newCustomers = 0;
  for (const p of phonesInRange) if (firstSeen.get(p) >= start) newCustomers += 1;
  // repeat rate = share of in-range customers who ordered on 2+ distinct days (ever)
  let repeaters = 0;
  for (const p of phonesInRange) {
    const days = new Set(orders.filter((o) => o.phone === p).map((o) => new Date(o.placedAt).toDateString()));
    if (days.size >= 2) repeaters += 1;
  }
  const repeatRate = phonesInRange.size ? Math.round((repeaters / phonesInRange.size) * 100) : 0;

  return {
    revenue, orders: cur.length, newCustomers, repeatRate,
    customers: phonesInRange.size,
    revenueDelta: pct(revenue, prevRevenue),
    ordersDelta: pct(cur.length, prev.length),
    typeSplit: {
      dinein: cur.filter((o) => o.type !== "parcel").length,
      parcel: cur.filter((o) => o.type === "parcel").length,
    },
  };
}

/* ---------------- remote hook ---------------- */

let cache = null, started = false;
const listeners = new Set();
if (REMOTE) onTenantChange(() => { cache = null; started = false; listeners.forEach((l) => l()); });
export function refreshAnalytics() { if (REMOTE && started) fetchAll(); }
async function fetchAll() {
  const { data, error } = await sb.from("orders")
    .select("placed_at,total,status,order_type,customer_phone,order_items(name,qty,price)")
    .eq("restaurant_id", rid())
    .neq("status", "cancelled")
    .gte("placed_at", new Date(Date.now() - 90 * DAY).toISOString())
    .order("placed_at", { ascending: false }).limit(1000);
  if (error) { console.error("analytics fetch:", error.message); return; }
  cache = data.map((r) => ({
    placedAt: new Date(r.placed_at).getTime(), total: r.total, type: r.order_type,
    phone: r.customer_phone || "", items: r.order_items || [],
  }));
  listeners.forEach((l) => l());
}

// Today's QR scan count (remote) — null in demo mode.
export function useQrScansToday() {
  const [n, setN] = useState(null);
  useEffect(() => {
    if (!REMOTE) return;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    sb.from("qr_scans").select("id", { count: "exact", head: true })
      .eq("restaurant_id", rid()).gte("scanned_at", midnight.toISOString())
      .then(({ count, error }) => {
        if (error) { console.error("scans today:", error.message); return; }
        setN(count || 0);
      });
  }, []);
  return REMOTE ? n : null;
}

// Returns the raw 90-day order list (remote) or null (demo / loading).
export function useAnalyticsOrders() {
  const [v, setV] = useState(cache);
  const liveOrders = usePlacedOrders();          // realtime board events
  useEffect(() => { refreshAnalytics(); }, [liveOrders]);
  useEffect(() => {
    if (!REMOTE) return;
    if (!started) { started = true; fetchAll(); }
    const fn = () => setV(cache && [...cache]);
    fn();
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return REMOTE ? v : null;
}
