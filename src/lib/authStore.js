// Session auth.
// DEMO MODE: any credentials work; session lives in localStorage.
// REMOTE MODE (Supabase): real email/password auth via supabase.auth; on success we
// mirror {name,email,role} into the same local session record so guards, the topbar
// and every consumer keep working unchanged. Role comes from public.profiles.
import { useEffect, useState } from "react";
import { sb, REMOTE, setRid } from "./supabaseClient";

const KEY = "qm_auth_v1";
const listeners = new Set();

function read() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }
function write(v) {
  try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {}
  listeners.forEach((l) => l());
}

export function getUser() { return read(); }
export function patchSession(patch) { const s = read(); if (s) write({ ...s, ...patch }); }

// Pin the tenant immediately on module load (page refresh with an active
// session). Without this, stores mounted before the layout's pin effect
// fetch the DEFAULT tenant's data for a moment — phantom notifications.
{
  const s0 = read();
  if (REMOTE && s0?.restaurantId) setRid(s0.restaurantId);
}
export function isAuthed() { return !!read(); }

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Find the owner's restaurant; create an EMPTY one on first login (name taken
// from the signup form via user_metadata). This is what makes a new signup
// start with zero orders and zero menu items — their own tenant.
async function ensureRestaurant(user) {
  const { data: mine, error } = await sb.from("restaurants")
    .select("id, slug, name").eq("owner_id", user.id).limit(1);
  // CRITICAL: if the lookup itself FAILED we must not fall through to insert —
  // a transient RLS/permission/network error would otherwise create a SECOND
  // restaurant for an owner who already has one (the cause of duplicates in
  // the admin list). Bail out and let the next attempt resolve it.
  if (error) { console.error("restaurant lookup:", error.message); return null; }
  if (mine?.length) return mine[0];
  const rname = (user.user_metadata?.restaurant || "").trim() ||
                `${(user.user_metadata?.name || user.email.split("@")[0]).split(" ")[0]}'s Kitchen`;
  const slug = `${slugify(rname) || "restaurant"}-${Math.random().toString(36).slice(2, 6)}`;
  const ownerPhone = (user.user_metadata?.phone || "").trim();
  const { data: created, error: e2 } = await sb.from("restaurants")
    .insert({
      name: rname, slug, owner_id: user.id, status: "trial",
      settings: ownerPhone ? { contact: { phone: ownerPhone } } : {},
    })
    .select("id, slug, name").single();
  if (e2) {
    console.error("restaurant create:", e2.message);
    // Another tab/attempt may have won the race and created it — re-check
    // rather than leaving the session without a restaurant.
    const { data: retry } = await sb.from("restaurants")
      .select("id, slug, name").eq("owner_id", user.id).limit(1);
    return retry?.length ? retry[0] : null;
  }
  // a starter category so the very first "Add item" has somewhere to live
  await sb.from("menu_categories").insert({ restaurant_id: created.id, name: "Menu", emoji: "🍽️", sort: 1 });
  return created;
}

export async function mirror(user) { return mirrorSession(user); }

async function mirrorSession(user) {
  let role = "owner", name = user.user_metadata?.name || user.email.split("@")[0];
  // maybeSingle() won't throw on 0 rows; log any real error so a mis-read
  // role (e.g. a superadmin landing on /app) is diagnosable, not silent.
  const { data: prof, error: profErr } = await sb.from("profiles").select("name, role").eq("id", user.id).maybeSingle();
  if (profErr) console.error("[GrOrbit] profile read failed:", profErr.message, "— role defaults to owner");
  if (prof) { role = prof.role || role; name = prof.name || name; }
  console.log("[GrOrbit] signed in as role:", role);
  let restaurant = null;
  if (role !== "superadmin") {
    restaurant = await ensureRestaurant(user);
    if (restaurant) setRid(restaurant.id);
  }
  write({
    id: user.id, name, email: user.email, role, remote: true,
    restaurant: restaurant?.name, restaurantId: restaurant?.id, slug: restaurant?.slug,
  });
  return role;
}

export function login({ email, password }) {
  if (!email?.trim() || !password?.trim()) return { ok: false, error: "Enter your email and password" };
  if (REMOTE) {
    return sb.auth.signInWithPassword({ email: email.trim(), password }).then(({ data, error }) => {
      if (error) return { ok: false, error: error.message };
      return mirrorSession(data.user).then((role) => ({ ok: true, role }));
    });
  }
  const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  write({ name, email: email.trim(), restaurant: "Spice Junction", role: "owner" });
  return { ok: true };
}

export function signup({ name, restaurant, phone, email, password }) {
  if (!name?.trim() || !email?.trim() || !password?.trim()) return { ok: false, error: "Please fill in all fields" };
  if (REMOTE) {
    return sb.auth.signUp({
      email: email.trim(), password,
      options: {
        data: { name: name.trim(), restaurant: restaurant?.trim() || "", phone: phone?.trim() || "" },
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    }).then(({ data, error }) => {
      if (error) return { ok: false, error: error.message };
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
        return { ok: false, error: "This email is already registered — log in instead." };
      if (data.user && data.session) return mirrorSession(data.user).then(() => ({ ok: true }));
      return { ok: true, confirm: true, email: email.trim() };
    });
  }
  write({ name: name.trim(), email: email.trim(), restaurant: restaurant?.trim() || "My Restaurant", role: "owner" });
  return { ok: true };
}

export function requestPasswordReset(email) {
  if (!email?.trim()) return Promise.resolve({ ok: false, error: "Enter your email first" });
  if (REMOTE) {
    return sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    }).then(({ error }) => error
      ? { ok: false, error: error.message }
      : { ok: true, info: "If an account exists for that email, a reset link is on its way." });
  }
  return Promise.resolve({ ok: true, info: "Demo mode: password reset emails are simulated." });
}

export function updatePassword(newPassword) {
  if (REMOTE) {
    return sb.auth.updateUser({ password: newPassword }).then(({ data, error }) => {
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    });
  }
  return Promise.resolve({ ok: true });
}

export function demoLogin() { write({ name: "Ravi Kumar", email: "ravi@spicejunction.in", restaurant: "Spice Junction", role: "owner" }); }
export function adminLogin() { write({ name: "Platform Admin", email: "admin@grorbit.app", role: "superadmin" }); }

export function logout() {
  if (REMOTE) sb.auth.signOut().catch(() => {});
  write(null);
}

// keep the mirror in sync with Supabase session restore/expiry
if (REMOTE && typeof window !== "undefined") {
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") { if (read()?.remote) write(null); }
    else if (session?.user && !read()) mirrorSession(session.user);
    else if (session?.user && read()?.restaurantId) setRid(read().restaurantId);
    // SELF-HEAL: a cached session with no restaurant (stale mirror, or a failed
    // ensureRestaurant on a previous login) would otherwise leave the app on the
    // fallback tenant forever — empty slug, wrong QR link, demo name in the bar.
    else if (session?.user) mirrorSession(session.user);
  });
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export function useAuth() {
  const [user, setUser] = useState(getUser);
  useEffect(() => subscribe(() => setUser(getUser())), []);
  return { user };
}
