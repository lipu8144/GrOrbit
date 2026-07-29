import { useState } from "react";
import { IndianRupee, ShoppingBag, Users, Repeat, TrendingUp, Download } from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, StatCard, SectionTitle } from "../components/ui/primitives";
import { Sparkline, Bars, Ring, Donut } from "../components/ui/charts";
import { downloadCSV } from "../lib/download";
import { ITEM_SALES, PERIOD_LABEL } from "../data/itemSales";
import { useAnalyticsOrders, summarize, seriesOf, peakHours, topItems } from "../lib/analyticsStore";
import { REMOTE } from "../lib/supabaseClient";
import { inr } from "../lib/format";

const REVENUE = [12, 18, 15, 22, 28, 24, 31, 27, 35, 38, 33, 42];
const ORDERS = [40, 52, 48, 61, 70, 65, 82, 76, 90, 96, 88, 110];
const PEAK = [
  { l: "9a", v: 12 }, { l: "11a", v: 28 }, { l: "1p", v: 64 }, { l: "3p", v: 38 },
  { l: "5p", v: 46 }, { l: "7p", v: 88 }, { l: "9p", v: 72 }, { l: "11p", v: 30 },
];

export default function Analytics() {
  const [range, setRange] = useState("30d");
  const [period, setPeriod] = useState("week");
  const raw = useAnalyticsOrders();              // null in demo mode
  const now = Date.now();
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[range];
  // In LIVE mode an absent/failed fetch means "no data yet" — feed the real
  // aggregators an empty set so every figure reads 0, never a demo number.
  const data = raw ?? (REMOTE ? [] : null);
  const live = data ? summarize(data, days, now) : null;
  const liveRev = data ? seriesOf(data, days, now, "revenue") : null;
  const liveOrd = data ? seriesOf(data, days, now, "orders") : null;
  const livePeak = data ? peakHours(data, days, now) : null;
  const periodDays = { week: 7, month: 30, lastMonth: 30 }[period];
  const liveItems = data ? topItems(data, periodDays, now, period === "lastMonth") : null;
  const items = liveItems ?? [...ITEM_SALES[period]].sort((a, b) => b.orders - a.orders);
  const maxOrders = Math.max(1, ...items.map((x) => x.orders));
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Understand what's driving your growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
            {[["today", "Today"], ["7d", "7d"], ["30d", "30d"], ["90d", "90d"]].map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg transition" style={range === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
          <button onClick={() => downloadCSV("analytics-summary.csv", ["Metric", "Value"], live ? [["Revenue", String(live.revenue)], ["Orders", String(live.orders)], ["New customers", String(live.newCustomers)], ["Repeat rate", `${live.repeatRate}%`]] : [["Revenue", "0"], ["Orders", "0"], ["New customers", "0"], ["Repeat rate", "0%"]])} className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50" style={{ color: CHARCOAL }}><Download size={15} /><span className="hidden sm:inline">Export</span></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Revenue" value={live ? inr(live.revenue) : "₹8.4L"} delta={live ? live.revenueDelta : 18} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={ShoppingBag} label="Orders" value={live ? String(live.orders) : "3,284"} delta={live ? live.ordersDelta : 12} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Users} label="New customers" value={live ? String(live.newCustomers) : "612"} delta={live ? 0 : 9} tint="#EFF6FF" color="#2563EB" />
        <StatCard icon={Repeat} label="Repeat rate" value={live ? `${live.repeatRate}%` : "48%"} delta={live ? 0 : 6} tint="#FAF5FF" color="#9333EA" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle action={<span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><TrendingUp size={13} />+18%</span>}>Revenue trend</SectionTitle>
          <Sparkline data={liveRev ? liveRev : (REMOTE ? [] : REVENUE)} w={620} h={150} color={BRAND} />
        </Card>
        <Card className="p-5">
          <SectionTitle action={<span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><TrendingUp size={13} />+12%</span>}>Orders trend</SectionTitle>
          <Sparkline data={liveOrd ? liveOrd : (REMOTE ? [] : ORDERS)} w={620} h={150} color="#2563EB" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle sub="When your customers order most">Peak hours</SectionTitle>
          <Bars data={livePeak ? livePeak : (REMOTE ? [] : PEAK)} w={620} h={180} color={BRAND} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Repeat vs new</SectionTitle>
          <div className="flex flex-col items-center gap-3 py-2">
            <Donut size={150} width={24} segments={[{ value: live ? live.repeatRate : 48, color: BRAND }, { value: 100 - (live ? live.repeatRate : 48), color: "#E5E7EB" }]} />
            <div className="text-center"><p className="text-sm text-gray-500">Repeat customers</p><p className="text-2xl font-extrabold" style={{ color: CHARCOAL }}>{live ? `${live.repeatRate}%` : "48%"}</p></div>
          </div>
        </Card>
      </div>

      {/* item / food performance — filter by period so owners can see what sells */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <div>
            <p className="font-bold" style={{ color: CHARCOAL }}>Item performance</p>
            <p className="text-xs text-gray-400 mt-0.5">What's selling in <span className="font-semibold text-gray-600">{PERIOD_LABEL[period].toLowerCase()}</span> — best sellers at the top.</p>
          </div>
          <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5">
            {Object.entries(PERIOD_LABEL).map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={period === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 font-bold bg-gray-50/70 border-b border-gray-100">
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-3 py-3">Item</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-right px-3 py-3">Orders</th>
                <th className="text-right px-3 py-3">Revenue</th>
                <th className="text-left px-3 py-3 pl-6">Share</th>
                <th className="text-right px-5 py-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-gray-300">{i + 1}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl grid place-items-center text-lg bg-gray-50">{it.emoji}</span><span className="font-bold" style={{ color: CHARCOAL }}>{it.name}</span></div></td>
                  <td className="px-3 py-3 text-gray-500">{it.category}</td>
                  <td className="px-3 py-3 text-right font-semibold" style={{ color: CHARCOAL }}>{it.orders}</td>
                  <td className="px-3 py-3 text-right font-bold" style={{ color: CHARCOAL }}>{inr(it.revenue)}</td>
                  <td className="px-3 py-3 pl-6 w-40">
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round((it.orders / maxOrders) * 100)}%`, background: BRAND }} /></div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-bold inline-flex items-center gap-0.5 ${it.trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      <TrendingUp size={12} className={it.trend < 0 ? "rotate-180" : ""} />{Math.abs(it.trend)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-lg font-extrabold" style={{ color: CHARCOAL }}>{items.reduce((s, x) => s + x.orders, 0)}</p><p className="text-[11px] text-gray-400">items sold</p></div>
          <div><p className="text-lg font-extrabold" style={{ color: CHARCOAL }}>{inr(items.reduce((s, x) => s + x.revenue, 0))}</p><p className="text-[11px] text-gray-400">item revenue</p></div>
          <div><p className="text-lg font-extrabold" style={{ color: CHARCOAL }}>{items[0]?.name.split(" ")[0]}…</p><p className="text-[11px] text-gray-400">best seller</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle sub={`By units sold · ${PERIOD_LABEL[period].toLowerCase()}`}>Top products</SectionTitle>
          <Bars data={items.slice(0, 6).map((x) => ({ l: x.name.split(" ")[0], v: x.orders }))} w={620} h={180} color="#9333EA" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Customer satisfaction</SectionTitle>
          <div className="flex items-center gap-6 py-2">
            <Ring pct={REMOTE ? 0 : 94} size={110} width={12} color="#16A34A" />
            <div className="space-y-2 text-sm">
              <p className="text-gray-500">Avg rating <span className="font-bold ml-1" style={{ color: CHARCOAL }}>{REMOTE ? "—" : "4.8 ★"}</span></p>
              <p className="text-gray-500">Reviews <span className="font-bold ml-1" style={{ color: CHARCOAL }}>{REMOTE ? "—" : "1,284"}</span></p>
              <p className="text-gray-500">Response rate <span className="font-bold ml-1" style={{ color: CHARCOAL }}>{REMOTE ? "—" : "94%"}</span></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
