import { useState, useMemo } from "react";
import { Search, Download, UtensilsCrossed, Bike, ChevronRight, X, Receipt } from "lucide-react";
import { BRAND, CHARCOAL, ORDER_STATUS, ORDER_TYPE } from "../../lib/theme";
import { Card, StatCard, Badge, Avatar, EmptyState } from "../../components/ui/primitives";
import { ORDER_HISTORY as DEMO_HISTORY } from "../../data/orders";
import { useOrderHistory } from "../../lib/orderStore";
import { REMOTE } from "../../lib/supabaseClient";
import { inr } from "../../lib/format";
import { downloadCSV } from "../../lib/download";

function TypeChip({ type, table }) {
  const t = ORDER_TYPE[type];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: t.soft, color: t.color }}>
      {type === "dinein" ? <UtensilsCrossed size={11} /> : <Bike size={11} />}
      {type === "dinein" ? `Dine-in · T${table}` : "Parcel"}
    </span>
  );
}

function Drawer({ o, onClose }) {
  if (!o) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto qm-slide">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <span className="font-extrabold tabular-nums" style={{ color: BRAND, fontSize: 22 }}>{o.token}</span>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={o.customer} size={44} />
            <div className="flex-1"><p className="font-bold" style={{ color: CHARCOAL }}>{o.customer}</p><p className="text-xs text-gray-400">{o.date}</p></div>
            <TypeChip type={o.type} table={o.table} />
          </div>
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
            {o.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700"><span className="font-bold">{it.qty}×</span> {it.name}</span>
                <span className="font-semibold" style={{ color: CHARCOAL }}>{inr(it.price * it.qty)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-200">
              <span className="font-bold" style={{ color: CHARCOAL }}>Total</span>
              <span className="text-lg font-extrabold" style={{ color: CHARCOAL }}>{inr(o.total)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <Badge tone={o.payment === "paid" ? "green" : "rose"}>{o.payment === "paid" ? "Paid" : "Unpaid"}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <Badge tone={o.status === "completed" ? "gray" : "rose"}>{ORDER_STATUS[o.status].label}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderHistory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const remoteRows = useOrderHistory();
  const ORDER_HISTORY = remoteRows ?? (REMOTE ? [] : DEMO_HISTORY);

  const filtered = useMemo(() => ORDER_HISTORY.filter((o) =>
    (filter === "all" || o.status === filter || o.type === filter) &&
    (o.token.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()))
  ), [ORDER_HISTORY, search, filter]);

  const revenue = ORDER_HISTORY.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Order History</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every completed and cancelled order.</p>
        </div>
        <button onClick={() => downloadCSV("order-history.csv", ["Token", "Customer", "Type", "Status", "Total", "Date"], ORDER_HISTORY.map((o) => [o.token, o.customer, o.type, o.status, o.total, o.date]))} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50" style={{ color: CHARCOAL }}><Download size={16} /><span className="hidden sm:inline">Export CSV</span></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Total orders" value={ORDER_HISTORY.length} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Receipt} label="Completed" value={ORDER_HISTORY.filter(o => o.status === "completed").length} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={Receipt} label="Cancelled" value={ORDER_HISTORY.filter(o => o.status === "cancelled").length} tint="#FEF2F2" color="#DC2626" />
        <StatCard icon={Receipt} label="Revenue" value={inr(revenue)} tint="#EFF6FF" color="#2563EB" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2.5 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search token or customer..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl qm-focus" />
          </div>
          <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5 overflow-x-auto">
            {[["all", "All"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["dinein", "Dine-in"], ["parcel", "Parcel"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={filter === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No orders found" body="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 font-bold bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-3 py-3">Customer</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-right px-3 py-3">Total</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Time</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSelected(o)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-5 py-3 font-extrabold" style={{ color: BRAND }}>{o.token}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><Avatar name={o.customer} size={26} color="#9CA3AF" /><span className="font-semibold" style={{ color: CHARCOAL }}>{o.customer}</span></div></td>
                    <td className="px-3 py-3"><TypeChip type={o.type} table={o.table} /></td>
                    <td className="px-3 py-3 text-right font-bold" style={{ color: CHARCOAL }}>{inr(o.total)}</td>
                    <td className="px-3 py-3"><Badge tone={o.status === "completed" ? "gray" : "rose"}>{ORDER_STATUS[o.status].label}</Badge></td>
                    <td className="px-3 py-3 text-xs text-gray-400">{o.date}</td>
                    <td className="px-3 py-3 text-right"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer o={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
