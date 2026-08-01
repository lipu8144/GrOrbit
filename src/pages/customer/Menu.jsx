import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Search, Plus, Minus, ShoppingBag, X, Star, Flame, Clock, Check,
  ChefHat, Package, ArrowLeft, MapPin, Utensils, RefreshCw,
  Phone, Mail, Instagram, Facebook, MessageCircle, Gift, ChevronRight, PartyPopper,
  Ticket, Copy, Sparkles, Tag, Download } from "lucide-react";
import { CAT_EMOJI } from "../../data/menu";
import { useMenuItems, useMenuCategories } from "../../lib/menuStore";
import { placeOrder as storePlaceOrder, usePlacedOrder, useSessionOrders, updateOrderStatus, getPlacedOrder, fetchOrderById } from "../../lib/orderStore";
import { groupTag } from "../../lib/groupTag";
import { useRestaurant } from "../../lib/restaurantStore";
import { pushNotification } from "../../lib/notificationStore";
import { validateCoupon, computeDiscount, getActiveCoupons, publicCoupons, validateCouponRemote, redeemCouponRemote, issueCouponRemote, myActiveCoupons, COUPONS_REMOTE } from "../../lib/coupons";
import { isBlocked, blockFor, blockRemaining } from "../../lib/deviceBlock";
import { printBill } from "../../lib/download";
import { visitInfoRemote, visitInfoLocal, attachPhoneRemote } from "../../lib/coupons";
import { sb, REMOTE, setRid, rid } from "../../lib/supabaseClient";
import { startSession, sessionExpired, clearSession, touchSession } from "../../lib/menuSession";

const BRAND = "#E08A5B";
const BRAND_DARK = "#C97245";
const CHARCOAL = "#1F2937";
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

