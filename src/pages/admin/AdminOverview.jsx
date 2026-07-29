import { Store, Activity, IndianRupee, ShoppingBag, TrendingUp, UserPlus, Crown } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Badge, Avatar } from "../../components/ui/primitives";
import { Sparkline, Donut } from "../../components/ui/charts";
import { useTenants, platformStats } from "../../lib/adminStore";
import { SIGNUPS_TREND, REVENUE_TREND, PLANS } from "../../data/tenants";

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const lakh = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : inr(n));
const STATUS = { active: "green", trial: "amber", suspended: "rose" };

export default function AdminOverview() {
  const tenants = useTenants();
  const s = platformStats(tenants);
  const recent = [...tenants].sort((a, b) => new Date(b.joined) - new Date(a.joined)).slice(0, 5);
  const top = [...tenants].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Every restaurant on GrOrbit, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Store} label="Restaurants" value={s.total} delta={12} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Activity} label="Active" value={s.active} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={UserPlus} label="On trial" value={s.trials} tint="#FFFBEB" color="#D97706" />
        <StatCard icon={IndianRupee} label="Platform MRR" value={inr(s.mrr)} delta={18} tint="#FAF5FF" color="#9333EA" />
        <StatCard icon={ShoppingBag} label="Total orders" value={s.orders.toLocaleString("en-IN")} delta={9} tint="#EFF6FF" color="#2563EB" />
        <StatCard icon={IndianRupee} label="GMV" value={lakh(s.revenue)} delta={14} tint="#F0FDFA" color="#0D9488" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle action={<span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><TrendingUp size={13} />+18%</span>}>Platform MRR (₹k)</SectionTitle>
          <Sparkline data={REVENUE_TREND} w={620} h={150} color={BRAND} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Plan mix</SectionTitle>
          <div className="flex items-center gap-4">
            <Donut size={120} width={20} segments={s.planMix.map((p) => ({ value: p.count || 0.001, color: p.color }))} />
            <div className="space-y-1.5 text-sm">
              {s.planMix.map((p) => (
                <div key={p.plan} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} /><span className="text-gray-600 flex-1">{p.plan}</span><span className="font-bold" style={{ color: CHARCOAL }}>{p.count}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle>Newest restaurants</SectionTitle>
          <div className="space-y-3">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <Avatar name={t.name} size={34} />
                <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{t.name}</p><p className="text-xs text-gray-400">{t.city} · joined {t.joined}</p></div>
                <Badge tone={STATUS[t.status]}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle action={<Crown size={16} style={{ color: "#F59E0B" }} />}>Top by revenue</SectionTitle>
          <div className="space-y-3">
            {top.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                <Avatar name={t.name} size={34} />
                <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{t.name}</p><p className="text-xs text-gray-400">{t.orders.toLocaleString("en-IN")} orders</p></div>
                <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{lakh(t.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
