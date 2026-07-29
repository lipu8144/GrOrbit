// Live, app-generated notifications (new orders, low-rating feedback, etc.)
// localStorage-backed so the customer app can push items the dashboard sees.
import { useEffect, useState } from "react";
import { sb, REMOTE, rid, onTenantChange } from "./supabaseClient";

const KEY = "qm_notifications_live_v1";
const listeners = new Set();

function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function pushNotification(n) {
  const item = { id: "n_" + Date.now() + "_" + Math.round(Math.random() * 999), time: "Just now", unread: true, createdAt: Date.now(), ...n };
  if (!REMOTE) write([item, ...read()].slice(0, 50));
  if (REMOTE) {
    sb.from("notifications").insert({
      restaurant_id: rid(), type: n.type || "system",
      title: n.title, body: n.body || "",
      meta: { rating: n.rating, customer: n.customer, phone: n.phone },
    }).then(({ error }) => error && console.error("notify:", error.message));
  }
  return item;
}
let rCache = null, rStarted = false, rChannel = null;
if (REMOTE) onTenantChange(() => {
  if (rChannel) { try { sb.removeChannel(rChannel); } catch {} rChannel = null; }
  rStarted = false; rCache = null; listeners.forEach((l) => l());
});
const ago = (ts) => {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  return m < 1 ? "Just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} d ago`;
};
async function rFetch() {
  const { data, error } = await sb.from("notifications").select("*")
    .eq("restaurant_id", rid()).order("created_at", { ascending: false }).limit(50);
  if (error) { console.error("notifs fetch:", error.message); return; }
  rCache = data.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, unread: r.unread, time: ago(r.created_at), createdAt: new Date(r.created_at).getTime(), ...(r.meta || {}) }));
  listeners.forEach((l) => l());
}
function rStart() {
  if (rStarted || !sb) return;
  rStarted = true;
  rFetch();
  rChannel = sb.channel("notifs-live-" + rid()).on("postgres_changes",
    { event: "*", schema: "public", table: "notifications", filter: `restaurant_id=eq.${rid()}` },
    () => rFetch()).subscribe();
}

export function getLiveNotifications() {
  if (REMOTE) { rStart(); return rCache || []; }
  return read();
}
export function markRead(id) {
  if (REMOTE) {
    rCache = (rCache || []).map((n) => (n.id === id ? { ...n, unread: false } : n));
    listeners.forEach((l) => l());
    sb.from("notifications").update({ unread: false }).eq("id", id)
      .then(({ error }) => error && console.error("mark read:", error.message));
    return;
  }
  write(read().map((n) => (n.id === id ? { ...n, unread: false } : n)));
}
export function markAllRead() {
  if (REMOTE) {
    rCache = (rCache || []).map((n) => ({ ...n, unread: false }));
    listeners.forEach((l) => l());
    sb.from("notifications").update({ unread: false }).eq("restaurant_id", rid()).eq("unread", true)
      .then(({ error }) => error && console.error("mark all:", error.message));
    return;
  }
  write(read().map((n) => ({ ...n, unread: false })));
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export function useLiveNotifications() {
  const [v, setV] = useState(getLiveNotifications);
  useEffect(() => subscribe(() => setV(getLiveNotifications())), []);
  return v;
}