// Veg / non-veg FSSAI-style mark
function FoodMark({ type }) {
  const c = type === "veg" ? "#16A34A" : "#DC2626";
  return (
    <span className="inline-grid place-items-center shrink-0" style={{ width: 14, height: 14, border: `1.5px solid ${c}`, borderRadius: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />
    </span>
  );
}

function ItemRow({ item, qty, onAdd, onSub }) {
  const out = item.status === "outofstock";
  return (
    <div className={`flex gap-3 py-4 ${out ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <FoodMark type={item.type} />
          {item.popular && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "#F6EFE6", color: BRAND }}><Flame size={9} />Popular</span>}
          {item.special && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "#FEF3C7", color: "#B45309" }}><Star size={9} />Special</span>}
        </div>
        <h3 className="font-bold text-[15px] leading-tight" style={{ color: CHARCOAL }}>{item.name}</h3>
        <p className="text-sm font-semibold mt-0.5" style={{ color: CHARCOAL }}>{inr(item.price)}</p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.desc}</p>
      </div>
      <div className="relative shrink-0">
        <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden">
          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />}
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[84px]">
          {out ? (
            <div className="text-center text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded-lg py-1.5 shadow-sm">Sold out</div>
          ) : qty === 0 ? (
            <button onClick={onAdd} className="w-full bg-white border rounded-lg py-1.5 text-xs font-extrabold shadow-sm active:scale-95 transition" style={{ borderColor: BRAND, color: BRAND }}>ADD +</button>
          ) : (
            <div className="w-full bg-white border rounded-lg flex items-center justify-between px-2 py-1 shadow-sm" style={{ borderColor: BRAND }}>
              <button onClick={onSub} className="p-0.5" style={{ color: BRAND }}><Minus size={14} /></button>
              <span className="text-sm font-extrabold" style={{ color: BRAND }}>{qty}</span>
              <button onClick={onAdd} className="p-0.5" style={{ color: BRAND }}><Plus size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { key: "new", label: "Order placed", icon: Check, sub: "Sent to the kitchen" },
  { key: "preparing", label: "Preparing", icon: ChefHat, sub: "Your food is being made" },
  { key: "ready", label: "Ready to collect", icon: Package, sub: "Pick up at the counter" },
];


// Send the code to the customer's own WhatsApp (self-delivery — no SMS API
// needed). If the restaurant has a WhatsApp number, the message goes to that
// chat so the customer keeps it in history AND the restaurant sees the lead.
function waSaveLink(code, restaurant, waNumber) {
  const text = encodeURIComponent(`My ${restaurant} reward code: ${code} 🎁 (single-use, keep this safe!)`);
  const num = (waNumber || "").replace(/[^0-9]/g, "");
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}

function CountdownTimer({ order, prepMins }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const start = order.startedAt || order.placedAt;
  const target = start + prepMins * 60 * 1000;
  const remain = target - Date.now();
  const total = prepMins * 60 * 1000;
  const pct = Math.max(0, Math.min(100, Math.round(((total - remain) / total) * 100)));
  const mm = Math.max(0, Math.floor(remain / 60000));
  const ss = Math.max(0, Math.floor((remain % 60000) / 1000));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: "#F6EFE6" }}>
        <Clock size={22} style={{ color: BRAND }} />
      </div>
      <div className="flex-1 min-w-0">
        {remain > 0 ? (
          <>
            <p className="font-extrabold text-lg tabular-nums" style={{ color: CHARCOAL }}>{mm}:{String(ss).padStart(2, "0")} <span className="text-xs font-semibold text-gray-400">min left</span></p>
            <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: BRAND }} /></div>
          </>
        ) : (
          <p className="font-bold text-sm" style={{ color: CHARCOAL }}>Any moment now… 🍳<span className="block text-xs font-medium text-gray-400 mt-0.5">Taking a little longer than usual — thanks for waiting!</span></p>
        )}
      </div>
    </div>
  );
}

function OrderStatus({ orderId, snapshot, onNewOrder, onReview, onCancel, settings, restaurant, onBrowse, siblings, onPickOrder }) {
  const [showSpin, setShowSpin] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const selfCancel = useRef(false);
  // Live status comes from the shared store, so the kitchen marking it
  // "preparing"/"ready" in the dashboard updates this screen in real time.
  const live = usePlacedOrder(orderId);
  // Keep the freshest order we've ever seen. During a realtime refetch the live
  // cache is briefly empty; without this we'd fall back to the stale initial
  // snapshot and the status would flicker BACKWARDS (e.g. ready → preparing).
  const RANK = { new: 0, preparing: 1, ready: 2, completed: 3, cancelled: 3 };
  const autoReviewed = useRef(false);
  const [best, setBest] = useState(snapshot);
  // When the viewed order changes (switching in the "Your orders" list), clear
  // the never-regress tracker — otherwise a lower-status order (e.g. preparing)
  // would be rejected in favour of the previous order's higher status.
  useEffect(() => { setBest(getPlacedOrder(orderId) || snapshot || null); }, [orderId]);
  useEffect(() => {
    const candidate = live || snapshot;
    if (!candidate || candidate.id !== orderId) return;   // ignore stale order data
    setBest((prev) => {
      if (prev && prev.id !== orderId) return candidate;   // different order → take it
      return (!prev || RANK[candidate.status] >= RANK[prev.status]) ? candidate : prev;
    });
  }, [live, snapshot, orderId]);
  const order = best || live || snapshot;
  const rawStatus = (order?.status === "completed" ? "ready" : order?.status) || "new";
  const status = ["new", "preparing", "ready"].includes(rawStatus) ? rawStatus : "new";
  const cancelled = order?.status === "cancelled";
  const byRestaurant = cancelled && !selfCancel.current;

  useEffect(() => {
    if (cancelled && order?.blockDevice) blockFor(24);
  }, [cancelled, order?.blockDevice]);

  // Auto-open feedback ONLY when an order transitions to completed while the
  // customer is watching it (the natural "meal just finished" moment). If they
  // manually open an ALREADY-completed order from their list, show its details
  // with a back button instead of bouncing them to feedback.
  const seenKey = "qm_reviewed_orders_v1";
  const alreadyReviewed = (id) => { try { return (JSON.parse(localStorage.getItem(seenKey)) || []).includes(id); } catch { return false; } };
  const markReviewed = (id) => { try { const l = JSON.parse(localStorage.getItem(seenKey)) || []; if (!l.includes(id)) localStorage.setItem(seenKey, JSON.stringify([id, ...l].slice(0, 50))); } catch {} };
  // "All orders done" = every session order is completed or cancelled, and at
  // least one actually completed (so an all-cancelled group doesn't prompt).
  // Guard against stale/partial data: require the current order to be present
  // and settled too, so a single early completion can't trip the whole group.
  const groupOrders = (siblings && siblings.length ? siblings : (order ? [order] : []));
  const currentSettled = !order || order.status === "completed" || order.status === "cancelled";
  const allSettled = groupOrders.length > 0
    && groupOrders.every((o) => o.status === "completed" || o.status === "cancelled")
    && currentSettled;
  const anyCompleted = groupOrders.some((o) => o.status === "completed");
  const allDone = allSettled && anyCompleted;
  const groupKey = groupOrders.map((o) => o.id).sort().join(",");
  useEffect(() => {
    // Auto-open feedback once, only when the WHOLE group is finished — not when
    // a single order in a multi-order visit completes ahead of the others.
    if (allDone && !autoReviewed.current && !alreadyReviewed(groupKey)) {
      autoReviewed.current = true;
      markReviewed(groupKey);
      onReview();
    }
  }, [allDone, groupKey, onReview]);

  // A gentle one-time buzz the moment THIS order flips to ready, so a customer
  // who looked away knows to collect. Guarded so it fires once per order.
  const buzzedRef = useRef(false);
  useEffect(() => {
    if (order?.status === "ready" && !buzzedRef.current) {
      buzzedRef.current = true;
      try { navigator.vibrate?.([120, 60, 120]); } catch {}
    }
    if (order?.status && order.status !== "ready") buzzedRef.current = false;
  }, [order?.status]);

  const idx = STEPS.findIndex((s) => s.key === status);

  // Restored order still hydrating from the server (remote mode after reload)
  if (!order) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "#FAFAFA" }}>
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: BRAND }} />
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        {byRestaurant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 text-center qm-pop">
              <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: "#FEF2F2" }}><X size={26} className="text-rose-500" /></div>
              <h2 className="text-lg font-extrabold" style={{ color: CHARCOAL }}>Order cancelled by the restaurant</h2>
              <p className="text-sm text-gray-500 mt-1.5">We're sorry — your order {order.token} had to be cancelled. Nothing has been charged. Please check with our staff at the counter.</p>
              <button onClick={onNewOrder} className="w-full mt-5 py-3 rounded-xl font-bold text-sm text-white" style={{ background: BRAND }}>Okay</button>
            </div>
          </div>
        )}
        <div>
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 grid place-items-center mx-auto mb-4"><X size={28} className="text-gray-300" /></div>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Order cancelled</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">Your order {order.token} was cancelled. Nothing to pay — hope to see you again soon!</p>
          <button onClick={onNewOrder} className="mt-5 px-5 py-3 rounded-xl font-bold text-sm text-white inline-flex items-center gap-2" style={{ background: BRAND }}><Plus size={16} />Order something else</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA" }}>
      <div className="px-5 pt-10 pb-8 text-white text-center transition-colors duration-500" style={{ background: status === "ready" ? "linear-gradient(160deg, #10B981, #059669)" : `linear-gradient(160deg, ${BRAND}, ${BRAND_DARK})` }}>
        <p className="text-sm font-medium text-white/80">Your token number</p>
        <p className="text-6xl font-extrabold tracking-tight mt-1">{order.token}</p>
        {groupTag(order.phone) && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-2">
            <span className="text-2xl">{groupTag(order.phone).animal}</span>
            <div className="text-left leading-tight">
              <p className="text-[10px] text-white/80 font-semibold uppercase tracking-wide">Your tag</p>
              <p className="text-sm font-extrabold">{groupTag(order.phone).animal} {groupTag(order.phone).code}</p>
            </div>
          </div>
        )}
        <p className="text-sm text-white/90 mt-2">{groupTag(order.phone) ? "Show your tag at the counter — all your orders are linked to it" : "Show this at the counter to collect your order"}</p>
        <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur">
          {status === "ready" ? <><Package size={13} />Ready to collect</> : status === "preparing" ? <><ChefHat size={13} />Preparing now</> : <><Clock size={13} />Order received</>}
        </span>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          {STEPS.map((s, i) => {
            const done = i <= idx;
            const active = i === idx;
            return (
              <div key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full grid place-items-center transition-all" style={{ background: done ? BRAND : "#F3F4F6", color: done ? "#fff" : "#9CA3AF" }}>
                    <s.icon size={16} />
                  </div>
                  {i < STEPS.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ minHeight: 26, background: i < idx ? BRAND : "#E5E7EB" }} />}
                </div>
                <div className="pb-5">
                  <p className="font-bold text-sm flex items-center gap-2" style={{ color: done ? CHARCOAL : "#9CA3AF" }}>
                    {s.label}{active && <span className="w-1.5 h-1.5 rounded-full qm-pulse" style={{ background: BRAND }} />}
                  </p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {status === "ready" && (
          <div className="mb-4 rounded-2xl p-5 text-white text-center shadow-md qm-pop" style={{ background: "linear-gradient(135deg, #10B981, #047857)" }}>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 grid place-items-center mb-2 qm-pulse">
              <Package size={28} />
            </div>
            <p className="text-lg font-extrabold">Your order is ready! 🎉</p>
            <p className="text-sm text-white/90 mt-0.5">
              {groupTag(order.phone)
                ? <>Show <span className="font-bold">{groupTag(order.phone).animal} {groupTag(order.phone).code}</span> at the counter to collect</>
                : <>Show token <span className="font-bold">{order.token}</span> at the counter to collect</>}
            </p>
          </div>
        )}

        {status !== "ready" && <CountdownTimer order={order} prepMins={settings.prepTimeMins || 15} />}

        {status !== "ready" && (
          <button onClick={() => setShowSpin(true)} className="w-full mb-4 p-4 rounded-2xl text-white flex items-center gap-3 text-left shadow-sm active:scale-[0.99] transition" style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
            <div className="w-11 h-11 rounded-xl bg-white/20 grid place-items-center text-2xl">🎰</div>
            <div className="flex-1"><p className="font-extrabold text-sm">Spin & win while you wait</p><p className="text-xs text-white/85">Unlock a coupon for your next visit</p></div>
            <ChevronRight size={18} />
          </button>
        )}

        {status === "new" && (
          !confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)} className="w-full mb-4 py-3 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-200">
              Cancel order
            </button>
          ) : (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <p className="text-sm font-bold text-rose-700">Cancel this order?</p>
              <p className="text-xs text-rose-600/80 mt-0.5">You can only cancel before the kitchen accepts it.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200" style={{ color: CHARCOAL }}>Keep order</button>
                <button onClick={() => { selfCancel.current = true; onCancel(order.id, order.token); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600">Yes, cancel</button>
              </div>
            </div>
          )
        )}
        {status === "preparing" && (
          <p className="text-[11px] text-gray-400 text-center mb-4">Kitchen has started your order — to change or cancel it now, please ask our staff at the counter.</p>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Order summary</p>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-sm py-1.5">
              <FoodMark type={it.type} />
              <span className="flex-1 text-gray-600"><span className="font-bold">{it.qty}×</span> {it.name}</span>
              <span className="font-semibold" style={{ color: CHARCOAL }}>{inr(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="pt-3 mt-2 border-t border-gray-100 space-y-1">
            {order.discount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm text-gray-500"><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-600"><span>Discount ({order.coupon})</span><span>−{inr(order.discount)}</span></div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="font-bold" style={{ color: CHARCOAL }}>Total · Pay at counter</span>
              <span className="text-lg font-extrabold" style={{ color: CHARCOAL }}>{inr(order.total)}</span>
            </div>
          </div>
          {order.customer && order.customer !== "Guest" && <p className="text-xs text-gray-400 mt-3">Order for <span className="font-semibold text-gray-600">{order.customer}</span></p>}
        </div>

        {(status === "ready" || order?.status === "completed") && (
          <button onClick={() => printBill(order, restaurant)} className="w-full mt-3 py-3 rounded-xl text-sm font-bold border border-gray-200 bg-white flex items-center justify-center gap-2 hover:bg-gray-50" style={{ color: CHARCOAL }}>
            <Download size={15} /> Download bill
          </button>
        )}

        {allDone && (
          <button onClick={onReview} className="w-full mt-4 py-4 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm qm-pop" style={{ background: BRAND }}>
            <Star size={17} className="fill-white" />Rate your meal & unlock a reward
          </button>
        )}
        {siblings && siblings.length >= 1 && (() => {
          // Show every ACTIVE order (new/preparing/ready) plus only the 2 most
          // recent finished ones (completed/cancelled), so the list stays short.
          const isActive = (o) => ["new", "preparing", "ready"].includes(o.status);
          const active = siblings.filter(isActive);
          const finished = siblings
            .filter((o) => !isActive(o))
            .sort((a, b) => (b.placedAt || 0) - (a.placedAt || 0))
            .slice(0, 2);
          // keep the currently-viewed order visible even if it's older
          const current = siblings.find((o) => o.id === orderId);
          const visible = [...active, ...finished];
          if (current && !visible.some((o) => o.id === current.id)) visible.push(current);
          // preserve original order for a stable list
          const ordered = siblings.filter((o) => visible.some((v) => v.id === o.id));
          return (
          <div className="mt-4 rounded-2xl border border-gray-100 overflow-hidden">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 px-3.5 pt-3 pb-2">{ordered.length > 1 ? "Your orders" : "Your order"}</p>
            {ordered.map((so) => {
              const st = so.status === "completed" ? "Completed" : so.status === "ready" ? "Ready ✓" : so.status === "preparing" ? "Preparing" : so.status === "cancelled" ? "Cancelled" : "Received";
              const tint = so.status === "ready" ? "#059669" : so.status === "completed" ? "#6B7280" : so.status === "cancelled" ? "#DC2626" : "#D97706";
              const isCurrent = so.id === orderId;
              return (
                <button key={so.id} onClick={() => !isCurrent && onPickOrder && onPickOrder(so.id)} disabled={isCurrent}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left border-t border-gray-50 ${isCurrent ? "bg-gray-50" : "hover:bg-gray-50"}`}
                  style={so.status === "ready" ? { background: "#ECFDF5" } : {}}>
                  <span className="flex items-center gap-2">
                    <span className="font-extrabold tabular-nums" style={{ color: BRAND, fontSize: 16 }}>{so.token}</span>
                    {isCurrent && <span className="text-[10px] font-bold text-gray-400">(viewing)</span>}
                    {so.status === "ready" && <span className="text-[10px] font-bold text-emerald-600">· collect now</span>}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: tint, background: tint + "1A" }}>{st}</span>
                </button>
              );
            })}
          </div>
          );
        })()}
        <button onClick={onBrowse} className="w-full mt-3 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: BRAND }}>
          <Plus size={16} />Add more items
        </button>
        <button onClick={onNewOrder} className="w-full mt-2 py-3 rounded-xl font-bold text-sm border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2" style={{ color: CHARCOAL }}>
          Start a fresh order
        </button>
      </div>

      {showSpin && <SpinGame settings={settings} order={order} onClose={() => setShowSpin(false)} />}
    </div>
  );
}

