import { useState } from "react";
import { Star, MessageSquare, Send, Reply, TrendingUp, Award, MessageSquareWarning, Phone, Check } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Badge, Avatar, Button, ProgressBar, EmptyState } from "../../components/ui/primitives";
import { Sparkline } from "../../components/ui/charts";
import { REVIEWS, REVIEW_TREND, RATING_BREAKDOWN, GROWTH_STATS } from "../../data/growth";
import { REMOTE } from "../../lib/supabaseClient";
import { useLiveNotifications, markRead } from "../../lib/notificationStore";

const SOURCE = { google: { label: "Google", tone: "amber" }, zomato: { label: "Zomato", tone: "rose" } };

export default function Reviews() {
  const [reviews, setReviews] = useState(REMOTE ? [] : REVIEWS);
  const [filter, setFilter] = useState("all");
  const liveNotifs = useLiveNotifications();
  const privateFeedback = liveNotifs.filter((n) => n.type === "feedback" && n.unread);
  const breakdown = REMOTE ? RATING_BREAKDOWN.map((r) => ({ ...r, count: 0 })) : RATING_BREAKDOWN;
  const total = breakdown.reduce((s, r) => s + r.count, 0);
  const reply = (id) => setReviews((r) => r.map((x) => x.id === id ? { ...x, replied: true } : x));
  const shown = reviews.filter((r) => filter === "all" || (filter === "unreplied" && !r.replied) || r.source === filter);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Star size={22} className="fill-amber-400 text-amber-400" />Review Growth
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Turn happy diners into public 5★ reviews — automatically.</p>
        </div>
        <Button icon={Send} onClick={() => window.open("/app/growth/whatsapp", "_self")}><span className="hidden sm:inline">Request reviews</span></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Star} label="Avg rating" value={REMOTE ? "—" : `${GROWTH_STATS.reviews.rating}★`} tint="#FFFBEB" color="#F59E0B" />
        <StatCard icon={MessageSquare} label="Total reviews" value={REMOTE ? "—" : GROWTH_STATS.reviews.value.toLocaleString("en-IN")} delta={REMOTE ? 0 : GROWTH_STATS.reviews.delta} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={TrendingUp} label="This month" value={REMOTE ? "—" : "+312"} delta={REMOTE ? 0 : 18} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={Award} label="Reply rate" value={REMOTE ? "—" : "86%"} delta={REMOTE ? 0 : 4} tint="#EFF6FF" color="#2563EB" />
      </div>

      {privateFeedback.length > 0 && (
        <Card className="p-5 border-rose-200" >
          <SectionTitle sub="Low ratings are kept private so they never hit Google — reach out and make it right">
            <span className="flex items-center gap-2 text-rose-600"><MessageSquareWarning size={16} />Needs attention · {privateFeedback.length}</span>
          </SectionTitle>
          <div className="space-y-2.5">
            {privateFeedback.map((f) => (
              <div key={f.id} className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <span className="flex text-amber-400 shrink-0 mt-0.5">{Array.from({ length: f.rating || 1 }).map((_, i) => <Star key={i} size={12} className="fill-amber-400" />)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{f.body}</p>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                    <span className="font-semibold text-gray-500">{f.customer}</span>
                    {f.phone && <a href={`https://wa.me/${f.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-0.5" style={{ color: "#25D366" }}><Phone size={10} />Reach out</a>}
                    <span>· {f.time}</span>
                  </p>
                </div>
                <button onClick={() => markRead(f.id)} className="text-[11px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shrink-0" style={{ color: CHARCOAL }}><Check size={12} />Resolve</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* breakdown + trend */}
        <Card className="p-5">
          <SectionTitle>Rating breakdown</SectionTitle>
          <div className="space-y-2">
            {breakdown.map((r) => (
              <div key={r.stars} className="flex items-center gap-2">
                <span className="text-xs font-semibold w-6 flex items-center gap-0.5" style={{ color: CHARCOAL }}>{r.stars}<Star size={10} className="fill-amber-400 text-amber-400" /></span>
                <ProgressBar pct={(r.count / total) * 100} color="#F59E0B" className="flex-1" />
                <span className="text-xs text-gray-400 w-10 text-right">{r.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Reviews trend</p>
            <Sparkline data={REMOTE ? [] : REVIEW_TREND} w={360} h={70} color="#F59E0B" />
          </div>
        </Card>

        {/* feed */}
        <Card className="p-0 overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-base font-bold" style={{ color: CHARCOAL }}>Recent reviews</p>
            <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5 overflow-x-auto">
              {[["all", "All"], ["unreplied", "Needs reply"], ["google", "Google"], ["zomato", "Zomato"]].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={filter === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={Star} title="No reviews here" body="Try a different filter." />
          ) : (
            <div className="divide-y divide-gray-50">
              {shown.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Avatar name={r.author} size={32} color="#F59E0B" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: CHARCOAL }}>{r.author}</span>
                        <Badge tone={SOURCE[r.source].tone}>{SOURCE[r.source].label}</Badge>
                      </div>
                      <span className="flex text-amber-400">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400" />)}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{r.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-[42px]">{r.text}</p>
                  <div className="ml-[42px] mt-2">
                    {r.replied
                      ? <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Reply size={12} />Replied</span>
                      : <button onClick={() => reply(r.id)} className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}><Reply size={12} />Reply</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
