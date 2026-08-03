// Shared, dashboard-managed storefront settings (localStorage-backed).
// The dashboard "Storefront" page writes these; the customer menu reads them live.
import { useEffect, useState } from "react";
import { isImpersonating, canEditImpersonated } from "./adminStore";
import { MENU_ITEMS } from "../data/menu";
import { sb, REMOTE, rid, onTenantChange, requireTenant, reportError } from "./supabaseClient";

const KEY = "qm_restaurant_v1";
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

// Neutral skeleton for LIVE restaurants whose settings are still empty —
// no demo branding must ever leak into a real tenant.
const NEUTRAL_SETTINGS = {
  about: "",
  contact: { phone: "", email: "", address: "", hours: "" },
  prepTimeMins: 15,
  offers: [],
  specials: [],
  growth: {
    google: { url: "", on: false },
    instagram: { url: "", on: false },
    facebook: { url: "", on: false },
    whatsapp: { number: "", on: false },
    coupon: { code: "COMEBACK50", desc: "₹50 off your next visit", on: true },
    nextVisit: { type: "flat", value: 50, minOrder: 0, days: 30, on: false },
  },
};

export const DEFAULT_SETTINGS = {
  about: "Spice Junction has been serving Ambala's favourite burgers, wood-fired pizzas and slow-steeped cold brews since 2019. Everything is made fresh to order — scan, order, and we'll call your token.",
  contact: {
    phone: "+91 98765 43210",
    email: "hello@spicejunction.in",
    address: "Shop 14, Mall Road, Ambala Cantt, Haryana 133001",
    hours: "11:00 AM – 11:00 PM, daily",
  },
  prepTimeMins: 15,
  offers: [
    { id: 1, emoji: "🎉", title: "Welcome offer", text: "10% off your first order with code WELCOME10", active: true },
    { id: 2, emoji: "🍕", title: "Combo deal", text: "Any pizza + cold brew for just ₹349", active: true },
  ],
  specials: MENU_ITEMS.filter((m) => m.special).map((m) => m.id),
  growth: {
    google: { url: "https://g.page/r/spice-junction/review", on: true },
    instagram: { url: "https://instagram.com/spicejunction", on: true },
    facebook: { url: "https://facebook.com/spicejunction", on: true },
    whatsapp: { number: "+91 98765 43210", on: true },
    coupon: { code: "COMEBACK50", desc: "₹50 off your next visit", on: true },
    nextVisit: { type: "flat", value: 50, minOrder: 199, days: 30, on: true },
  },
};

// Keep the cached session's restaurant name in step with a rename, so the
// topbar updates immediately instead of waiting for the next login.
function syncRestaurantName(name) {
  try {
    const raw = JSON.parse(localStorage.getItem("qm_auth_v1"));
    if (!raw) return;
    localStorage.setItem("qm_auth_v1", JSON.stringify({ ...raw, restaurant: name }));
    window.dispatchEvent(new StorageEvent("storage", { key: "qm_auth_v1" }));
  } catch {}
}