function GrowthButton({ icon: Icon, label, sub, color, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition text-left">
      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: color + "1A" }}><Icon size={19} style={{ color }} /></div>
      <div className="flex-1 min-w-0"><p className="font-bold text-sm" style={{ color: CHARCOAL }}>{label}</p>{sub && <p className="text-[11px] text-gray-400">{sub}</p>}</div>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  );
}

const REELS = ["🍔", "🍕", "☕", "🍦", "⭐", "🎁"];
// Reward table — always wins something; jackpot (3 matching) is rarer.
const PRIZES = [
  { code: "SPIN15", label: "15% OFF", desc: "Jackpot! 15% off your next 3 visits", jackpot: true, weight: 1, discount: { type: "percent", value: 15, max: 120 }, days: 45 },
  { code: "TREAT30", label: "₹30 OFF", desc: "₹30 off your next visit", jackpot: false, weight: 3, discount: { type: "flat", value: 30 }, days: 30 },
  { code: "LUCKY5", label: "5% OFF", desc: "5% off your next visit", jackpot: false, weight: 5, discount: { type: "percent", value: 5 }, days: 30 },
];
function pickPrize() {
  const pool = PRIZES.flatMap((p) => Array(p.weight).fill(p));
  return pool[Math.floor(Math.random() * pool.length)];
}

// Spin-to-win shown while the order is being prepared — turns wait time into a
// reason to come back. The reward screen also nudges social follows.
// In remote mode the prize is minted server-side: a unique, single-use code
// bound to the phone on THIS order (issue_coupon RPC).
function SpinGame({ settings, order, onClose }) {
  const g = settings.growth;
  const [reels, setReels] = useState(["🍔", "🍕", "☕"]);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState(null);
  const [realCode, setRealCode] = useState(null);   // server-issued unique code
  const [issueErr, setIssueErr] = useState("");
  const [needPhone, setNeedPhone] = useState(false);
  const [capPhone, setCapPhone] = useState("");
  const [capBusy, setCapBusy] = useState(false);
  const doIssue = async (prizeObj) => {
    const res = await issueCouponRemote(order.id, "spin", prizeObj.discount, prizeObj.days);
    if (res.ok) { setRealCode(res.code); setNeedPhone(false); }
    else setIssueErr(res.error || "Couldn't issue the reward — ask our staff.");
  };
  const claimWithPhone = async () => {
    setIssueErr(""); setCapBusy(true);
    const att = await attachPhoneRemote(order.id, capPhone);
    setCapBusy(false);
    if (!att.ok) { setIssueErr(att.error); return; }
    order.phone = capPhone;                 // reflect locally for the note
    await doIssue(prize);
  };
  const [copied, setCopied] = useState(false);
  const open = (url) => window.open(url, "_blank", "noreferrer");

  const spin = () => {
    if (spinning) return;
    setSpinning(true); setPrize(null); setRealCode(null); setIssueErr("");
    const p = pickPrize();
    const iv = setInterval(() => setReels([rnd(), rnd(), rnd()]), 90);
    setTimeout(async () => {
      clearInterval(iv);
      const face = REELS[Math.floor(Math.random() * REELS.length)];
      setReels(p.jackpot ? [face, face, face] : [REELS[0], REELS[1], REELS[2]]);
      setPrize(p); setSpinning(false);
      if (COUPONS_REMOTE && order?.id) {
        if (!order.phone) { setNeedPhone(true); return; }   // capture moment!
        await doIssue(p);
      }
    }, 1600);
  };
  const rnd = () => REELS[Math.floor(Math.random() * REELS.length)];
  const shownCode = realCode || prize?.code;
  const copy = () => { navigator.clipboard?.writeText(shownCode); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden qm-pop">
        <div className="px-5 py-4 text-white text-center relative" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <button onClick={onClose} className="absolute right-3 top-3 text-white/80 hover:text-white"><X size={18} /></button>
          <p className="font-extrabold text-lg flex items-center justify-center gap-2"><Sparkles size={18} />Spin & win</p>
          <p className="text-xs text-white/85">While your food is being made 🍳</p>
        </div>

        <div className="p-6">
          <div className="flex justify-center gap-2 mb-5">
            {reels.map((r, i) => (
              <div key={i} className={`w-20 h-20 rounded-2xl bg-gray-50 border-2 grid place-items-center text-4xl ${spinning ? "qm-spin" : ""}`} style={{ borderColor: prize && prize.jackpot ? BRAND : "#E5E7EB" }}>{r}</div>
            ))}
          </div>

          {!prize ? (
            <button onClick={spin} disabled={spinning} className="w-full py-3.5 rounded-xl font-extrabold text-white text-sm disabled:opacity-60" style={{ background: BRAND }}>
              {spinning ? "Spinning…" : "Spin now"}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: BRAND }}>{prize.label}</p>
              <p className="text-sm text-gray-500 mb-3">{prize.desc}</p>
              <button onClick={copy} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed font-extrabold font-mono tracking-wide mb-1" style={{ borderColor: BRAND, color: BRAND }}>
                {copied ? <><Check size={16} />Copied!</> : <>{shownCode} <Copy size={14} /></>}
              </button>
              {realCode && <>
                <p className="text-[11px] text-emerald-600 font-semibold mb-1">Saved to your number {order?.phone} · single-use · valid {prize.days} days</p>
                <a href={waSaveLink(realCode, settings.name || "restaurant", settings.growth?.whatsapp?.number)} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg mb-2" style={{ background: "#DCFCE7", color: "#15803D" }}>
                  <MessageCircle size={12} /> Save code to WhatsApp
                </a>
              </>}
              {needPhone && !realCode && (
                <div className="text-left bg-violet-50 rounded-xl p-3 mb-2">
                  <p className="text-[11px] font-bold text-violet-700 mb-1.5">📱 Enter your number to claim this prize</p>
                  <div className="flex gap-2">
                    <input value={capPhone} onChange={(e) => setCapPhone(e.target.value)} placeholder="+91…" className="flex-1 px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none" />
                    <button onClick={claimWithPhone} disabled={capBusy} className="px-3.5 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: "#7C3AED" }}>{capBusy ? "…" : "Claim"}</button>
                  </div>
                  <p className="text-[10px] text-violet-500/80 mt-1.5">The coupon locks to this number — that's how we know it's you next visit.</p>
                </div>
              )}
              {issueErr && <p className="text-[11px] text-amber-600 mb-2">{issueErr}</p>}
              {!realCode && !issueErr && <div className="mb-2" />}
              <p className="text-[11px] text-gray-400 mb-2">Follow us so you don't miss it 👇</p>
              <div className="flex justify-center gap-2">
                {g.instagram.on && <button onClick={() => open(g.instagram.url)} className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "#E1306C1A" }}><Instagram size={18} style={{ color: "#E1306C" }} /></button>}
                {g.facebook.on && <button onClick={() => open(g.facebook.url)} className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "#1877F21A" }}><Facebook size={18} style={{ color: "#1877F2" }} /></button>}
                {g.whatsapp.on && <button onClick={() => open(`https://wa.me/${g.whatsapp.number.replace(/[^0-9]/g, "")}`)} className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "#25D3661A" }}><MessageCircle size={18} style={{ color: "#25D366" }} /></button>}
              </div>
              <button onClick={onClose} className="w-full mt-4 py-2.5 text-sm font-bold text-gray-400">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shown after the meal is served — asks for a review, social follows, and hands
