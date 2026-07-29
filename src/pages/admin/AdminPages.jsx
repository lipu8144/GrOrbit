import { CreditCard, IndianRupee, TrendingUp, Users } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Badge, Avatar } from "../../components/ui/primitives";
import { Sparkline, Bars, Donut } from "../../components/ui/charts";
import { useTenants, platformStats } from "../../lib/adminStore";
import { PLANS, SIGNUPS_TREND, REVENUE_TREND } from "../../data/tenants";

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

export function Subscriptions() {
  const tenants = useTenants();
  const s = platformStats(tenants);
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plans, pricing and recurring revenue.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([name, p]) => {
          const count = tenants.filter((t) => t.plan === name).length;
          const active = tenants.filter((t) => t.plan === name && t.status === "active").length;
          return (
            <Card key={name} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: CHARCOAL }}>{name}</span>
                <Badge tone={name === "Pro" ? "indigo" : name === "Growth" ? "brand" : "gray"}>{count} on plan</Badge>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: CHARCOAL }}>{p.price === 0 ? "Free" : inr(p.price)}<span className="text-sm text-gray-400 font-medium">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">{active} active · {inr(active * p.price)} MRR</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle action={<span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><TrendingUp size={13} />+18%</span>}>MRR trend (₹k)</SectionTitle>
          <Sparkline data={REVENUE_TREND} w={620} h={150} color={BRAND} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Plan distribution</SectionTitle>
          <div className="flex items-center gap-4">
            <Donut size={120} width={20} segments={s.planMix.map((p) => ({ value: p.count || 0.001, color: p.color }))} />
            <div className="space-y-1.5 text-sm">
              {s.planMix.map((p) => (<div key={p.plan} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} /><span className="text-gray-600 flex-1">{p.plan}</span><span className="font-bold" style={{ color: CHARCOAL }}>{p.count}</span></div>))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const tenants = useTenants();
  const s = platformStats(tenants);
  const byCity = Object.entries(tenants.reduce((m, t) => { m[t.city] = (m[t.city] || 0) + 1; return m; }, {})).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v).slice(0, 6);
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Platform Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Growth, signups and distribution across all tenants.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Restaurants" value={s.total} delta={12} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={IndianRupee} label="MRR" value={inr(s.mrr)} delta={18} tint="#FAF5FF" color="#9333EA" />
        <StatCard icon={TrendingUp} label="Active rate" value={`${Math.round((s.active / s.total) * 100)}%`} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={CreditCard} label="Paid plans" value={tenants.filter((t) => t.plan !== "Starter").length} tint="#EFF6FF" color="#2563EB" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5"><SectionTitle>New signups / month</SectionTitle><Sparkline data={SIGNUPS_TREND} w={620} h={150} color="#2563EB" /></Card>
        <Card className="p-5"><SectionTitle>Restaurants by city</SectionTitle><Bars data={byCity} w={620} h={170} color={BRAND} /></Card>
      </div>
    </div>
  );
}
