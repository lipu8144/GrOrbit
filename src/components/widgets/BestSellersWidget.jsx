import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, SectionTitle } from "../ui/primitives";
import { inr } from "../../lib/format";
import { useAnalyticsOrders, topItems } from "../../lib/analyticsStore";

const ITEMS = [
  { name: "Margherita Pizza", emoji: "🍕", orders: 312, revenue: 87024, trend: 14 },
  { name: "Chicken Zinger Burger", emoji: "🍔", orders: 286, revenue: 65494, trend: 9 },
  { name: "Cold Brew", emoji: "☕", orders: 241, revenue: 38319, trend: 22 },
  { name: "Chocolate Lava Cake", emoji: "🍰", orders: 198, revenue: 35442, trend: -3 },
];

export default function BestSellersWidget() {
  const raw = useAnalyticsOrders();                 // null in demo
  const live = raw ? topItems(raw, 30, Date.now()).slice(0, 4).map((it) => ({ ...it, emoji: it.emoji || "🍽️", trend: 0 })) : null;
  const ITEMS_SHOWN = live ?? ITEMS;
  return (
    <Card className="p-5">
      <SectionTitle action={<Flame size={16} style={{ color: BRAND }} />}>Best selling items</SectionTitle>
      <div className="space-y-3">
        {ITEMS_SHOWN.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No sales yet — your top items will appear here.</p> : ITEMS_SHOWN.map((it, i) => {
          const up = it.trend >= 0;
          return (
            <div key={it.name} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
              <div className="w-11 h-11 rounded-xl grid place-items-center text-xl bg-gray-50 shrink-0">{it.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{it.name}</p>
                <p className="text-xs text-gray-400">{it.orders} orders · {inr(it.revenue)}</p>
              </div>
              {it.trend !== 0 && (
                <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-500"}`}>
                  {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(it.trend)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
