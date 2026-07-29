import { Instagram, Facebook, MessageCircle, TrendingUp, Heart, Share2, Megaphone } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Button } from "../../components/ui/primitives";
import { Sparkline } from "../../components/ui/charts";
import { SOCIAL } from "../../data/growth";
import { REMOTE } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/authStore";
import { useRestaurant } from "../../lib/restaurantStore";
import { shareOrCopy } from "../../lib/download";

const ICON = { Instagram, Facebook, WhatsApp: MessageCircle };

export default function Social() {
  const { user } = useAuth();
  const settings = useRestaurant();
  const handleFor = (platform) => {
    const g = settings?.growth || {};
    if (platform === "Instagram") return g.instagram?.url || "";
    if (platform === "Facebook") return g.facebook?.url || "";
    if (platform === "WhatsApp") return g.whatsapp?.number || "";
    return "";
  };
  const bizName = user?.restaurant || "our menu";
  const menuHref = window.location.origin + (user?.slug ? `/r/${user.slug}` : "");
  const total = REMOTE ? 0 : SOCIAL.reduce((s, p) => s + p.followers, 0);
  const fmt = (n) => REMOTE ? "—" : n.toLocaleString("en-IN");
  const gained = 1840;

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Heart size={22} style={{ color: "#E1306C" }} />Social Growth
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Turn diners into followers before they leave the table.</p>
        </div>
        <Button icon={Share2} onClick={() => shareOrCopy({ title: bizName, text: `Order from ${bizName}`, url: menuHref })}><span className="hidden sm:inline">Share menu</span></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Heart} label="Total followers" value={REMOTE ? "—" : total.toLocaleString("en-IN")} delta={20} tint="#FFF0F7" color="#E1306C" />
        <StatCard icon={TrendingUp} label="Gained this month" value={REMOTE ? "—" : `+${gained.toLocaleString("en-IN")}`} delta={REMOTE ? 0 : 22} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={Instagram} label="Instagram" value={fmt(SOCIAL[0].followers)} delta={REMOTE ? 0 : SOCIAL[0].delta} tint="#FFF0F7" color="#E1306C" />
        <StatCard icon={MessageCircle} label="WhatsApp list" value={fmt(SOCIAL[2].followers)} delta={REMOTE ? 0 : SOCIAL[2].delta} tint="#ECFDF5" color="#25D366" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {SOCIAL.map((p) => {
          const Icon = ICON[p.platform];
          return (
            <Card key={p.platform} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: p.color + "1A" }}><Icon size={20} style={{ color: p.color }} /></div>
                <div className="flex-1"><p className="font-bold" style={{ color: CHARCOAL }}>{p.platform}</p><p className="text-xs text-gray-400">{REMOTE ? (handleFor(p.platform) || "Not connected") : p.handle}</p></div>
                {!REMOTE && <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp size={12} />{p.delta}%</span>}
              </div>
              <p className="text-2xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{REMOTE ? "—" : p.followers.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-gray-400 mb-2">followers</p>
              <Sparkline data={REMOTE ? [] : p.trend} w={320} h={56} color={p.color} />
            </Card>
          );
        })}
      </div>

      {/* auto-prompt settings */}
      <Card className="p-5">
        <SectionTitle sub="Shown to customers after they order — the in-flow prompts from the landing page">
          <span className="flex items-center gap-2"><Megaphone size={16} style={{ color: BRAND }} />Growth prompts</span>
        </SectionTitle>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Instagram, label: "Follow on Instagram", color: "#E1306C", on: true },
            { icon: Facebook, label: "Like on Facebook", color: "#1877F2", on: true },
            { icon: MessageCircle, label: "Join WhatsApp updates", color: "#25D366", on: false },
          ].map((p) => (
            <div key={p.label} className="rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: p.color + "1A" }}><p.icon size={16} style={{ color: p.color }} /></div>
              <span className="text-sm font-semibold flex-1" style={{ color: CHARCOAL }}>{p.label}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${p.on ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>{p.on ? "On" : "Off"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
