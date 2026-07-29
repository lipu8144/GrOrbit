import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star, Heart, Gift, Repeat, ArrowUpRight, Instagram, Facebook, MessageCircle,
  TrendingUp, Ticket,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, SectionTitle, StatCard, Avatar } from "../ui/primitives";
import { GROWTH_STATS, REVIEWS, SOCIAL, COUPONS, LOYALTY } from "../../data/growth";
import { REMOTE } from "../../lib/supabaseClient";
import { useAnalyticsOrders, summarize } from "../../lib/analyticsStore";
import { publicCoupons } from "../../lib/coupons";

const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

// Growth KPI band — mirrors the landing page's "Business Impact" metrics.
export function GrowthSummaryWidget() {
  const g = GROWTH_STATS;
  const raw = useAnalyticsOrders();                 // null in demo
  const data = raw ?? (REMOTE ? [] : null);
  const live = data ? summarize(data, 30, Date.now()) : null;
  // Real where we have the data (repeat rate from orders); honest placeholders
  // for sources that need external APIs (reviews feed, social followers).
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Star} label="Reviews collected" value={REMOTE ? "—" : k(g.reviews.value)} delta={REMOTE ? 0 : g.reviews.delta} tint="#FFFBEB" color="#F59E0B" sub={REMOTE ? "" : `${g.reviews.rating}★`} />
      <StatCard icon={Heart} label="Followers gained" value={REMOTE ? "—" : k(g.followers.value)} delta={REMOTE ? 0 : g.followers.delta} tint="#FFF0F7" color="#E1306C" />
      <StatCard icon={Gift} label="Coupons redeemed" value={REMOTE ? "—" : k(g.coupons.value)} delta={REMOTE ? 0 : g.coupons.delta} tint="#F5F3FF" color="#8B5CF6" />
      <StatCard icon={Repeat} label="Repeat rate" value={live ? `${live.repeatRate}%` : `${g.repeatRate.value}%`} delta={live ? 0 : g.repeatRate.delta} tint="#F6EFE6" color={BRAND} />
    </div>
  );
}

const PLAT_ICON = { Instagram, Facebook, WhatsApp: MessageCircle };

export function ReviewGrowthWidget() {
  const latest = REVIEWS[0];
  if (REMOTE) return (
    <Card className="p-5">
      <SectionTitle><span className="flex items-center gap-2"><Star size={16} className="fill-amber-400 text-amber-400" />Reviews</span></SectionTitle>
      <p className="text-sm text-gray-400 py-6 text-center">Private feedback appears in Notifications.<br/>Public review tracking is coming soon.</p>
    </Card>
  );
  return (
    <Card className="p-5">
      <SectionTitle action={<Link to="/app/growth/reviews" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>View all <ArrowUpRight size={13} /></Link>}>
        <span className="flex items-center gap-2"><Star size={16} className="fill-amber-400 text-amber-400" />Review growth</span>
      </SectionTitle>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-3xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{GROWTH_STATS.reviews.rating}</span>
        <div className="flex flex-col pb-0.5">
          <span className="flex text-amber-400">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className="fill-amber-400" />)}</span>
          <span className="text-[11px] text-gray-400">{GROWTH_STATS.reviews.value.toLocaleString("en-IN")} reviews · +{GROWTH_STATS.reviews.delta}% this month</span>
        </div>
      </div>
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar name={latest.author} size={24} color="#F59E0B" />
          <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{latest.author}</span>
          <span className="flex text-amber-400 ml-auto">{Array.from({ length: latest.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400" />)}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{latest.text}</p>
      </div>
      <Link to="/app/growth/reviews" className="block text-center text-xs font-bold py-2.5 rounded-xl mt-3 text-white qm-btn-primary">Request more reviews</Link>
    </Card>
  );
}

export function SocialGrowthWidget() {
  const total = SOCIAL.reduce((s, p) => s + p.followers, 0);
  if (REMOTE) return (
    <Card className="p-5">
      <SectionTitle><span className="flex items-center gap-2"><Heart size={16} style={{ color: "#E1306C" }} />Social growth</span></SectionTitle>
      <p className="text-sm text-gray-400 py-6 text-center">Follower tracking needs Instagram/Facebook connections.<br/>Coming soon.</p>
    </Card>
  );
  return (
    <Card className="p-5">
      <SectionTitle action={<Link to="/app/growth/social" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>Manage <ArrowUpRight size={13} /></Link>}>
        <span className="flex items-center gap-2"><Heart size={16} style={{ color: "#E1306C" }} />Social growth</span>
      </SectionTitle>
      <p className="text-3xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{k(total)}</p>
      <p className="text-[11px] text-gray-400 mb-3">total followers across channels</p>
      <div className="space-y-2.5">
        {SOCIAL.map((p) => {
          const Icon = PLAT_ICON[p.platform];
          return (
            <div key={p.platform} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: p.color + "1A" }}><Icon size={15} style={{ color: p.color }} /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold" style={{ color: CHARCOAL }}>{p.followers.toLocaleString("en-IN")}</p><p className="text-[11px] text-gray-400">{p.platform}</p></div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp size={12} />{p.delta}%</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CouponsLoyaltyWidget() {
  const [liveCoupons, setLiveCoupons] = useState(null);
  useEffect(() => {
    if (!REMOTE) return;
    publicCoupons().then((list) => setLiveCoupons(list || [])).catch(() => setLiveCoupons([]));
  }, []);
  // In live mode: real coupons, honest "—" for loyalty (no backing table yet).
  const active = REMOTE ? (liveCoupons || []) : COUPONS.filter((c) => c.active);
  const redeemed = REMOTE ? 0 : COUPONS.reduce((s, c) => s + c.redeemed, 0);
  return (
    <Card className="p-5">
      <SectionTitle action={<Link to="/app/growth/coupons" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>Manage <ArrowUpRight size={13} /></Link>}>
        <span className="flex items-center gap-2"><Gift size={16} style={{ color: "#8B5CF6" }} />Coupons & loyalty</span>
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xl font-extrabold" style={{ color: CHARCOAL }}>{REMOTE ? redeemed : redeemed}</p><p className="text-[11px] text-gray-400">redeemed</p></div>
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xl font-extrabold" style={{ color: CHARCOAL }}>{REMOTE ? "—" : LOYALTY.members.toLocaleString("en-IN")}</p><p className="text-[11px] text-gray-400">loyalty members</p></div>
      </div>
      <div className="space-y-2">
        {active.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No active coupons — create one to bring customers back.</p>
        ) : active.slice(0, 3).map((c) => (
          <div key={c.code || c.id} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "#F5F3FF" }}><Ticket size={14} style={{ color: "#8B5CF6" }} /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-bold font-mono" style={{ color: CHARCOAL }}>{c.code}</p><p className="text-[11px] text-gray-400 truncate">{c.desc}</p></div>
            {!REMOTE && <span className="text-xs font-semibold text-gray-500">{c.redeemed}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}