function read() {
  // LIVE tenants must never inherit demo branding: base the merge on the
  // neutral skeleton in remote mode, and only use the demo-rich defaults
  // when running the local demo build.
  const base = REMOTE ? NEUTRAL_SETTINGS : DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return base;
    // shallow-merge so new default keys appear for older saved data
    return { ...base, ...raw, contact: { ...base.contact, ...raw.contact }, growth: { ...base.growth, ...raw.growth } };
  } catch { return base; }
}
function write(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

let remoteLoaded = false;
let rtChannel = null;
if (REMOTE) onTenantChange(() => {
  if (rtChannel) { try { sb.removeChannel(rtChannel); } catch {} rtChannel = null; }
  remoteLoaded = false;
  try { localStorage.removeItem(KEY); } catch {}
  listeners.forEach((l) => l());
});
async function rFetch() {
  // maybeSingle() so a 0-row match doesn't throw; we can then report it clearly.
  const { data, error } = await sb.from("restaurants").select("settings, menu_session_mins").eq("id", rid()).maybeSingle();
  if (error) {
    // Silently returning here left the dashboard showing blank settings with no
    // hint why — which looked exactly like "my banner and details vanished".
    reportError(`Couldn’t load your restaurant settings: ${error.message}`);
    return;
  }
  if (!data) {
    reportError("Couldn’t load your restaurant settings — this restaurant wasn’t found for your account. Try logging out and back in.");
    return;
  }
  const merged = { ...(REMOTE ? NEUTRAL_SETTINGS : DEFAULT_SETTINGS), ...(data?.settings || {}), menuSessionMins: data?.menu_session_mins ?? 0 };
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch {}
  listeners.forEach((l) => l());
}

export function getRestaurant() {
  if (REMOTE && !remoteLoaded) {
    remoteLoaded = true;
    // If the first load fails, allow a later attempt rather than leaving the
    // dashboard permanently blank for this session.
    rFetch().catch(() => { remoteLoaded = false; });
    rtChannel = sb.channel("restaurant-live-" + rid())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurants", filter: `id=eq.${rid()}` }, () => rFetch())
      .subscribe();
  }
  return read();
}
export async function updateRestaurant(patch) {
  if (readOnlyBlocked()) return;
  // Optimistically update the local copy so the UI responds immediately.
  write({ ...read(), ...patch });
  if (!REMOTE) return;
  if (!requireTenant("save your settings")) return;
  // CRITICAL: merge against the CURRENT DATABASE settings, not localStorage.
  // Writing `{...read(), ...patch}` straight to the settings column overwrites
  // the whole JSON blob — so a stale/partial local copy (new device, cleared
  // site data, second tab) would erase fields it didn't know about, which is
  // how banners, logos and address details were being wiped on unrelated saves.
  const { data: cur, error: readErr } = await sb
    .from("restaurants").select("settings").eq("id", rid()).maybeSingle();
  if (readErr) return reportError(`Couldn’t save settings: ${readErr.message}`);
  const merged = { ...(cur?.settings || {}), ...patch };
  // keep nested objects from being clobbered by a partial patch
  for (const key of ["contact", "growth", "ordering", "closedDays"]) {
    if (patch[key] && typeof patch[key] === "object" && !Array.isArray(patch[key])) {
      merged[key] = { ...(cur?.settings?.[key] || {}), ...patch[key] };
    }
  }
  const { data, error } = await sb
    .from("restaurants").update({ settings: merged }).eq("id", rid()).select("id");
  if (error) return reportError(`Couldn’t save settings: ${error.message}`);
  if (!data || data.length === 0) return reportError("Couldn’t save settings — this restaurant wasn’t found for your account.");
  write({ ...read(), ...merged });   // resync local copy with what's actually stored
}

// The restaurant's display name lives on the restaurants ROW (not settings).
export function updateMenuSessionMins(mins) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    sb.from("restaurants").update({ menu_session_mins: mins }).eq("id", rid())
      .then(({ error }) => error && console.error("session mins save:", error.message));
  }
  // demo: keep it in settings so the UI reflects the choice
}

export function updateRestaurantName(name) {
  if (readOnlyBlocked()) return;
  const clean = (name || "").trim();
  if (!clean) return;
  if (REMOTE) {
    if (!requireTenant("save your restaurant name")) return;
    // .select() lets us detect the silent "0 rows matched" case, which is what
    // made a saved name reappear as the old one after logging back in.
    sb.from("restaurants").update({ name: clean }).eq("id", rid()).select("id, name")
      .then(({ data, error }) => {
        if (error) return reportError(`Couldn’t save the restaurant name: ${error.message}`);
        if (!data || data.length === 0) {
          return reportError("Couldn’t save the restaurant name — this restaurant wasn’t found for your account.");
        }
        syncRestaurantName(clean);   // keep the topbar/session in step immediately
      });
    return;
  }
  write({ ...read(), name: clean });
  syncRestaurantName(clean);
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export function useRestaurant() {
  const [v, setV] = useState(getRestaurant);
  useEffect(() => subscribe(() => setV(getRestaurant())), []);
  return v;
}
