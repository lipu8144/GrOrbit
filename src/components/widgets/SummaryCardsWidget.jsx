import { ShoppingBag, Activity, IndianRupee, Users, Receipt, ScanLine } from "lucide-react";
import { BRAND } from "../../lib/theme";
import { StatCard } from "../ui/primitives";
import { useAnalyticsOrders, summarize, useQrScansToday } from "../../lib/analyticsStore";
import { usePlacedOrders } from "../../lib/orderStore";
import { inr } from "../../lib/format";
import { REMOTE } from "../../lib/supabaseClient";

const CARDS = [
  { icon: ShoppingBag, label: "Today's orders", value: "142", delta: 12, tint: "#F6EFE6", color: BRAND },
  { icon: Activity, label: "Active orders", value: "9", delta: 3, tint: "#EFF6FF", color: "#2563EB" },
  { icon: IndianRupee, label: "Today's revenue", value: "₹38,420", delta: 21, tint: "#ECFDF5", color: "#16A34A" },
  { icon: Users, label: "Customers today", value: "86", delta: 9, tint: "#FAF5FF", color: "#9333EA" },
  { icon: Receipt, label: "Avg order value", value: "₹271", delta: 4, tint: "#FFFBEB", color: "#D97706" },
  { icon: ScanLine, label: "QR scans today", value: "318", delta: 16, tint: "#F0FDFA", color: "#0D9488" },
];

export default function SummaryCardsWidget() {
  // hooks at top level — never inside callbacks (see ItemModal incident)
  const raw = useAnalyticsOrders();               // null in demo mode
  const scans = useQrScansToday();
  const active = usePlacedOrders().filter((o) => ["new", "preparing"].includes(o.status)).length;

  // In LIVE mode the demo CARDS must never render — a failed or still-loading
  // analytics fetch shows honest zeros/dashes, not invented sales figures.
  let cards = REMOTE
    ? [
        { ...CARDS[0], value: "0", delta: 0 },
        { ...CARDS[1], value: String(active), delta: 0 },
        { ...CARDS[2], value: "₹0", delta: 0 },
        { ...CARDS[3], value: "0", delta: 0 },
        { ...CARDS[4], value: "₹0", delta: 0 },
        { ...CARDS[5], value: scans === null ? "—" : String(scans), delta: 0 },
      ]
    : CARDS;
  if (raw) {
    const t = summarize(raw, 1, Date.now());      // today (last 24h)
    const phones = new Set(raw.filter((o) => o.placedAt > Date.now() - 86400000 && o.phone).map((o) => o.phone));
    cards = [
      { ...CARDS[0], value: String(t.orders), delta: t.ordersDelta },
      { ...CARDS[1], value: String(active), delta: 0 },
      { ...CARDS[2], value: inr(t.revenue), delta: t.revenueDelta },
      { ...CARDS[3], value: String(phones.size), delta: 0 },
      { ...CARDS[4], value: t.orders ? inr(Math.round(t.revenue / t.orders)) : "₹0", delta: 0 },
      { ...CARDS[5], value: scans === null ? "—" : String(scans), delta: 0 },
    ];
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </div>
  );
}
