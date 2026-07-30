import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, RefreshCw, X, Clock, ShoppingBag, Power,
  IndianRupee, Activity, Timer, Maximize2, Minimize2,
  Bike, UtensilsCrossed, Phone, StickyNote, CheckCircle2, Plus,
  ArrowRight, Archive, CircleDot, Wallet, Bell, BellOff, XCircle, ChevronRight } from "lucide-react";

import { BRAND, CHARCOAL } from "../../lib/theme";

const COLUMNS = [
  { key: "new", label: "New Orders", color: "#2563EB", soft: "#EFF6FF", dot: "#3B82F6", action: "Start Preparing", next: "preparing" },
  { key: "preparing", label: "Preparing", color: "#D97706", soft: "#FFFBEB", dot: "#F59E0B", action: "Mark Ready", next: "ready" },
  { key: "ready", label: "Ready", color: "#059669", soft: "#ECFDF5", dot: "#10B981", action: "Complete Order", next: "completed" },
  { key: "completed", label: "Completed", color: "#6B7280", soft: "#F9FAFB", dot: "#9CA3AF", action: "Mark paid & clear", next: "archived" },
];
const COL_META = Object.fromEntries(COLUMNS.map(c => [c.key, c]));

import { SEED_ORDERS } from "../../data/orders";
import { REMOTE } from "../../lib/supabaseClient";
import { inr } from "../../lib/format";
import { useRestaurant, updateRestaurant } from "../../lib/restaurantStore";
import { groupTag, groupTint, phoneLast4 } from "../../lib/groupTag";
import { usePlacedOrders, updateOrderStatus, removeOrder } from "../../lib/orderStore";
import { pushNotification } from "../../lib/notificationStore";

const orderItemsSum = (o) => o.items.reduce((s, i) => s + i.price * i.qty, 0);
// The real amount the customer pays = stored total (already after any coupon).
const orderTotal = (o) => (typeof o.total === "number" ? o.total : orderItemsSum(o));
const fmtClock = (ms) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
};

// ── Small atoms ───────────────────────────────────────────────
function TypeBadge({ type, table }) {
  const dine = type === "dinein";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
      style={{ background: dine ? "#EEF2FF" : "#FFF7ED", color: dine ? "#4338CA" : "#C2410C" }}>
      {dine ? <UtensilsCrossed size={11} /> : <Bike size={11} />}
      {dine ? (table ? `Dine-in · T${table}` : "Dine-in · QR") : "Parcel"}
    </span>
  );
}
function PayBadge({ payment, method, big }) {
  const paid = payment === "paid";
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-lg ${big ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5"}`}
      style={{ background: paid ? "#ECFDF5" : "#FEF2F2", color: paid ? "#047857" : "#DC2626" }}>
      <Wallet size={big ? 13 : 11} />{paid ? `Paid · ${method}` : "Unpaid"}
    </span>
  );
}
function TimerChip({ ms, tone }) {
  const palette = {
    blue: { c: "#2563EB", b: "#EFF6FF" }, amber: { c: "#D97706", b: "#FFFBEB" },
    emerald: { c: "#059669", b: "#ECFDF5" }, red: { c: "#DC2626", b: "#FEF2F2" }, gray: { c: "#6B7280", b: "#F3F4F6" },
  }[tone] || { c: "#6B7280", b: "#F3F4F6" };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums" style={{ color: palette.c, background: palette.b }}>
      <Timer size={11} />{fmtElapsed(ms)}
    </span>
  );
}

