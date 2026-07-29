import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, ChefHat } from "lucide-react";
import { BRAND, CHARCOAL, ORDER_TYPE } from "../../lib/theme";
import { Card, SectionTitle } from "../ui/primitives";
import { SEED_ORDERS } from "../../data/orders";
import { REMOTE } from "../../lib/supabaseClient";
import { usePlacedOrders } from "../../lib/orderStore";
import { orderTotal, fmtClock } from "../../lib/format";

export default function LiveOrdersWidget() {
  const placed = usePlacedOrders();
  const base = [...placed, ...(REMOTE ? [] : SEED_ORDERS)].filter((o) => o.status === "new" || o.status === "preparing");
  const [hidden, setHidden] = useState({});
  const orders = base.filter((o) => !hidden[o.id]).slice(0, 5);

  const advance = (id) => setHidden((h) => ({ ...h, [id]: true }));

  return (
    <Card className="p-5">
      <SectionTitle
        action={
          <Link to="/app/orders/live" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>
            View all <ArrowUpRight size={13} />
          </Link>
        }
      >
        <span className="flex items-center gap-2">
          Live orders <span className="qm-pulse w-2 h-2 rounded-full" style={{ background: "#10B981" }} />
        </span>
      </SectionTitle>

      <div className="space-y-2.5">
        {orders.map((o) => {
          const t = ORDER_TYPE[o.type];
          const isNew = o.status === "new";
          return (
            <div key={o.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50/60 transition-colors">
              <span className="font-extrabold tabular-nums shrink-0" style={{ color: BRAND, fontSize: 18 }}>{o.token}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{o.customer}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: t.soft, color: t.color }}>
                    {o.type === "dinein" ? (o.table ? `Dine-in · T${o.table}` : "Dine-in · QR") : "Parcel"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} · {fmtClock(o.placedAt)}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: CHARCOAL }}>₹{orderTotal(o)}</span>
              <button
                onClick={() => advance(o.id)}
                className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg text-white flex items-center gap-1.5 active:scale-95 transition"
                style={{ background: isNew ? "#2563EB" : "#059669" }}
              >
                {isNew ? <><Check size={13} />Accept</> : <><ChefHat size={13} />Ready</>}
              </button>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">All caught up — no active orders.</div>
        )}
      </div>
    </Card>
  );
}
