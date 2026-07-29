// Platform-level "database" for the super admin (localStorage-backed dummy storage).
import { useEffect, useState } from "react";
import { TENANTS, PLANS } from "../data/tenants";
import { sb, REMOTE, setRid, DEFAULT_RESTAURANT_ID } from "./supabaseClient";

const KEY = "qm_tenants_v1";
const listeners = new Set();

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) && raw.length ? raw : TENANTS;
  } catch { return TENANTS; }
}
function write(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

let rCache = null, rStarted = false;
async function rFetch() {
  const { data, error } = await sb.rpc("admin_tenants");
  if (error) { console.error("admin tenants:", error.message); return; }
  rCache = data.map((t) => ({
    id: t.id, name: t.name, slug: t.slug,
    owner: t.owner_name || "—", ownerEmail: t.owner_email || "",
    phone: t.phone || "", email: t.email || "",
    city: t.city || "—",
    plan: t.plan, status: t.status, orders: Number(t.orders), revenue: Number(t.revenue),
    rating: 4.8, joined: t.joined, lastActive: "—",
  }));
  listeners.forEach((l) => l());
}
function rStart() { if (!rStarted && sb) { rStarted = true; rFetch(); } }

export function getTenants() {
  if (REMOTE) { rStart(); return rCache || []; }
  return read();
}
export function setStatus(id, status) {
  if (REMOTE) {
    rCache = (rCache || []).map((t) => (t.id === id ? { ...t, status } : t));
    listeners.forEach((l) => l());
    sb.from("restaurants").update({ status }).eq("id", id)
      .then(({ error }) => error && console.error("tenant status:", error.message));
    return;
  }
  write(read().map((t) => (t.id === id ? { ...t, status } : t)));
}
export function setPlan(id, plan) {
  if (REMOTE) {
    rCache = (rCache || []).map((t) => (t.id === id ? { ...t, plan } : t));
    listeners.forEach((l) => l());
    sb.from("restaurants").update({ plan }).eq("id", id)
      .then(({ error }) => error && console.error("tenant plan:", error.message));
    return;
  }
  write(read().map((t) => (t.id === id ? { ...t, plan } : t)));
}
export function resetTenants() { write(TENANTS); }

export function platformStats(list = read()) {
  const active = list.filter((t) => t.status === "active");
  const trials = list.filter((t) => t.status === "trial");
  const suspended = list.filter((t) => t.status === "suspended");
  const mrr = list.reduce((s, t) => s + (t.status === "active" ? PLANS[t.plan].price : 0), 0);
  const orders = list.reduce((s, t) => s + t.orders, 0);
  const revenue = list.reduce((s, t) => s + t.revenue, 0);
  const planMix = Object.keys(PLANS).map((p) => ({ plan: p, count: list.filter((t) => t.plan === p).length, color: PLANS[p].color }));
  return { total: list.length, active: active.length, trials: trials.length, suspended: suspended.length, mrr, orders, revenue, planMix };
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export function useTenants() {
  const [v, setV] = useState(getTenants);
  useEffect(() => subscribe(() => setV(getTenants())), []);
  return v;
}


/* ---------------- super-admin: user accounts ---------------- */
// Passwords are NEVER returned — Supabase stores one-way bcrypt hashes,
// so no query can reveal them. Support flow = send a reset link instead.
export function useAdminUsers() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!REMOTE) { setRows([]); return; }
    sb.rpc("admin_users").then(({ data, error }) => {
      if (error) { setErr(error.message); setRows([]); return; }
      setRows(data || []);
    });
  }, []);
  return { rows, err };
}

export async function sendPasswordReset(email) {
  if (!REMOTE) return { ok: true };
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password",
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/* ---------------- super-admin: view a tenant (read-only) ---------------- */
const IMP_KEY = "qm_impersonate_v1";   // { id, name }

export function getImpersonation() {
  try { return JSON.parse(sessionStorage.getItem(IMP_KEY)); } catch { return null; }
}
export function isImpersonating() { return !!getImpersonation(); }

// Editing while viewing a tenant is OFF by default (safe). A super-admin can
// deliberately enable it; the toggle itself is audit-logged. Read-only guards
// consult this, so nothing mutates a live tenant unless it's explicitly on.
const EDIT_KEY = "qm_impersonate_edit_v1";
export function canEditImpersonated() {
  try { return isImpersonating() && sessionStorage.getItem(EDIT_KEY) === "1"; } catch { return false; }
}
export async function setImpersonationEdit(on) {
  try { sessionStorage.setItem(EDIT_KEY, on ? "1" : "0"); } catch {}
  const imp = getImpersonation();
  if (REMOTE && imp) {
    const { data } = await sb.auth.getUser();
    sb.from("admin_audit").insert({
      admin_id: data?.user?.id, admin_email: data?.user?.email,
      action: on ? "edit_enabled" : "edit_disabled", restaurant_id: imp.id, detail: imp.name,
    }).then(({ error }) => error && console.error("audit:", error.message));
  }
  try { window.dispatchEvent(new CustomEvent("qm-edit-mode", { detail: on })); } catch {}
}

export async function startImpersonation(tenant) {
  try { sessionStorage.setItem(IMP_KEY, JSON.stringify({ id: tenant.id, name: tenant.name })); } catch {}
  setRid(tenant.id);
  if (REMOTE) {
    const { data } = await sb.auth.getUser();
    sb.from("admin_audit").insert({
      admin_id: data?.user?.id, admin_email: data?.user?.email,
      action: "view_tenant", restaurant_id: tenant.id, detail: tenant.name,
    }).then(({ error }) => error && console.error("audit:", error.message));
  }
}

export function stopImpersonation(ownRestaurantId) {
  try { sessionStorage.removeItem(IMP_KEY); sessionStorage.removeItem("qm_impersonate_edit_v1"); } catch {}
  setRid(ownRestaurantId || DEFAULT_RESTAURANT_ID);
}