// ── Order card (kanban) ───────────────────────────────────────
function OrderCard({ o, now, fresh, onAdvance, onClick, onDragStart }) {
  const col = COL_META[o.status];
  const total = orderTotal(o);
  let timerMs = now - o.placedAt, tone = "gray";
  if (o.status === "new") { timerMs = now - o.placedAt; tone = (now - o.placedAt) > 5 * 60000 ? "red" : "blue"; }
  else if (o.status === "preparing") { timerMs = now - (o.startedAt || o.placedAt); tone = timerMs > 10 * 60000 ? "red" : "amber"; }
  else if (o.status === "ready") { timerMs = now - (o.readyAt || o.placedAt); tone = timerMs > 8 * 60000 ? "red" : "emerald"; }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, o)}
      onClick={() => onClick(o)}
      className={`rounded-2xl border shadow-sm p-3.5 cursor-pointer hover:shadow-md transition-shadow ${fresh ? "qm-enter qm-fresh" : ""}`}
      style={{ borderColor: fresh ? BRAND : "#F1F1F4", background: groupTint(o.phone) || "#fff" }}
    >
      {/* token dominates */}
      <div className="flex items-start justify-between gap-2">
        <div className="leading-none">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Token</p>
          <p className="font-extrabold tracking-tight tabular-nums" style={{ color: BRAND, fontSize: "30px", lineHeight: 1 }}>{o.token}</p>
          {groupTag(o.phone) && <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/70 border border-black/5 text-[12px] font-bold" title="Same customer across orders">{groupTag(o.phone).animal} {groupTag(o.phone).code}</span>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <TypeBadge type={o.type} table={o.table} />
          <TimerChip ms={timerMs} tone={tone} />
        </div>
      </div>

      {/* customer */}
      <div className="flex items-center gap-2 mt-3">
        <span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0" style={{ background: col.soft, color: col.color }}>
          {o.customer[0]}
        </span>
        <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{o.customer}</span>
        {o.notes && <StickyNote size={13} className="text-amber-500 ml-auto" />}
      </div>

      {/* items */}
      <div className="mt-2.5 space-y-1">
        {o.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-[13px]">
            <span className="text-gray-600 truncate"><span className="font-bold text-gray-900">{it.qty}×</span> {it.name}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={11} />{fmtClock(o.placedAt)}</span>
        <span className="text-base font-extrabold flex items-center" style={{ color: CHARCOAL }}><IndianRupee size={14} className="-mr-0.5" />{total}</span>
      </div>

      {/* action */}
      <button
        onClick={(e) => { e.stopPropagation(); if (o.status === "completed") { if (window.confirm(`Mark order ${o.token} as paid and remove it from the board?`)) onAdvance(o); } else onAdvance(o); }}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-[.98]"
        style={{ background: o.status === "completed" ? CHARCOAL : col.color }}
      >
        {o.status === "completed" ? <Archive size={15} /> : null}
        {col.action}
        {o.status !== "completed" && <ArrowRight size={15} />}
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, tint, color, live }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: tint }}><Icon className="w-5 h-5" style={{ color }} /></div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-none flex items-center gap-1.5" style={{ color: CHARCOAL }}>
          {value}{live && <span className="qm-pulse w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />}
        </p>
        <p className="text-[11px] text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────
function Drawer({ o, onClose, onAdvance, onCancelOrder, allOrders }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [blockDev, setBlockDev] = useState(false);
  if (!o) return null;
  const total = orderTotal(o);
  const col = COL_META[o.status];
  const tag = groupTag(o.phone);
  const siblings = tag ? (allOrders || []).filter(x => x.phone && phoneLast4(x.phone) === tag.code && x.status !== "cancelled") : [o];
  const groupTotal = siblings.reduce((s2, x) => s2 + orderTotal(x), 0);
  const timeline = [
    { k: "Placed", at: o.placedAt },
    { k: "Preparing", at: o.startedAt },
    { k: "Ready", at: o.readyAt },
    { k: "Completed", at: o.completedAt },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col qm-slide">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="font-extrabold tabular-nums" style={{ color: BRAND, fontSize: 26 }}>{o.token}</span>
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: col.soft, color: col.color }}>{col.label}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* customer */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Customer</p>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full grid place-items-center font-bold text-white" style={{ background: BRAND }}>{o.customer[0]}</span>
              <div className="flex-1">
                <p className="font-bold" style={{ color: CHARCOAL }}>{o.customer}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} />{o.phone}</p>
              </div>
              <TypeBadge type={o.type} table={o.table} />
            </div>
          </section>

          {/* order summary */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Order summary</p>
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700"><span className="font-bold">{it.qty}×</span> {it.name}</span>
                  <span className="font-semibold flex items-center" style={{ color: CHARCOAL }}><IndianRupee size={13} />{it.price * it.qty}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-200">
                <span className="font-bold" style={{ color: CHARCOAL }}>Total</span>
                <span className="text-lg font-extrabold flex items-center" style={{ color: CHARCOAL }}><IndianRupee size={16} />{total}</span>
              </div>
              {o.discount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold mt-1">
                  <span>Coupon {o.coupon ? `(${o.coupon})` : ""} applied</span>
                  <span>−<IndianRupee size={11} className="inline -mt-0.5" />{o.discount} off ₹{orderItemsSum(o)}</span>
                </div>
              )}
              {tag && siblings.length > 1 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                      <span className="text-lg">{tag.animal}</span> {tag.label} · {siblings.length} orders
                    </span>
                    <span className="text-lg font-extrabold flex items-center" style={{ color: BRAND }}><IndianRupee size={16} />{groupTotal}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Same customer — collect {inr(groupTotal)} at the counter for all their orders (tokens {siblings.map(x => x.token).join(", ")}).</p>
                </div>
              )}
            </div>
          </section>

          {/* notes + payment */}
          <div className="grid grid-cols-1 gap-3">
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Notes</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                <StickyNote size={14} className="mt-0.5 shrink-0" />{o.notes || <span className="text-gray-400">No special instructions</span>}
              </div>
            </section>
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payment status</p>
              <PayBadge payment={o.payment} method={o.method} big />
            </section>
          </div>

          {/* timeline */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Order timeline</p>
            <div className="space-y-0">
              {timeline.map((t, i) => {
                const done = !!t.at;
                return (
                  <div key={t.k} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-3.5 h-3.5 rounded-full grid place-items-center shrink-0" style={{ background: done ? BRAND : "#E5E7EB" }}>
                        {done && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      {i < timeline.length - 1 && <span className="w-0.5 flex-1 my-0.5" style={{ background: done ? "#FFD9C7" : "#F3F4F6", minHeight: 22 }} />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-semibold" style={{ color: done ? CHARCOAL : "#9CA3AF" }}>{t.k}</p>
                      <p className="text-xs text-gray-400">{done ? fmtClock(t.at) : "Pending"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {o.status !== "completed" && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2.5">
            {!confirmCancel ? (
              <>
                <button onClick={() => { onAdvance(o); onClose(); }} className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: col.color }}>
                  {col.action}<ArrowRight size={16} />
                </button>
                <button onClick={() => setConfirmCancel(true)} className="w-full py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200">
                  Cancel order
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
                <p className="text-sm font-bold text-rose-700">Cancel {o.token}?</p>
                <p className="text-xs text-rose-600/80 mt-0.5">The customer will see a cancellation popup on their phone.</p>
                <label className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={blockDev} onChange={(e) => setBlockDev(e.target.checked)} className="accent-rose-600" />
                  Also block this device from ordering for 24 hours
                </label>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200" style={{ color: CHARCOAL }}>Keep order</button>
                  <button onClick={() => { onCancelOrder(o, blockDev); onClose(); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600">Cancel order</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kitchen display mode ──────────────────────────────────────
function KitchenView({ orders, now, onExit, onAdvance }) {
  const active = orders.filter(o => o.status === "new" || o.status === "preparing");
  const clock = new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return (
    <div className="fixed inset-0 z-[60] bg-[#0B0F19] text-white overflow-y-auto">
      <div className="sticky top-0 bg-[#0B0F19]/95 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="qm-pulse w-2.5 h-2.5 rounded-full" style={{ background: "#10B981" }} />
          <h1 className="text-lg font-extrabold tracking-tight">Kitchen Display</h1>
          <span className="text-white/40 text-sm">· {active.length} active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold tabular-nums text-white/80">{clock}</span>
          <button onClick={onExit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3.5 py-2 text-sm font-semibold"><Minimize2 size={16} />Exit</button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {active.map(o => {
          const prep = o.status === "preparing";
          const ms = prep ? now - (o.startedAt || o.placedAt) : now - o.placedAt;
          const late = prep ? ms > 10 * 60000 : ms > 5 * 60000;
          const accent = prep ? "#F59E0B" : "#3B82F6";
          return (
            <div key={o.id} className="rounded-3xl p-5 border-2" style={{ background: "#111726", borderColor: late ? "#EF4444" : accent + "55" }}>
              <div className="flex items-start justify-between">
                <span className="font-black tabular-nums" style={{ fontSize: 52, lineHeight: 0.95, color: BRAND }}>{o.token}</span>
                <div className="text-right">
                  <div className="px-3 py-1 rounded-lg text-sm font-bold inline-block" style={{ background: accent + "22", color: accent }}>
                    {prep ? "PREPARING" : "WAITING"}
                  </div>
                  <p className="font-black tabular-nums mt-1.5" style={{ fontSize: 30, color: late ? "#F87171" : "#fff" }}>{fmtElapsed(ms)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-white/50 text-sm font-semibold">
                {o.type === "dinein" ? <UtensilsCrossed size={14} /> : <Bike size={14} />}
                {o.type === "dinein" ? (o.table ? `Table ${o.table}` : "QR order") : "Parcel"} · {o.customer}
              </div>
              <div className="mt-4 space-y-2">
                {o.items.map((it, i) => (
                  <p key={i} className="font-bold" style={{ fontSize: 22 }}>
                    <span style={{ color: BRAND }}>{it.qty}×</span> {it.name}
                  </p>
                ))}
              </div>
              {o.notes && <p className="mt-3 text-amber-300 text-sm font-semibold flex items-start gap-1.5"><StickyNote size={15} className="mt-0.5 shrink-0" />{o.notes}</p>}
              <button onClick={() => onAdvance(o)} className="w-full mt-4 py-3 rounded-xl font-bold text-base" style={{ background: accent, color: "#0B0F19" }}>
                {prep ? "Mark Ready" : "Start Preparing"}
              </button>
            </div>
          );
        })}
        {active.length === 0 && (
          <div className="col-span-full text-center py-32 text-white/40">
            <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl font-bold">All caught up</p>
            <p className="text-sm">No orders in the queue right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
let nextId = 100, nextToken = 8343;
const NEW_CUSTOMERS = ["Anaya", "Vihaan", "Diya", "Reyansh", "Aria", "Kabir"];
const NEW_ITEMS = [
  [{ name: "Chicken Burger", qty: 2, price: 229 }, { name: "Cold Coffee", qty: 1, price: 149 }],
  [{ name: "Margherita Pizza", qty: 1, price: 279 }],
  [{ name: "Paneer Tikka Burger", qty: 1, price: 189 }, { name: "Mango Smoothie", qty: 2, price: 139 }],
  [{ name: "Veg Burger", qty: 3, price: 149 }],
];

export default function LiveOrders() {
  const [seedOrders, setSeedOrders] = useState(REMOTE ? [] : SEED_ORDERS);  // demo garnish only
  const placed = usePlacedOrders();                 // customer QR orders (live from store)
  const orders = useMemo(() => [...placed, ...seedOrders], [placed, seedOrders]);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const [kitchen, setKitchen] = useState(false);
  const [mobileCol, setMobileCol] = useState("new");
  const [fresh, setFresh] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const [spin, setSpin] = useState(false);
  const dragId = useRef(null);
  const rSettings = useRestaurant();
  const accepting = rSettings?.ordering?.acceptingOrders !== false;
  const toggleOpen = () => updateRestaurant({ ordering: { ...(rSettings?.ordering || {}), acceptingOrders: !accepting } });
  const [muted, setMuted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(true);
  const audioCtx = useRef(null);
  const chimeTimer = useRef(null);

  // live clock
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // ISSUE 2: audible alert repeating while any NEW order is awaiting accept/reject
  const newCount = orders.filter(o => o.status === "new").length;
  useEffect(() => {
    const play = () => {
      if (muted || newCount === 0) return;
      try {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtx.current;
        [0, 0.18].forEach((t, i) => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = "sine"; osc.frequency.value = i === 0 ? 880 : 1174;
          osc.connect(gain); gain.connect(ctx.destination);
          const at = ctx.currentTime + t;
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
          osc.start(at); osc.stop(at + 0.16);
        });
      } catch {}
    };
    if (newCount > 0 && !muted) {
      play();
      chimeTimer.current = setInterval(play, 2000);   // repeat every 2s until cleared
    }
    return () => { if (chimeTimer.current) clearInterval(chimeTimer.current); };
  }, [newCount, muted]);

  // keep drawer order in sync with state
  const liveDrawer = drawer ? orders.find(o => o.id === drawer.id) || null : null;

  const cancelOrder = (o, blockDevice) => {
    updateOrderStatus(o.id, "cancelled", blockDevice ? { blockDevice: true } : {});
    pushNotification({ type: "order", title: `Order ${o.token} cancelled by restaurant`, body: blockDevice ? "Customer informed · device blocked for 24h" : "Customer has been informed on their phone." });
  };

  const advance = (o) => {
    const next = COL_META[o.status].next;
    if (o.source === "qr") {
      if (next === "archived") removeOrder(o.id); else updateOrderStatus(o.id, next);
      return;
    }
    if (next === "archived") { setSeedOrders(prev => prev.filter(x => x.id !== o.id)); return; }
    setSeedOrders(prev => prev.map(x => {
      if (x.id !== o.id) return x;
      const u = { ...x, status: next };
      if (next === "preparing" && !u.startedAt) u.startedAt = Date.now();
      if (next === "ready" && !u.readyAt) u.readyAt = Date.now();
      if (next === "completed" && !u.completedAt) u.completedAt = Date.now();
      return u;
    }));
  };

  const moveTo = (o, status) => {
    if (status === o.status) return;
    if (o.source === "qr") { updateOrderStatus(o.id, status); return; }
    setSeedOrders(prev => prev.map(x => {
      if (x.id !== o.id) return x;
      const u = { ...x, status };
      if (status === "preparing" && !u.startedAt) u.startedAt = Date.now();
      if (status === "ready" && !u.readyAt) u.readyAt = Date.now();
      if (status === "completed" && !u.completedAt) u.completedAt = Date.now();
      return u;
    }));
  };

  const simulateOrder = () => {
    const id = nextId++, token = "#" + nextToken++;
    const o = {
      id, token, customer: NEW_CUSTOMERS[Math.floor(Math.random() * NEW_CUSTOMERS.length)],
      phone: "+91 9" + Math.floor(100000000 + Math.random() * 899999999),
      type: Math.random() > 0.5 ? "parcel" : "dinein", table: Math.ceil(Math.random() * 12),
      payment: Math.random() > 0.3 ? "paid" : "unpaid", method: "UPI", status: "new",
      placedAt: Date.now(), notes: "", items: NEW_ITEMS[Math.floor(Math.random() * NEW_ITEMS.length)],
    };
    setSeedOrders(prev => [o, ...prev]);
    setFresh(f => ({ ...f, [id]: true }));
    setTimeout(() => setFresh(f => { const n = { ...f }; delete n[id]; return n; }), 2200);
  };

  const refresh = () => { setSpin(true); setTimeout(() => setSpin(false), 700); };

  // filtering
  const filtered = useMemo(() => orders.filter(o =>
    (typeFilter === "all" || o.type === typeFilter) &&
    (o.token.toLowerCase().includes(search.toLowerCase().replace("#", "").trim() ? search.toLowerCase() : "") ||
      o.customer.toLowerCase().includes(search.toLowerCase()))
  ), [orders, search, typeFilter]);

  const byCol = useMemo(() => {
    const g = { new: [], preparing: [], ready: [], completed: [], cancelled: [] };
    filtered.forEach(o => { if (g[o.status]) g[o.status].push(o); });
    return g;
  }, [filtered]);

  // header stats
  const stats = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const isToday = (o) => (o.placedAt || 0) >= startOfToday;
    const todays = orders.filter(isToday);
    // revenue counts only orders that actually happened — never cancelled ones
    const revenue = todays.filter(o => o.status !== "cancelled").reduce((s, o) => s + orderTotal(o), 0);
    const active = orders.filter(o => o.status !== "completed" && o.status !== "cancelled").length;
    const done = orders.filter(o => o.startedAt && o.readyAt);
    const avg = done.length ? done.reduce((s, o) => s + (o.readyAt - o.startedAt), 0) / done.length : 7.5 * 60000;
    return { count: todays.filter(o => o.status !== "cancelled").length, revenue, active, avg: Math.round(avg / 60000) };
  }, [orders]);

  // drag handlers
  const onDragStart = (e, o) => { dragId.current = o.id; e.dataTransfer.effectAllowed = "move"; };
  const onDrop = (e, colKey) => {
    e.preventDefault(); setDragOver(null);
    const o = orders.find(x => x.id === dragId.current);
    if (o) moveTo(o, colKey);
    dragId.current = null;
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-24 lg:pb-6" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes qmEnter{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}
        .qm-enter{animation:qmEnter .35s cubic-bezier(.2,.8,.2,1)}
        @keyframes qmRing{0%{box-shadow:0 0 0 0 rgba(255,107,53,.5)}100%{box-shadow:0 0 0 10px rgba(255,107,53,0)}}
        .qm-fresh{animation:qmEnter .35s cubic-bezier(.2,.8,.2,1), qmRing 1.4s ease-out 2}
        @keyframes qmPulse{0%,100%{opacity:1}50%{opacity:.35}}
        .qm-pulse{animation:qmPulse 1.4s ease-in-out infinite}
        @keyframes qmSlide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
        .qm-slide{animation:qmSlide .25s ease-out}
        .qm-spin{animation:qmSpin .7s ease-in-out}
        @keyframes qmSpin{to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{width:6px;height:6px}*::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:9px}
      `}</style>

      {kitchen && <KitchenView orders={orders} now={now} onExit={() => setKitchen(false)} onAdvance={advance} />}

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5" style={{ color: CHARCOAL }}>
              Live Orders <span className="qm-pulse w-2.5 h-2.5 rounded-full" style={{ background: "#10B981" }} />
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Token-based kitchen workflow · updates in real time</p>
          </div>
          <div className="flex items-center gap-2">
            {!REMOTE && <button onClick={simulateOrder} className="hidden sm:flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              <Plus size={16} />Simulate order
            </button>}
            <button onClick={toggleOpen} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition border" style={{ borderColor: accepting ? "#A7F3D0" : "#FECACA", color: accepting ? "#059669" : "#B91C1C", background: accepting ? "#ECFDF5" : "#FEF2F2" }} title={accepting ? "You're open — tap to stop taking orders" : "You're closed — tap to start taking orders"}>
              <Power size={16} /><span className="hidden sm:inline">{accepting ? "Open" : "Closed"}</span>
            </button>
            <button onClick={() => setMuted(m => !m)} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition border" style={{ borderColor: newCount > 0 && !muted ? "#10B981" : "#E5E7EB", color: muted ? "#9CA3AF" : "#059669", background: newCount > 0 && !muted ? "#ECFDF5" : "#fff" }} title={muted ? "Unmute new-order alert" : "Mute new-order alert"}>
              {muted ? <BellOff size={16} /> : <Bell size={16} />}
              <span className="hidden sm:inline">{muted ? "Muted" : "Alert on"}</span>
            </button>
            <button onClick={() => setKitchen(true)} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition" style={{ background: CHARCOAL }}>
              <Maximize2 size={16} /><span className="hidden sm:inline">Kitchen view</span>
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <Stat icon={ShoppingBag} label="Orders today" value={stats.count} tint="#F6EFE6" color={BRAND} />
          <Stat icon={IndianRupee} label="Revenue today" value={`₹${stats.revenue.toLocaleString("en-IN")}`} tint="#ECFDF5" color="#16A34A" />
          <Stat icon={Activity} label="Active orders" value={stats.active} tint="#EFF6FF" color="#2563EB" live />
          <Stat icon={Timer} label="Avg prep time" value={`${stats.avg} min`} tint="#FFFBEB" color="#D97706" />
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search token or customer..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus transition" />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
            {[["all", "All"], ["parcel", "Parcel"], ["dinein", "Dine-in"]].map(([k, l]) => (
              <button key={k} onClick={() => setTypeFilter(k)} className="px-3 py-2 text-xs font-semibold rounded-lg transition"
                style={typeFilter === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
          <button onClick={refresh} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <RefreshCw size={15} className={spin ? "qm-spin" : ""} /><span className="hidden sm:inline">Refresh</span>
          </button>
          {!REMOTE && <button onClick={simulateOrder} className="sm:hidden flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700">
            <Plus size={16} />
          </button>}
        </div>

        {/* ── Kanban (desktop/tablet) ── */}
        <div className="hidden lg:grid grid-cols-4 gap-4 mt-5 items-start">
          {COLUMNS.map(col => (
            <div key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(d => d === col.key ? null : d)}
              onDrop={(e) => onDrop(e, col.key)}
              className="rounded-2xl transition-colors"
              style={{ outline: dragOver === col.key ? `2px dashed ${col.color}` : "none", outlineOffset: 4 }}>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl mb-3" style={{ background: col.soft }}>
                <span className="flex items-center gap-2 text-sm font-bold" style={{ color: col.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />{col.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-sm" style={{ color: col.color }}>{byCol[col.key].length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {byCol[col.key].map(o => (
                  <OrderCard key={o.id} o={o} now={now} fresh={fresh[o.id]} onAdvance={advance} onClick={setDrawer} onDragStart={onDragStart} />
                ))}
                {byCol[col.key].length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">Drop orders here</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Mobile single column ── */}
        <div className="lg:hidden mt-5 space-y-3">
          {byCol[mobileCol].map(o => (
            <OrderCard key={o.id} o={o} now={now} fresh={fresh[o.id]} onAdvance={advance} onClick={setDrawer} onDragStart={onDragStart} />
          ))}
          {byCol[mobileCol].length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <CheckCircle2 size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No {COL_META[mobileCol].label.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* ── Cancelled orders (issue 3: cancels are tracked, not vanished) ── */}
        {byCol.cancelled.length > 0 && (
          <div className="mt-6">
            <button onClick={() => setShowCancelled(v => !v)} className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: "#DC2626" }}>
              <XCircle size={16} />Cancelled orders ({byCol.cancelled.length})
              <ChevronRight size={15} style={{ transform: showCancelled ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
            </button>
            {showCancelled && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byCol.cancelled.map(o => (
                  <div key={o.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold tabular-nums" style={{ color: "#DC2626", fontSize: 20 }}>{o.token}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{o.customer} · {inr(orderTotal(o))}</p>
                    </div>
                    <button onClick={() => removeOrder(o.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-100">Clear</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] grid grid-cols-4">
        {COLUMNS.map(col => {
          const on = mobileCol === col.key;
          return (
            <button key={col.key} onClick={() => setMobileCol(col.key)} className="flex flex-col items-center gap-1 py-1.5 rounded-xl transition">
              <span className="relative">
                <CircleDot size={20} style={{ color: on ? col.color : "#9CA3AF" }} />
                {byCol[col.key].length > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white grid place-items-center" style={{ background: on ? col.color : "#9CA3AF" }}>
                    {byCol[col.key].length}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-bold" style={{ color: on ? col.color : "#9CA3AF" }}>{col.label.replace(" Orders", "")}</span>
            </button>
          );
        })}
      </div>

      <Drawer o={liveDrawer} onClose={() => setDrawer(null)} onAdvance={advance} onCancelOrder={cancelOrder} allOrders={orders} />
    </div>
  );
}
