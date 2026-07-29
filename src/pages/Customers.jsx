import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../lib/authStore";
import { Search, Users, UserPlus, Crown, Send, MessageCircle, X, Phone, TrendingUp, Heart, ChevronRight } from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, StatCard, Badge, Avatar, Button, EmptyState } from "../components/ui/primitives";
import { Sparkline } from "../components/ui/charts";
import { CUSTOMERS, TIER } from "../data/customers";
import { sb, REMOTE, rid } from "../lib/supabaseClient";
import { usePlacedOrders } from "../lib/orderStore";
import { inr } from "../lib/format";
import { waLink } from "../lib/download";

function Drawer({ c, onClose }) {
  const { user } = useAuth();
  if (!c) return null;
  const t = TIER[c.tier];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto qm-slide">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <p className="font-bold" style={{ color: CHARCOAL }}>Customer profile</p>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={c.name} size={52} />
            <div className="flex-1">
              <p className="font-extrabold text-lg" style={{ color: CHARCOAL }}>{c.name}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} />{c.phone}</p>
            </div>
            <Badge tone={t.tone}>{t.label}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[["Orders", c.orders], ["Spent", inr(c.spend)], ["Last visit", c.last]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-gray-50 p-3 text-center"><p className="text-sm font-extrabold" style={{ color: CHARCOAL }}>{v}</p><p className="text-[11px] text-gray-400 mt-0.5">{l}</p></div>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5"><TrendingUp size={12} />Spending trend</p>
            <div className="rounded-xl border border-gray-100 p-3"><Sparkline data={c.trend} w={360} h={70} /></div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: "#F6EFE6" }}><Heart size={16} style={{ color: BRAND }} /></div>
            <div><p className="text-[11px] text-gray-400">Favorite item</p><p className="text-sm font-bold" style={{ color: CHARCOAL }}>{c.fav}</p></div>
          </div>
          <div className="flex gap-2.5">
            <Button className="flex-1" icon={Send} onClick={() => window.open(waLink(c.phone, `Hi ${c.name.split(" ")[0]}! A special offer from ${user?.restaurant || "us"} just for you 🍔`), "_blank")}>Send offer</Button>
            <Button variant="outline" className="flex-1" icon={MessageCircle} onClick={() => window.open(waLink(c.phone), "_blank")}>Message</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [list, setList] = useState(REMOTE ? [] : CUSTOMERS);
  const liveOrders = usePlacedOrders();
  useEffect(() => {
    if (!REMOTE) return;
    sb.rpc("restaurant_customers", { rid: rid() }).then(({ data, error }) => {
      if (error) return console.error("customers fetch:", error.message);
      const days = (ts) => Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
      setList(data.map((c, i) => ({
        id: i + 1, name: c.name, phone: c.phone, orders: Number(c.orders), spend: Number(c.spend),
        last: days(c.last_order) === 0 ? "Today" : `${days(c.last_order)}d ago`,
        tier: days(c.last_order) > 30 ? "atrisk" : Number(c.orders) >= 8 ? "vip" : Number(c.orders) >= 3 ? "regular" : "new",
        fav: "—", trend: [0, 0, 0, 0, 0, 0, Number(c.orders)],
      })));
    });
  }, [liveOrders.length]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const addCustomer = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setList((l) => [{ id: Date.now(), name: form.name.trim(), phone: form.phone.trim(), orders: 0, spend: 0, last: "Today", tier: "new", fav: "—", trend: [0, 0, 0, 0, 0, 0, 1] }, ...l]);
    setForm({ name: "", phone: "" }); setAdding(false);
  };

  const filtered = useMemo(() => list.filter((c) =>
    (filter === "all" || c.tier === filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
  ), [list, search, filter]);

  const totalSpend = list.reduce((s, c) => s + c.spend, 0);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every diner you've captured — turn them into repeat business.</p>
        </div>
        <Button icon={UserPlus} onClick={() => setAdding(true)}><span className="hidden sm:inline">Add customer</span></Button>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdding(false)} />
          <Card className="relative w-full max-w-sm p-5">
            <p className="font-bold mb-3" style={{ color: CHARCOAL }}>Add customer</p>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Name</label>
            <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus mb-3" placeholder="Customer name" />
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus mb-4" placeholder="+91…" />
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addCustomer}>Add</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total customers" value={list.length} delta={12} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Crown} label="VIPs" value={list.filter(c => c.tier === "vip").length} tint="#FFFBEB" color="#D97706" />
        <StatCard icon={UserPlus} label="New this week" value={list.filter(c => c.tier === "new").length} delta={8} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={TrendingUp} label="Lifetime value" value={inr(totalSpend)} tint="#EFF6FF" color="#2563EB" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2.5 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl qm-focus" />
          </div>
          <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5 overflow-x-auto">
            {[["all", "All"], ["vip", "VIP"], ["regular", "Regular"], ["new", "New"], ["atrisk", "At risk"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={filter === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No customers found" body="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 font-bold bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-3 py-3">Phone</th>
                  <th className="text-right px-3 py-3">Orders</th>
                  <th className="text-right px-3 py-3">Spent</th>
                  <th className="text-left px-3 py-3">Favorite</th>
                  <th className="text-left px-3 py-3">Last visit</th>
                  <th className="text-left px-3 py-3">Tier</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><span className="font-bold" style={{ color: CHARCOAL }}>{c.name}</span></div></td>
                    <td className="px-3 py-3 text-gray-500">{c.phone}</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: CHARCOAL }}>{c.orders}</td>
                    <td className="px-3 py-3 text-right font-bold" style={{ color: CHARCOAL }}>{inr(c.spend)}</td>
                    <td className="px-3 py-3 text-gray-500">{c.fav}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{c.last}</td>
                    <td className="px-3 py-3"><Badge tone={TIER[c.tier].tone}>{TIER[c.tier].label}</Badge></td>
                    <td className="px-3 py-3 text-right"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer c={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