// out a next-visit coupon. Everything here is configured from the dashboard.
function ReviewScreen({ settings, restaurant, order, onDone, onBack }) {
  const g = settings.growth;
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  // Next-visit reward: in live mode this is a REAL unique code minted for
  // this order's phone (single-use, 30 days). Demo shows the static code.
  const [nextCode, setNextCode] = useState(null);
  const [nextNote, setNextNote] = useState("");
  const [giftNeedPhone, setGiftNeedPhone] = useState(false);
  const [giftPhone, setGiftPhone] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);   // reward unlocks only after a Google review
  const rw = g.nextVisit || {};                         // restaurant-configured reward
  const rwValue = Number(rw.value) || 30;
  const rwMin = Number(rw.minOrder) || 199;
  const rwDays = Number(rw.days) || 30;
  const rwType = rw.type === "percent" ? "percent" : "flat";
  const rwLabel = rwType === "percent" ? `${rwValue}% off` : `₹${rwValue} off`;
  const issueNext = (ph) => issueCouponRemote(order.id, "next_visit", { type: rwType, value: rwValue, minOrder: rwMin }, rwDays).then((res) => {
    if (res.ok) { setNextCode(res.code); setGiftNeedPhone(false); setNextNote(`Locked to ${ph} · single use · valid ${rwDays} days · on orders above ₹${rwMin}`); }
    else if (/already claimed/i.test(res.error || "")) setNextNote("You've already claimed this order's reward — check your earlier code!");
    else setNextNote(res.error || "Reward unavailable right now.");
  });
  const claimGift = async () => {
    setGiftBusy(true); setNextNote("");
    const att = await attachPhoneRemote(order.id, giftPhone);
    setGiftBusy(false);
    if (!att.ok) { setNextNote(att.error); return; }
    order.phone = giftPhone;
    issueNext(giftPhone);
  };
  // Unlock the reward — called ONLY after the customer leaves a Google review.
  const unlockReward = () => {
    setReviewDone(true);
    // Unified gate: the next-visit reward is controlled by growth.nextVisit.on
    // (set in Storefront OR Settings→Ordering — they're the same field now).
    if (!rw.on) return;
    if (!COUPONS_REMOTE) { setNextCode(`NEXT-${(rw.type === "percent" ? rwValue + "PCT" : rwValue)}`); return; }
    if (!order?.id) return;
    if (!order?.phone) { setGiftNeedPhone(true); return; }   // capture moment!
    issueNext(order.phone);
  };
  const open = (url) => window.open(url, "_blank", "noreferrer");
  const happy = rating >= 4;
  const who = order?.customer && order.customer !== "Guest" ? order.customer : "A guest";

  const sendHappy = () => {
    open(g.google.url);
    pushNotification({ type: "review", title: `New ${rating}★ review request`, body: `${who} was sent to Google to review.` });
    setSubmitted(true);
    unlockReward();                                   // review leaves → reward unlocks
  };
  const sendPrivate = () => {
    // Low ratings are routed privately to the owner — NOT to Google.
    pushNotification({
      type: "feedback", title: `New ${rating}★ feedback needs attention`,
      body: feedback.trim() || "(no message left)",
      rating, customer: who, phone: order?.phone || "",
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="px-5 pt-10 pb-7 text-white text-center" style={{ background: `linear-gradient(160deg, ${BRAND}, ${BRAND_DARK})` }}>
        <PartyPopper size={30} className="mx-auto mb-2" />
        <h1 className="text-xl font-extrabold">Thanks for dining with us!</h1>
        <p className="text-sm text-white/85 mt-1">How was your experience at {restaurant}?</p>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-4">
        {/* rating */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => { setRating(n); setSubmitted(false); }} className="active:scale-90 transition">
                <Star size={34} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
              </button>
            ))}
          </div>

          {rating > 0 && !submitted && happy && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-3">So glad you enjoyed it! A quick Google review helps us a lot 🙏</p>
              {g.google.on && <button onClick={sendHappy} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: BRAND }}>Leave a Google review</button>}
            </div>
          )}
          {rating > 0 && !submitted && !happy && (
            <div className="mt-4 text-left">
              <p className="text-sm text-gray-500 mb-2">Sorry it wasn't perfect. Tell us what we can fix — this goes straight to the owner.</p>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Your feedback..." className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
              <button onClick={sendPrivate} className="w-full mt-2 py-3 rounded-xl text-white font-bold text-sm" style={{ background: BRAND }}>Send private feedback</button>
            </div>
          )}
          {submitted && <p className="mt-4 text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1.5"><Check size={16} />Thank you for your feedback!</p>}
        </div>

        {/* next-visit coupon */}
        {order?.items?.length > 0 && (
          <button onClick={() => printBill(order, restaurant)} className="w-full py-3 rounded-xl text-sm font-bold border border-gray-200 bg-white flex items-center justify-center gap-2 hover:bg-gray-50" style={{ color: CHARCOAL }}>
            <Download size={15} /> Download bill
          </button>
        )}

        {rw.on && (
          <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, #8B5CF6, #6D28D9)` }}>
            <div className="flex items-center gap-2 mb-1"><Gift size={18} /><span className="font-bold text-sm">A gift for your next visit</span></div>
            {!reviewDone && !nextCode ? (
              <div className="mt-1">
                <p className="text-sm text-white/90 font-semibold">⭐ Review us to unlock your reward!</p>
                <p className="text-xs text-white/75 mt-1">Leave us a quick Google review above, and your next-visit reward appears here instantly.</p>
                {g.google.on && (
                  <button onClick={() => { setRating((r) => r || 5); sendHappy(); }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-white/20 border border-white/40">
                    <Star size={13} className="fill-white" /> Review us for your reward
                  </button>
                )}
              </div>
            ) : (
              <>
                {nextCode && <><p className="text-2xl font-extrabold tracking-wide font-mono">{nextCode}</p>
                  <p className="text-sm text-white/85">{COUPONS_REMOTE ? `${rwLabel} on your next order` : rwLabel}</p>
                  <a href={waSaveLink(nextCode, restaurant, g.whatsapp?.number)} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg mt-2 bg-white/20 border border-white/40">
                    <MessageCircle size={13} /> Save code to WhatsApp
                  </a></>}
                {!nextCode && giftNeedPhone && (
                  <div className="mt-1">
                    <p className="text-xs text-white/85 mb-2">📱 Enter your number to receive your reward</p>
                    <div className="flex gap-2">
                      <input value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} placeholder="+91…" className="flex-1 px-3 py-2 text-sm text-gray-800 bg-white rounded-lg focus:outline-none" />
                      <button onClick={claimGift} disabled={giftBusy} className="px-3.5 rounded-lg text-xs font-bold bg-white/20 border border-white/40 disabled:opacity-50">{giftBusy ? "…" : "Claim"}</button>
                    </div>
                  </div>
                )}
                {!nextCode && !giftNeedPhone && <p className="text-sm text-white/85">Preparing your reward…</p>}
                {nextNote && <p className="text-[11px] text-white/70 mt-1.5">{nextNote}</p>}
              </>
            )}
          </div>
        )}

        {/* social follows */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Stay connected</p>
          {g.instagram.on && <GrowthButton icon={Instagram} label="Follow on Instagram" sub="Specials, behind the scenes & more" color="#E1306C" onClick={() => open(g.instagram.url)} />}
          {g.facebook.on && <GrowthButton icon={Facebook} label="Like us on Facebook" sub="Updates & events" color="#1877F2" onClick={() => open(g.facebook.url)} />}
          {g.whatsapp.on && <GrowthButton icon={MessageCircle} label="Get updates on WhatsApp" sub="Offers straight to your phone" color="#25D366" onClick={() => open(`https://wa.me/${g.whatsapp.number.replace(/[^0-9]/g, "")}`)} />}
        </div>

        <div className="flex gap-2">
          {onBack && <button onClick={onBack} className="flex-1 py-3.5 rounded-xl font-bold text-sm border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5" style={{ color: CHARCOAL }}><ArrowLeft size={15} />Back to my order</button>}
          <button onClick={onDone} className="flex-1 py-3.5 rounded-xl font-bold text-sm border border-gray-200 bg-white hover:bg-gray-50" style={{ color: CHARCOAL }}>Done</button>
        </div>
      </div>
    </div>
  );
}



