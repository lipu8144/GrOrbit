// Coupon validation + discount math.
// DEMO MODE: validates against the static demo coupon list.
// REMOTE MODE: static marketing codes come from the `coupons` table; personal
// one-time codes (SPIN-XXXX…) are checked via check_coupon (no burn) and only
// actually redeemed at order placement via redeem_coupon (atomic).
import { COUPONS } from "../data/growth";
import { sb, REMOTE, rid } from "./supabaseClient";

export const getActiveCoupons = () => COUPONS.filter((c) => c.active);

export function computeDiscount(coupon, subtotal) {
  const d = coupon?.discount;
  if (!d) return 0;
  if (d.minOrder && subtotal < d.minOrder) return 0;
  let amt = d.type === "percent" ? Math.round((subtotal * d.value) / 100) : d.value;
  if (d.max) amt = Math.min(amt, d.max);
  return Math.min(amt, subtotal);
}

// demo mode: does this phone already have an order? (first-visit check)
function hasPriorOrderLocal(phone) {
  if (!phone) return false;
  try {
    const orders = JSON.parse(localStorage.getItem("qm_live_orders_v1")) || [];
    const clean = (p) => (p || "").replace(/\D/g, "");
    return orders.some((o) => clean(o.phone) && clean(o.phone) === clean(phone) && o.status !== "cancelled");
  } catch { return false; }
}

export function validateCoupon(code, subtotal, phone = "") {
  const c = COUPONS.find((x) => x.active && x.code.toUpperCase() === code.trim().toUpperCase());
  if (!c) return { ok: false, error: "Invalid or expired code" };
  if (c.discount?.firstVisitOnly) {
    if (!phone.trim()) return { ok: false, error: "Enter your phone number to use the welcome offer" };
    if (hasPriorOrderLocal(phone)) return { ok: false, error: "Welcome offer is for first-time visitors only" };
  }
  if (c.discount?.minOrder && subtotal < c.discount.minOrder)
    return { ok: false, error: `Add ₹${c.discount.minOrder - subtotal} more to use this` };
  return { ok: true, coupon: c, discount: computeDiscount(c, subtotal) };
}

// A "visit" = a calendar day with at least one non-cancelled order.
// Two orders during the same dinner are one visit.
export function countVisits(timestamps) {
  const days = new Set(timestamps.map((t) => new Date(t).toDateString()));
  return days.size;
}

// remote: full visit info for a phone at this restaurant
export async function visitInfoRemote(phone) {
  if (!phone?.trim()) return { returning: false, visits: 0 };
  const { data, error } = await sb.from("orders")
    .select("placed_at")
    .eq("restaurant_id", rid())
    .eq("customer_phone", phone.trim())
    .neq("status", "cancelled")
    .limit(200);
  if (error) { console.error("visit check:", error.message); return { returning: false, visits: 0 }; }
  const visits = countVisits((data || []).map((r) => r.placed_at));
  return { returning: visits > 0, visits };
}

// demo: same from localStorage
export function visitInfoLocal(phone) {
  if (!phone?.trim()) return { returning: false, visits: 0 };
  try {
    const orders = JSON.parse(localStorage.getItem("qm_live_orders_v1")) || [];
    const clean = (p) => (p || "").replace(/\D/g, "");
    const mine = orders.filter((o) => clean(o.phone) === clean(phone) && o.status !== "cancelled");
    const visits = countVisits(mine.map((o) => o.placedAt || Date.now()));
    return { returning: visits > 0, visits };
  } catch { return { returning: false, visits: 0 }; }
}

// kept for the welcome-offer check
export async function hasPriorOrderRemote(phone) {
  return (await visitInfoRemote(phone)).returning;
}

/* ---------------- remote (Supabase) ---------------- */

// Validate any code at "Apply" time. Static table codes first, then
// personal issued codes via RPC (no burn).
export async function validateCouponRemote(code, phone, subtotal) {
  const clean = code.trim().toUpperCase();
  // 1) static marketing coupons from the coupons table
  const { data: rows } = await sb.from("coupons")
    .select("code, description, discount")
    .eq("restaurant_id", rid()).eq("active", true).eq("code", clean).limit(1);
  if (rows?.length) {
    const c = { code: rows[0].code, desc: rows[0].description, discount: rows[0].discount };
    if (c.discount?.firstVisitOnly) {
      if (!phone?.trim()) return { ok: false, error: "Enter your phone number to use the welcome offer" };
      if (await hasPriorOrderRemote(phone)) return { ok: false, error: "Welcome offer is for first-time visitors only" };
    }
    if (c.discount?.minOrder && subtotal < c.discount.minOrder)
      return { ok: false, error: `Add ₹${c.discount.minOrder - subtotal} more to use this` };
    return { ok: true, coupon: c, discount: computeDiscount(c, subtotal) };
  }
  // 2) personal issued codes (phone-bound, single-use)
  const { data, error } = await sb.rpc("check_coupon", {
    p_code: clean, p_phone: phone || "", p_restaurant: rid(), p_subtotal: subtotal,
  });
  if (error) return { ok: false, error: "Could not check the code — try again" };
  if (!data?.ok) return { ok: false, error: data?.error || "Invalid code" };
  return {
    ok: true,
    coupon: { code: clean, desc: data.description, discount: data.rule, issued: true },
    discount: data.discount,
  };
}

// Burn a personal code at order placement (atomic, single-use, phone-bound).
export async function redeemCouponRemote(code, phone, subtotal) {
  const { data, error } = await sb.rpc("redeem_coupon", {
    p_code: code.trim().toUpperCase(), p_phone: phone || "",
    p_restaurant: rid(), p_subtotal: subtotal,
  });
  if (error) return { ok: false, error: "Redemption failed — try again" };
  return data?.ok ? { ok: true, discount: data.discount } : { ok: false, error: data?.error || "Invalid code" };
}

// Attach a phone to an order that was placed without one — only fills an
// empty phone (server-enforced). Returns true if captured.
// Recover unused coupons issued to a phone (lost-code flow).
// The restaurant's own active marketing coupons, to show on the customer cart.
// Excludes first-visit-only codes for returning customers, and personal codes.
export async function publicCoupons() {
  if (!REMOTE) return getActiveCoupons();
  const { data, error } = await sb.from("coupons")
    .select("code, description, discount, kind, active")
    .eq("restaurant_id", rid()).eq("active", true);
  if (error) { console.error("[GrOrbit] public coupons:", error.message); return []; }
  return (data || []).map((r) => ({
    code: r.code, desc: r.description, type: r.kind, discount: r.discount || {},
  }));
}

export async function myActiveCoupons(phone) {
  if (!phone?.trim()) return [];
  const { data, error } = await sb.rpc("my_active_coupons", { p_restaurant: rid(), p_phone: phone });
  if (error) { console.error("recover coupons:", error.message); return []; }
  return data || [];
}

export async function attachPhoneRemote(orderId, phone) {
  const { data, error } = await sb.rpc("attach_phone", { p_order: orderId, p_phone: phone });
  if (error) return { ok: false, error: error.message };
  return data ? { ok: true } : { ok: false, error: "This order already has a number attached" };
}

// Mint a real one-time reward for an accepted order (spin game, etc.).
export async function issueCouponRemote(orderId, kind, discount, days = 30) {
  const { data, error } = await sb.rpc("issue_coupon", {
    p_order: orderId, p_kind: kind, p_discount: discount, p_days: days,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, code: data };
}

export { REMOTE as COUPONS_REMOTE };
