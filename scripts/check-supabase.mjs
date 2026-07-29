#!/usr/bin/env node
// GrOrbit — Supabase health check.
// Run:  npm run check:supabase
// Reads .env, connects to your project and verifies every piece the app
// needs: keys, tables, seed data, RPC functions, and Realtime.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
let failures = 0;
function ok(label, extra = "") { console.log(`  ${green("✓")} ${label} ${dim(extra)}`); }
function bad(label, hint) { failures++; console.log(`  ${red("✗")} ${label}\n     ${dim("→ " + hint)}`); }
function fail(msg) { console.log(red("\n✗ " + msg + "\n")); process.exit(1); }

// ---- read .env (no extra deps) ------------------------------------
let env = {};
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  fail("No .env file found. Copy .env.example to .env and fill in your keys.");
}

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
const RID = env.VITE_RESTAURANT_ID || "00000000-0000-0000-0000-000000000001";

if (!URL || !KEY) fail("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in .env — the app is in demo mode.");

console.log(`\nGrOrbit Supabase check → ${dim(URL)}\n`);
const sb = createClient(URL, KEY);

// 1) connection + restaurants table + RLS public read
let RID_USE = RID;
const { data: rest, error: e1 } = await sb.from("restaurants").select("id, slug, name").eq("id", RID).maybeSingle();
if (e1) bad("Connect & read `restaurants`", e1.message + " — wrong URL/key, or 001_init.sql not run.");
else if (rest) ok("Connected · restaurants table · RLS read", `(${rest.name} / ${rest.slug})`);
else {
  // demo seed removed — fall back to the first real restaurant
  const { data: anyR, error: eAny } = await sb.from("restaurants").select("id, slug, name").limit(1).maybeSingle();
  if (eAny) bad("Connect & read `restaurants`", eAny.message);
  else if (!anyR) bad("A restaurant exists", "No restaurants at all — sign up in the app (or run seed.sql for the demo).");
  else { RID_USE = anyR.id; ok("Connected · restaurants table · RLS read", `(demo seed removed — using your restaurant: ${anyR.name} / ${anyR.slug})`); }
}

// 2) menu
const { data: items, error: e2 } = await sb.from("menu_items").select("id").eq("restaurant_id", RID_USE).limit(50);
if (e2) bad("menu_items table", e2.message);
else if (!items?.length) ok("menu_items table", "(0 items yet — add some in the dashboard)");
else ok("Menu seeded", `(${items.length} items)`);

// 3) coupons
const { data: cps, error: e3 } = await sb.from("coupons").select("code").eq("restaurant_id", RID_USE);
if (e3) bad("coupons table", e3.message);
else ok("Coupons seeded", `(${cps.length} codes: ${cps.slice(0, 3).map((c) => c.code).join(", ")}…)`);

// 4) RPCs from migrations 002/003
const { data: chk, error: e4 } = await sb.rpc("check_coupon", { p_code: "PING-000000", p_phone: "0", p_restaurant: RID_USE, p_subtotal: 100 });
if (e4) bad("check_coupon() RPC", e4.message + " — run migrations 002 and 003.");
else if (chk && chk.ok === false) ok("check_coupon() RPC", "(003 applied)");
const { error: e5 } = await sb.rpc("redeem_coupon", { p_code: "PING-000000", p_phone: "0", p_restaurant: RID_USE, p_subtotal: 100 });
if (e5) bad("redeem_coupon() RPC", e5.message + " — run migration 002.");
else ok("redeem_coupon() RPC", "(002 applied)");

// 4b) migration 004 functions exist (they require auth, so "permission" = installed)
const { error: e45 } = await sb.rpc("admin_tenants");
if (e45 && /could not find/i.test(e45.message)) bad("admin_tenants() RPC", "run migration 004_dashboard_functions.sql");
else ok("admin_tenants() RPC", "(004 applied — superadmin-only, as designed)");

// 4c) attach_phone (007)
const { error: e47 } = await sb.rpc("attach_phone", { p_order: "00000000-0000-0000-0000-00000000dead", p_phone: "0" });
if (e47 && /could not find/i.test(e47.message)) bad("attach_phone() RPC", "run migration 007_attach_phone.sql");
else ok("attach_phone() RPC", "(007 applied)");

// 4d) qr_scans (008)
const { error: e48 } = await sb.from("qr_scans").insert({ restaurant_id: RID_USE, src: "healthcheck" });
if (e48) bad("qr_scans table (scan tracking)", e48.message + " — run migration 008_qr_scans.sql");
else ok("qr_scans table (scan tracking)", "(008 applied)");

// 5) orders insert (spam guard path) — write then cancel a test order
// inserted directly as CANCELLED so it never appears on the live board
const { error: e6 } = await sb.from("orders").insert({
  restaurant_id: RID_USE, token: "#TEST", customer_name: "Health Check",
  order_type: "dinein", status: "cancelled", subtotal: 1, total: 1,
});
if (e6) bad("Place order (anon insert + spam-guard trigger)", e6.message);
else ok("Place order (anon insert + spam-guard trigger)", "(inserted as cancelled — never shows on the board)");

// 6) realtime
const rt = await new Promise((resolve) => {
  const t = setTimeout(() => resolve(false), 6000);
  sb.channel("healthcheck").subscribe((status) => {
    if (status === "SUBSCRIBED") { clearTimeout(t); resolve(true); }
  });
});
if (rt) ok("Realtime channel", "(live orders will stream)");
else bad("Realtime channel", "Could not subscribe in 6s — check project status / network.");

console.log(failures === 0
  ? green("\nAll checks passed — the app will run in LIVE mode against this project.\n")
  : red(`\n${failures} check(s) failed — fix the hints above, then re-run.\n`));
process.exit(failures === 0 ? 0 : 1);