function CustomerMenuInner({ restaurantName }) {
  const { slug } = useParams();
  const restaurant = restaurantName ||
    (slug || "restaurant").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  const settings = useRestaurant();
  const menuItems = useMenuItems();
  const menuCats = useMenuCategories();
  const visible = menuItems.filter((m) => m.status !== "hidden");
  const [cart, setCart] = useState({});       // id -> qty
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const ACTIVE_KEY = "qm_active_order_v1";
  const MYORDERS_KEY = "qm_my_orders_v1";
  const [placedId, setPlacedId] = useState(() => {
    try {
      const id = localStorage.getItem(ACTIVE_KEY);
      if (!id) return null;
      const o = getPlacedOrder(id);
      // demo: restore only live orders; remote: cache may still be loading, so
      // trust the stored id and let the live subscription hydrate it
      return o ? (o.status === "cancelled" ? null : id) : id;
    } catch { return null; }
  });
  const [snapshot, setSnapshot] = useState(() => {
    if (!placedId) return null;
    const fromStore = getPlacedOrder(placedId);
    if (fromStore) return fromStore;
    try {
      const snap = JSON.parse(localStorage.getItem("qm_active_order_snap_v1"));
      return snap && snap.id === placedId ? snap : null;   // instant, offline-safe restore
    } catch { return null; }
  });

  // A remembered order must resolve, never hang: fetch it by id directly.
  // Finished (completed/cancelled) or missing → forget it and show the menu.
  useEffect(() => {
    if (!placedId || snapshot || getPlacedOrder(placedId)) return;
    let alive = true;
    console.log("[GrOrbit] hydrating remembered order:", placedId);
    // Retry: right after placing, the insert may still be in flight — a reload
    // in that window must WAIT for the row, not conclude the order is gone.
    const attempt = (n) => {
      fetchOrderById(placedId).then((o) => {
        if (!alive) return;
        if (o && o.status === "cancelled") {
          try { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem("qm_active_order_snap_v1"); } catch {}
          setPlacedId(null); setSnapshot(null);
        } else if (o) {
          setSnapshot(o);   // completed included → OrderStatus auto-opens feedback
        } else if (n < 4) {
          console.log(`[GrOrbit] order not found yet — retry ${n + 1}/4`);
          setTimeout(() => alive && attempt(n + 1), 1200);
        } else {
          console.log("[GrOrbit] remembered order missing after retries — back to menu");
          try { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem("qm_active_order_snap_v1"); } catch {}
          setPlacedId(null); setSnapshot(null);
        }
      });
    };
    attempt(0);
    return () => { alive = false; };
  }, [placedId, snapshot]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(() => { try { return localStorage.getItem("qm_customer_phone_v1") || ""; } catch { return ""; } });
  const [coupon, setCoupon] = useState(null);     // applied coupon object
  const [couponInput, setCouponInput] = useState("");
  const [recovered, setRecovered] = useState([]);
  const [offers, setOffers] = useState([]);   // the restaurant's own active coupons
  useEffect(() => {
    let alive = true;
    publicCoupons().then((list) => { if (alive) setOffers(list || []); });
    return () => { alive = false; };
  }, []);
  const [recoverNote, setRecoverNote] = useState("");
  const recoverCodes = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setRecoverNote("Enter your phone number above first, then tap again."); return; }
    setRecoverNote("Looking up your codes…");
    const list = await myActiveCoupons(phone);
    setRecovered(list);
    setRecoverNote(list.length ? "Tap a code to apply it:" : "No active reward codes found for this number.");
  };
  const [couponErr, setCouponErr] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [foodFilter, setFoodFilter] = useState("all");   // all | veg | nonveg
  const [orderType, setOrderType] = useState("dinein");   // dinein | parcel
  const PHONE_KEY = "qm_customer_phone_v1";
  const [returning, setReturning] = useState(false);       // phone seen before?
  const [visitNo, setVisitNo] = useState(1);                 // which visit is this?
  const [blocked, setBlocked] = useState(isBlocked);
  const [reviewing, setReviewing] = useState(false);
  // Inactivity expiry that SURVIVES REFRESH: we stamp the last-activity time in
  // localStorage. On load, if the gap already exceeds the window, the session
  // is expired immediately — refreshing can't be used to dodge the timeout.
  const ACTIVITY_KEY = "qm_last_activity_v1";
  // Inactivity window: the restaurant's configured menu-session minutes, or a
  // sensible 15-min default. (Owner sets this in Settings → Ordering.)
  const idleMins = (settings?.menuSessionMins && settings.menuSessionMins > 0) ? settings.menuSessionMins : 15;
  const idleExceeded = () => {
    try {
      const t = Number(localStorage.getItem(ACTIVITY_KEY));
      return t && (Date.now() - t > idleMins * 60000);
    } catch { return false; }
  };
  const [expired, setExpired] = useState(idleExceeded);

  // Session inactivity timer
  const timer = useRef(null);
  const resetSession = () => {
    try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch {}
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setExpired(true), idleMins * 60000);
  };
  useEffect(() => {
    // If they already idled past the window before this mount (e.g. refreshed
    // after stepping away), expire now instead of granting a fresh timer.
    if (idleExceeded()) { setExpired(true); return; }
    resetSession();
    return () => timer.current && clearTimeout(timer.current);
  }, []);

  // Count real interaction as activity: taps, scrolls, key presses. This keeps
  // an actively-browsing customer alive even if they haven't ordered yet, while
  // a phone left untouched on the table expires on schedule.
  useEffect(() => {
    if (expired) return;
    let raf = null;
    const bump = () => {
      // throttle to at most once every few seconds to avoid thrashing storage
      if (raf) return;
      raf = setTimeout(() => { raf = null; if (!expired) resetSession(); }, 3000);
    };
    const evts = ["pointerdown", "keydown", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => { evts.forEach((e) => window.removeEventListener(e, bump)); if (raf) clearTimeout(raf); };
  }, [expired]);

  // Also re-check the moment the tab becomes visible again (backgrounded tabs
  // don't fire timers reliably on mobile).
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && idleExceeded()) setExpired(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const add = (id) => { resetSession(); setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 })); };
  const sub = (id) => { resetSession(); setCart((c) => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; }); };

  const lines = Object.entries(cart)
    .map(([id, qty]) => { const m = visible.find((x) => String(x.id) === id); return m ? { ...m, qty } : null; })
    .filter(Boolean);   // an item the owner just removed/hid drops out of the cart safely
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = coupon ? computeDiscount(coupon, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { setReturning(false); setVisitNo(1); return; }
    let alive = true;
    const apply = (info) => { if (alive) { setReturning(info.returning); setVisitNo(info.visits + 1); } };
    if (COUPONS_REMOTE) visitInfoRemote(phone).then(apply);
    else apply(visitInfoLocal(phone));
    return () => { alive = false; };
  }, [phone]);

  const applyCoupon = async (code) => {
    setCouponErr("");
    if (COUPONS_REMOTE) {
      setCouponBusy(true);
      const res = await validateCouponRemote(code, phone, subtotal);
      setCouponBusy(false);
      if (res.ok) { setCoupon(res.coupon); setCouponInput(res.coupon.code); }
      else { setCoupon(null); setCouponErr(res.error); }
      return;
    }
    const res = validateCoupon(code, subtotal, phone);
    if (res.ok) { setCoupon(res.coupon); setCouponErr(""); setCouponInput(res.coupon.code); }
    else { setCoupon(null); setCouponErr(res.error); }
  };
  const clearCoupon = () => { setCoupon(null); setCouponInput(""); setCouponErr(""); };

  const shown = visible.filter((m) =>
    (cat === "All" || m.category === cat) &&
    (foodFilter === "all" || m.type === foodFilter) &&
    (m.name.toLowerCase().includes(query.toLowerCase()) || m.desc.toLowerCase().includes(query.toLowerCase()))
  );
  const cats = ["All", ...menuCats.filter((c) => c.active).map((c) => c.name)];
  const catEmoji = Object.fromEntries(menuCats.map((c) => [c.name, c.emoji]));
  const offersActive = (settings.offers || []).filter((o) => o.active);
  const specialItems = (settings.specials || []).map((id) => visible.find((m) => m.id === id)).filter(Boolean);

  const [closedNow, setClosedNow] = useState(false);
  const placeOrder = async () => {
    // Re-verify the restaurant is still accepting orders AT THE MOMENT of
    // placing — the customer may have had the menu open when the owner toggled
    // off. This is the authoritative check; the load-time one is just an early
    // exit. Without this, a stale open tab could still push orders through.
    if (COUPONS_REMOTE) {
      try {
        const { data } = await sb.from("restaurants").select("settings").eq("id", rid()).maybeSingle();
        const st = data?.settings || {};
        const accepting = st.ordering?.acceptingOrders !== false;
        const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
        const closedToday = !!(st.closedDays && st.closedDays[today]);
        if (!accepting || closedToday) { setClosedNow(true); return; }
      } catch { /* if the check itself fails, fall through — don't block a real customer on a network blip */ }
    }
    let finalDiscount = discount;
    // Personal one-time codes are actually burned here — atomically, phone-bound.
    if (COUPONS_REMOTE && coupon?.issued) {
      setCouponBusy(true);
      const res = await redeemCouponRemote(coupon.code, phone, subtotal);
      setCouponBusy(false);
      if (!res.ok) { setCouponErr(res.error); setCoupon(null); return; }
      finalDiscount = res.discount;
    }
    const token = 200 + Math.floor(Math.random() * 60) + 1;
    const order = storePlaceOrder({
      token: `#${token}`,
      customer: name.trim() || "Guest",
      phone: phone.trim(),
      type: orderType,
      restaurant,
      items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price, type: l.type })),
      subtotal,
      coupon: coupon ? coupon.code : null,
      discount: finalDiscount,
      total: Math.max(0, subtotal - finalDiscount),
    });
    setSnapshot(order);
    setPlacedId(order.id);
    const nextIds = [order.id, ...myOrderIds.filter((x) => x !== order.id)].slice(0, 20);
    setMyOrderIds(nextIds);
    try {
      localStorage.setItem(ACTIVE_KEY, order.id);
      localStorage.setItem("qm_active_order_snap_v1", JSON.stringify(order));
      localStorage.setItem("qm_my_orders_v1", JSON.stringify(nextIds));
    } catch {}
    pushNotification({ type: "order", title: `New order ${order.token} received`, body: `${order.customer} · ${order.items.reduce((n, i) => n + i.qty, 0)} items · ₹${Math.max(0, subtotal - finalDiscount)}` });
    if (phone.replace(/\D/g, "").length >= 10) { try { localStorage.setItem("qm_customer_phone_v1", phone.trim()); } catch {} }
    try { touchSession(rid()); } catch {}
    setBrowsingWithOrder(false);   // surface the new order status
    setCart({}); setCartOpen(false); setName(""); clearCoupon();
  };

  const cancelOrder = (id, token) => {
    updateOrderStatus(id, "cancelled");
    pushNotification({ type: "order", title: `Order ${token} cancelled`, body: "Cancelled by the customer before the kitchen accepted it." });
  };

  const [browsingWithOrder, setBrowsingWithOrder] = useState(false);
  const [myOrderIds, setMyOrderIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qm_my_orders_v1")) || []; } catch { return []; }
  });
  const sessionOrders = useSessionOrders(myOrderIds);   // live — updates on every status change
  const reset = () => { setBrowsingWithOrder(false); try { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem("qm_active_order_snap_v1"); } catch {} setBlocked(isBlocked()); setExpired(false); setPlacedId(null); setSnapshot(null); setReviewing(false); setCart({}); setPhone(""); clearCoupon(); resetSession(); };

  if (blocked) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div>
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 grid place-items-center mx-auto mb-4 text-3xl">🚫</div>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Ordering paused on this device</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">Online ordering from this device has been temporarily restricted. Please order at the counter — our staff will be happy to help.</p>
          <p className="text-xs font-bold text-gray-400 mt-3">Try again in {blockRemaining()}</p>
        </div>
      </div>
    );
  }

  if (expired && !placedId) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div>
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 grid place-items-center mx-auto mb-4"><Clock size={28} className="text-gray-300" /></div>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Session expired</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">For security, your ordering session ended after {idleMins} minutes of inactivity. Please scan the QR code again.</p>
          <button onClick={reset} className="mt-5 px-5 py-3 rounded-xl font-bold text-sm text-white inline-flex items-center gap-2" style={{ background: BRAND }}><RefreshCw size={16} />Scan again</button>
        </div>
      </div>
    );
  }

  const pickOrder = (id) => {
    // seed the view from whatever we already know about this order (board cache
    // or the session strip), so switching never lands on a blank screen while
    // the authoritative fetch catches up.
    const seed = getPlacedOrder(id) || sessionOrders.find((o) => o.id === id) || null;
    setPlacedId(id);
    setSnapshot(seed);
    setBrowsingWithOrder(false);
    try { localStorage.setItem(ACTIVE_KEY, id); if (seed) localStorage.setItem("qm_active_order_snap_v1", JSON.stringify(seed)); } catch {}
  };

  if (reviewing) return <ReviewScreen settings={settings} restaurant={restaurant} order={snapshot} onDone={reset} onBack={() => setReviewing(false)} />;
  if (placedId && !browsingWithOrder) return <OrderStatus orderId={placedId} snapshot={snapshot} onNewOrder={reset} onReview={() => setReviewing(true)} onCancel={cancelOrder} settings={settings} restaurant={restaurant} onBrowse={() => setBrowsingWithOrder(true)} siblings={sessionOrders} onPickOrder={pickOrder} />;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#FAFAFA", fontFamily: "Inter, system-ui, sans-serif" }}>
      {placedId && browsingWithOrder && (
        <button onClick={() => setBrowsingWithOrder(false)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-2"
          style={{ background: BRAND }}>
          <Clock size={14} /> Back to my order{myOrderIds.length > 1 ? "s" : ""}
        </button>
      )}
      {/* header */}
      <div className="px-5 pt-7 pb-5 text-white" style={settings.bannerUrl ? { backgroundImage: `linear-gradient(160deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${settings.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: `linear-gradient(160deg, ${BRAND}, ${BRAND_DARK})` }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center text-2xl overflow-hidden bg-cover bg-center" style={settings.logoUrl ? { backgroundImage: `url(${settings.logoUrl})` } : {}}>{!settings.logoUrl && "🍽️"}</div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold leading-tight">{restaurant}</h1>
              <p className="text-xs text-white/85 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5"><Star size={11} className="fill-white" />4.8</span>
                <span className="flex items-center gap-0.5"><Clock size={11} />~{settings.prepTimeMins} min</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
            <span className="bg-white/20 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1"><Utensils size={11} />Scan & order</span>
            <span className="bg-white/20 backdrop-blur rounded-full px-2.5 py-1">Pay at counter</span>
          </div>
        </div>
      </div>

      {/* search + legend */}
      <div className="max-w-md mx-auto px-5 -mt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu..." className="w-full pl-10 pr-3 py-3 text-sm bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          {[["all", "All", null], ["veg", "Veg", "veg"], ["nonveg", "Non-veg", "nonveg"]].map(([k, label, mark]) => (
            <button key={k} onClick={() => setFoodFilter(k)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition"
              style={foodFilter === k
                ? { borderColor: k === "nonveg" ? "#B91C1C" : k === "veg" ? "#15803D" : BRAND, background: k === "nonveg" ? "#FEF2F2" : k === "veg" ? "#F0FDF4" : "#F6EFE6", color: k === "nonveg" ? "#B91C1C" : k === "veg" ? "#15803D" : BRAND }
                : { borderColor: "#E5E7EB", color: "#6B7280" }}>
              {mark && <FoodMark type={mark} />}{label}
            </button>
          ))}
        </div>
      </div>

      {/* offers & specials (managed from the dashboard) */}
      {!query && (cat === "All") && (offersActive.length > 0 || specialItems.length > 0) && (
        <div className="max-w-md mx-auto px-5 mt-4 space-y-3">
          {offersActive.map((o) => (
            <div key={o.id} className="rounded-2xl p-3.5 flex items-center gap-3 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
              <span className="text-2xl">{o.emoji}</span>
              <div className="min-w-0"><p className="font-bold text-sm leading-tight">{o.title}</p><p className="text-xs text-white/90">{o.text}</p></div>
            </div>
          ))}
          {specialItems.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1"><Flame size={12} style={{ color: BRAND }} />Today's specials</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {specialItems.map((it) => (
                  <button key={it.id} onClick={() => add(it.id)} className="shrink-0 w-36 bg-white rounded-2xl border border-orange-100 p-2 text-left active:scale-95 transition shadow-sm">
                    <div className="w-full h-20 rounded-xl bg-gray-100 overflow-hidden mb-1.5">{it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />}</div>
                    <div className="flex items-center gap-1"><FoodMark type={it.type} /><p className="text-xs font-bold truncate" style={{ color: CHARCOAL }}>{it.name}</p></div>
                    <div className="flex items-center justify-between mt-0.5"><span className="text-xs font-semibold" style={{ color: BRAND }}>{inr(it.price)}</span><span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: BRAND }}>ADD</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* category tabs */}
      <div className="sticky top-0 z-20 bg-[#FAFAFA]/95 backdrop-blur mt-3">
        <div className="max-w-md mx-auto px-5 py-2.5 flex gap-2 overflow-x-auto no-scrollbar">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border"
              style={cat === c ? { background: BRAND, color: "#fff", borderColor: BRAND } : { background: "#fff", color: "#6B7280", borderColor: "#E5E7EB" }}>
              {c === "All" ? "All" : `${catEmoji[c] || CAT_EMOJI[c] || "🍽️"} ${c}`}
            </button>
          ))}
        </div>
      </div>

      {/* items */}
      <div className="max-w-md mx-auto px-5">
        {shown.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">No items match your search.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {shown.map((item) => <ItemRow key={item.id} item={item} qty={cart[item.id] || 0} onAdd={() => add(item.id)} onSub={() => sub(item.id)} />)}
          </div>
        )}
      </div>

      {/* about + contact (managed from the dashboard) */}
      <div className="max-w-md mx-auto px-5 mt-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-sm mb-1.5" style={{ color: CHARCOAL }}>About {restaurant}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{settings.about}</p>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            <a href={`tel:${settings.contact.phone}`} className="flex items-center gap-2.5 text-sm text-gray-600"><Phone size={15} style={{ color: BRAND }} />{settings.contact.phone}</a>
            <a href={`mailto:${settings.contact.email}`} className="flex items-center gap-2.5 text-sm text-gray-600"><Mail size={15} style={{ color: BRAND }} />{settings.contact.email}</a>
            <p className="flex items-start gap-2.5 text-sm text-gray-600"><MapPin size={15} style={{ color: BRAND }} className="mt-0.5 shrink-0" />{settings.contact.address}</p>
            <p className="flex items-center gap-2.5 text-sm text-gray-600"><Clock size={15} style={{ color: BRAND }} />{settings.contact.hours}</p>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-300 mt-5">Powered by GrOrbit</p>
      </div>

      {/* floating cart bar */}
      {count > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
          <button onClick={() => setCartOpen(true)} className="max-w-md mx-auto w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white shadow-xl active:scale-[0.99] transition" style={{ background: BRAND }}>
            <span className="bg-white/25 rounded-lg w-8 h-8 grid place-items-center font-extrabold text-sm">{count}</span>
            <span className="font-bold text-sm flex-1 text-left">View cart</span>
            <span className="font-extrabold">{inr(total)}</span>
            <ShoppingBag size={18} />
          </button>
        </div>
      )}

      {/* cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[88vh] flex flex-col qm-slide max-w-md mx-auto w-full">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><ArrowLeft size={18} /></button>
              <p className="font-bold" style={{ color: CHARCOAL }}>Your order</p>
              <span className="text-xs text-gray-400">{count} item{count > 1 ? "s" : ""}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <FoodMark type={l.type} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{l.name}</p><p className="text-xs text-gray-400">{inr(l.price)}</p></div>
                  <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1" style={{ borderColor: BRAND }}>
                    <button onClick={() => sub(l.id)} style={{ color: BRAND }}><Minus size={14} /></button>
                    <span className="text-sm font-extrabold w-4 text-center" style={{ color: BRAND }}>{l.qty}</span>
                    <button onClick={() => add(l.id)} style={{ color: BRAND }}><Plus size={14} /></button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right" style={{ color: CHARCOAL }}>{inr(l.price * l.qty)}</span>
                </div>
              ))}

              <div className="mt-4">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">How would you like it?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["dinein", "🍽️", "Dine-in", "Served at the restaurant"], ["parcel", "🥡", "Parcel", "Packed to take away"]]
                    .filter(([k]) => (settings.ordering?.[k] !== false))
                    .map(([k, emoji, label, sub]) => (
                    <button key={k} onClick={() => setOrderType(k)} className="rounded-xl border p-3 text-left transition" style={orderType === k ? { borderColor: BRAND, background: "#F6EFE6" } : { borderColor: "#E5E7EB" }}>
                      <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: orderType === k ? BRAND : CHARCOAL }}>{emoji} {label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Your name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav" className="w-full px-3.5 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91…" className="w-full px-3.5 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
                  <p className="text-[10px] mt-1" style={{ color: phone.replace(/\D/g, "").length >= 10 ? "#059669" : "#9CA3AF" }}>
                    {phone.replace(/\D/g, "").length >= 10
                      ? (returning ? `✓ Welcome back — visit #${visitNo}! Your rewards apply to this number` : "🎁 Offers unlocked for this number")
                      : "🎁 Add your number to unlock coupons & earn next-visit rewards"}
                  </p>
                </div>
                <p className="col-span-2 text-[11px] text-gray-400 flex items-center gap-1"><Gift size={11} style={{ color: BRAND }} />Add your number to get a coupon & order updates on WhatsApp.</p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              {/* coupon */}
              <div className="mb-3">
                {!coupon ? (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponErr(""); }} placeholder="Coupon code" className="w-full pl-9 pr-3 py-2.5 text-sm uppercase bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
                      </div>
                      <button onClick={() => applyCoupon(couponInput)} disabled={!couponInput.trim() || couponBusy} className="px-4 rounded-xl text-sm font-bold border disabled:opacity-40" style={{ borderColor: BRAND, color: BRAND }}>{couponBusy ? "…" : "Apply"}</button>
                    </div>
                    {couponErr && <p className="text-[11px] text-rose-500 mt-1.5">{couponErr}</p>}
                    {COUPONS_REMOTE && (
                      <button onClick={recoverCodes} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 mt-1.5">
                        Lost your reward code? Find it →
                      </button>
                    )}
                    {recovered.length > 0 && (
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        {recovered.map((c) => (
                          <button key={c.code} onClick={() => applyCoupon(c.code)} className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg border border-dashed" style={{ borderColor: BRAND, color: BRAND }}>{c.code}</button>
                        ))}
                      </div>
                    )}
                    {recoverNote && <p className="text-[11px] text-gray-400 mt-1">{recoverNote}</p>}
                    {!COUPONS_REMOTE && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                      {getActiveCoupons().filter((c) => c.type !== "Spin reward" && !(c.discount?.firstVisitOnly && returning)).map((c) => (
                        <button key={c.code} onClick={() => applyCoupon(c.code)} className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50">{c.code}</button>
                      ))}
                    </div>
                    )}
                    {COUPONS_REMOTE && offers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Available offers</p>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {offers.filter((c) => !(c.discount?.firstVisitOnly && returning)).map((c) => (
                          <button key={c.code} onClick={() => applyCoupon(c.code)} title={c.desc || ""} className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-dashed hover:bg-orange-50" style={{ borderColor: BRAND, color: BRAND }}>{c.code}</button>
                        ))}
                      </div>
                    </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <Tag size={15} className="text-emerald-600" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-emerald-700">{coupon.code} applied</p><p className="text-[11px] text-emerald-600">{coupon.desc}</p></div>
                    <button onClick={clearCoupon} className="text-emerald-600 hover:text-emerald-800"><X size={16} /></button>
                  </div>
                )}
              </div>

              {/* totals */}
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-sm text-gray-500"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
                {discount > 0 && <div className="flex items-center justify-between text-sm font-semibold text-emerald-600"><span>Discount ({coupon.code})</span><span>−{inr(discount)}</span></div>}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-500">Total · <span className="font-semibold text-gray-700">Pay at counter</span></span>
                  <span className="text-xl font-extrabold" style={{ color: CHARCOAL }}>{inr(total)}</span>
                </div>
              </div>
              {closedNow && (
                <div className="mb-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-center" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>
                  🌙 Sorry, the restaurant just stopped taking orders. Please check at the counter.
                </div>
              )}
              <button onClick={placeOrder} className="w-full py-3.5 rounded-xl font-extrabold text-white text-sm active:scale-[0.99] transition shadow-sm" style={{ background: BRAND }}>
                Place order · Get token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Resolves /r/:slug to the actual restaurant (id + name) before the menu and
