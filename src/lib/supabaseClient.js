// Central Supabase client. If env vars are missing the app runs in
// "demo mode" (localStorage stores) — sb is null and every store falls back.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sb = url && key ? createClient(url, key) : null;
export const REMOTE = !!sb;

// ── current tenant ────────────────────────────────────────────────
// The dashboard resolves this from the logged-in owner; the customer
// page resolves it from the /r/:slug URL. The env value is only the
// fallback for the seeded demo restaurant.
export const DEFAULT_RESTAURANT_ID =
  import.meta.env.VITE_RESTAURANT_ID || "00000000-0000-0000-0000-000000000001";

let currentRid = DEFAULT_RESTAURANT_ID;
const tenantListeners = new Set();

export const rid = () => currentRid;
export function onTenantChange(fn) { tenantListeners.add(fn); return () => tenantListeners.delete(fn); }
export function setRid(id) {
  if (!id || id === currentRid) return;
  currentRid = id;
  tenantListeners.forEach((fn) => { try { fn(); } catch {} });
}

// TRUE only when a real restaurant has been resolved for this session.
// Writing against the placeholder id silently affects 0 rows (Postgres does
// not treat that as an error), which is how "saved" changes used to vanish.
export function hasRealTenant() {
  return !REMOTE || (!!currentRid && currentRid !== "00000000-0000-0000-0000-000000000001");
}

// Surface a failure to the user instead of burying it in the console.
export function reportError(message) {
  console.error("[GrOrbit]", message);
  try { window.dispatchEvent(new CustomEvent("qm-error", { detail: message })); } catch {}
}

// Guard for every remote write: refuses (loudly) when the tenant is unresolved.
export function requireTenant(action = "save") {
  if (hasRealTenant()) return true;
  reportError(`Can’t ${action} yet — your restaurant isn’t linked to this session. Log out and log back in, then try again.`);
  return false;
}
