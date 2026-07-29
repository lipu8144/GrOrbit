// Menu items + categories — single source of truth for the dashboard AND the
// customer menu. DEMO: localStorage seeded from data files (owner edits show up
// on the customer page instantly). REMOTE: Supabase menu_items/menu_categories.
import { useEffect, useState } from "react";
import { isImpersonating, canEditImpersonated } from "./adminStore";
import { sb, REMOTE, rid, onTenantChange, requireTenant, reportError } from "./supabaseClient";
import { MENU_ITEMS } from "../data/menu";
import { CATEGORY_LIST } from "../data/categories";
import { pushNotification } from "./notificationStore";

const IKEY = "qm_menu_items_v1";
const CKEY = "qm_menu_cats_v1";
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

/* ---------------- demo (localStorage, seeded) ---------------- */
function lRead(key, seed) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) && v.length ? v : seed; }
  catch { return seed; }
}
function lWrite(key, arr) { try { localStorage.setItem(key, JSON.stringify(arr)); } catch {} notify(); }
const lItems = () => lRead(IKEY, MENU_ITEMS);
const lCats = () => lRead(CKEY, CATEGORY_LIST);

/* ---------------- remote (Supabase) ---------------- */
let rItems = null, rCats = null, started = false, channel = null;
if (REMOTE) onTenantChange(() => {
  if (channel) { try { sb.removeChannel(channel); } catch {} channel = null; }
  started = false; rItems = null; rCats = null; notify();
  if (listeners.size > 0) rStart();
});
const rowToItem = (r, catName) => ({
  id: r.id, name: r.name, desc: r.description || "", price: r.price,
  type: r.food_type, category: catName(r.category_id), status: r.status,
  image: r.image_url || "", popular: r.popular, special: r.special,
});
async function rFetch() {
  const [{ data: cats, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    sb.from("menu_categories").select("*").eq("restaurant_id", rid()).order("sort").limit(100),
    sb.from("menu_items").select("*").eq("restaurant_id", rid()).order("sort").limit(200),
  ]);
  if (e1 || e2) { console.error("menu fetch:", (e1 || e2).message); return; }
  const byId = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  rCats = cats.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, active: c.active, color: "#F6EFE6" }));
  rItems = items.map((r) => rowToItem(r, (cid) => byId[cid] || ""));
  notify();
}
function rStart() {
  if (started || !sb) return;
  started = true;
  rFetch();
  channel = sb.channel("menu-live-" + rid())
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${rid()}` }, () => rFetch())
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories", filter: `restaurant_id=eq.${rid()}` }, () => rFetch())
    .subscribe();
}
const catIdByName = (name) => (rCats || []).find((c) => c.name === name)?.id || null;

/* ---------------- public reads ---------------- */
export function getMenuItems() {
  if (REMOTE) { rStart(); return rItems || []; }
  return lItems();
}
export function getMenuCategories() {
  const items = getMenuItems();
  const base = REMOTE ? (rStart(), rCats || []) : lCats();
  return base.map((c) => ({ ...c, items: items.filter((i) => i.category === c.name).length }));
}
function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => { if (e.key === IKEY || e.key === CKEY) fn(); };
  if (!REMOTE && typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (!REMOTE && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}
export function useMenuItems() {
  const [v, setV] = useState(getMenuItems);
  useEffect(() => { setV(getMenuItems()); return subscribe(() => setV(getMenuItems())); }, []);
  return v;
}
export function useMenuCategories() {
  const [v, setV] = useState(getMenuCategories);
  useEffect(() => { setV(getMenuCategories()); return subscribe(() => setV(getMenuCategories())); }, []);
  return v;
}

/* ---------------- item CRUD ---------------- */
const err = (label) => ({ error }) => {
  if (error) {
    reportError(`${label} failed: ${error.message}`);
    pushNotification({ type: "system", title: "Menu update failed", body: `${label}: ${error.message}` });
  }
};
export function saveItem(data) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    if (!requireTenant("save this item")) return;
    const row = {
      restaurant_id: rid(), name: data.name, description: data.desc || "",
      price: data.price, food_type: data.type, category_id: catIdByName(data.category),
      image_url: data.image || "", status: data.status || "active",
      popular: !!data.popular, special: !!data.special,
    };
    const q = data.id
      ? sb.from("menu_items").update(row).eq("id", data.id)
      : sb.from("menu_items").insert(row);
    q.then(err("save item")).then(rFetch);
    return;
  }
  const prev = lItems();
  lWrite(IKEY, data.id
    ? prev.map((i) => (i.id === data.id ? { ...i, ...data } : i))
    : [{ ...data, id: Math.max(0, ...prev.map((p) => +p.id || 0)) + 1 }, ...prev]);
}
export function duplicateItem(item) {
  const copy = { ...item, id: undefined, name: item.name + " (copy)", special: false };
  saveItem(copy);
}
export function removeItem(id) {
  if (readOnlyBlocked()) return;
  if (REMOTE) { sb.from("menu_items").delete().eq("id", id).then(err("delete item")).then(rFetch); return; }
  lWrite(IKEY, lItems().filter((i) => i.id !== id));
}
export function setItemStatus(id, status) {
  if (readOnlyBlocked()) return;
  if (REMOTE) { sb.from("menu_items").update({ status }).eq("id", id).then(err("item status")).then(rFetch); return; }
  lWrite(IKEY, lItems().map((i) => (i.id === id ? { ...i, status } : i)));
}

/* ---------------- category CRUD ---------------- */
export function addCategory({ name, emoji }) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    if (!requireTenant("add a category")) return;
    const sort = (rCats?.length || 0) + 1;
    sb.from("menu_categories").insert({ restaurant_id: rid(), name, emoji, sort })
      .then(err("add category")).then(rFetch);
    return;
  }
  const prev = lCats();
  lWrite(CKEY, [...prev, { id: Math.max(0, ...prev.map((x) => +x.id || 0)) + 1, name, emoji, items: 0, active: true, color: "#F6EFE6" }]);
}
export function renameCategory(id, name) {
  if (readOnlyBlocked()) return;
  if (REMOTE) { sb.from("menu_categories").update({ name }).eq("id", id).then(err("rename category")).then(rFetch); return; }
  lWrite(CKEY, lCats().map((c) => (c.id === id ? { ...c, name } : c)));
}
export function toggleCategory(id) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    const cur = (rCats || []).find((c) => c.id === id);
    sb.from("menu_categories").update({ active: !cur?.active }).eq("id", id).then(err("toggle category")).then(rFetch);
    return;
  }
  lWrite(CKEY, lCats().map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
}
export function deleteCategory(id) {
  if (readOnlyBlocked()) return;
  if (REMOTE) { sb.from("menu_categories").delete().eq("id", id).then(err("delete category")).then(rFetch); return; }
  lWrite(CKEY, lCats().filter((c) => c.id !== id));
}
export function moveCategory(id, dir) {
  if (readOnlyBlocked()) return;
  if (REMOTE) {
    const list = rCats || [];
    const i = list.findIndex((c) => c.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    Promise.all([
      sb.from("menu_categories").update({ sort: j + 1 }).eq("id", list[i].id),
      sb.from("menu_categories").update({ sort: i + 1 }).eq("id", list[j].id),
    ]).then(rFetch);
    return;
  }
  const c = lCats(); const i = c.findIndex((x) => x.id === id), j = i + dir;
  if (j < 0 || j >= c.length) return;
  const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; lWrite(CKEY, n);
}