// its stores mount, so every store fetches THIS restaurant's data — not the
// default demo tenant.
export default function CustomerMenu() {
  const { slug } = useParams();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fresh")) {
    try { localStorage.removeItem("qm_active_order_v1"); localStorage.removeItem("qm_active_order_snap_v1"); } catch {}
  }
  const [state, setState] = useState(REMOTE ? { ready: false } : { ready: true, name: null });

  useEffect(() => {
    if (!REMOTE) return;
    let alive = true;
    console.log("[GrOrbit] resolving restaurant for slug:", slug);
    const timeout = setTimeout(() => {
      if (alive) setState({ ready: true, failed: "Timed out reaching the server. Check your internet connection and the Supabase project status." });
    }, 10000);
    sb.from("restaurants").select("id, name, status, menu_session_mins, settings").eq("slug", slug).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        clearTimeout(timeout);
        console.log("[GrOrbit] restaurant lookup result:", { data, error: error?.message });
        if (error) { setState({ ready: true, failed: error.message }); return; }
        if (!data) { setState({ ready: true, missing: true }); return; }
        if (data.status === "suspended") { setState({ ready: true, suspended: true, name: data.name }); return; }
        // Open/closed enforcement: master "accepting orders" toggle + closed-day.
        const st = data.settings || {};
        const accepting = st.ordering?.acceptingOrders !== false;   // default open
        const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
        const closedToday = !!(st.closedDays && st.closedDays[today]);
        if (!accepting || closedToday) {
          setState({ ready: true, closed: true, name: data.name, closedToday });
          return;
        }
        setRid(data.id);
        const params = new URLSearchParams(window.location.search);
        const isScan = params.has("src") || params.has("scan") || params.has("fresh");
        const windowMins = data.menu_session_mins ?? 0;   // 0 = feature off
        // A first-ever visit has no stored session yet — that's a fresh scan too,
        // not a stale bookmark. Only show the re-scan wall when there genuinely
        // WAS a session for this restaurant and it has since expired.
        let hadSession = false;
        try { const s = JSON.parse(localStorage.getItem("qm_menu_session_v1")); hadSession = !!(s && s.rid === data.id); } catch {}
        if (isScan || !hadSession) {
          startSession(data.id);                          // real scan or first visit → start clock
        } else if (sessionExpired(data.id, windowMins)) {
          setState({ ready: true, expiredScan: true, name: data.name });
          return;                                          // stale link → ask to re-scan
        }
        setState({ ready: true, name: data.name });
        // count this scan (once per session per source, so reloads don't inflate)
        try {
          const src = new URLSearchParams(window.location.search).get("src") || "direct";
          const key = `qm_scan_${data.id}_${src}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            sb.from("qr_scans").insert({ restaurant_id: data.id, src })
              .then(({ error }) => error && console.log("[GrOrbit] scan log:", error.message));
          }
        } catch {}
      })
      .catch((e) => {
        if (!alive) return;
        clearTimeout(timeout);
        console.error("[GrOrbit] restaurant lookup crashed:", e);
        setState({ ready: true, failed: e?.message || "Network request failed" });
      });
    return () => { alive = false; clearTimeout(timeout); };
  }, [slug]);

  if (state.failed) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div className="max-w-sm">
          <p className="text-4xl mb-3">📡</p>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Couldn't load the menu</h1>
          <pre className="text-left text-[11px] text-rose-600 bg-rose-50 rounded-xl p-3 mt-3 whitespace-pre-wrap">{state.failed}</pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: BRAND }}>Try again</button>
        </div>
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "#FAFAFA" }}>
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: BRAND }} />
      </div>
    );
  }
  if (state.missing) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div>
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Restaurant not found</h1>
          <p className="text-sm text-gray-500 mt-1.5">This QR link doesn't match any restaurant. Please ask the staff for the correct code.</p>
        </div>
      </div>
    );
  }
  if (state.expiredScan) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div className="max-w-xs">
          <p className="text-5xl mb-4">📷</p>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Please scan again</h1>
          <p className="text-sm text-gray-500 mt-1.5">For your security, this menu link has expired. Please rescan the QR code at your table or the counter to continue ordering.</p>
        </div>
      </div>
    );
  }

  if (state.suspended) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div>
          <p className="text-4xl mb-3">⏸️</p>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>{state.name} is currently unavailable</h1>
          <p className="text-sm text-gray-500 mt-1.5">Online ordering is paused. Please order at the counter.</p>
        </div>
      </div>
    );
  }
  if (state.closed) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: "#FAFAFA" }}>
        <div>
          <p className="text-4xl mb-3">🌙</p>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>{state.name} is closed right now</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto">
            {state.closedToday
              ? "We're closed today. Please check back during our opening hours."
              : "We're not taking online orders at the moment. Please check back soon or order at the counter."}
          </p>
        </div>
      </div>
    );
  }
  return <CustomerMenuInner restaurantName={state.name} />;
}
