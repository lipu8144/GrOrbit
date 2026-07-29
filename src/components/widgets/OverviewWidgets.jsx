import { Link } from "react-router-dom";
import {
  ShoppingBag, UtensilsCrossed, UserPlus, QrCode, Star, Plus, Heart, Gift,
  FolderPlus, Printer, FileDown, Activity as ActIcon, UserCheck, CheckCircle2, ChevronRight,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, SectionTitle, ProgressBar, Button } from "../ui/primitives";
import { Donut } from "../ui/charts";
import { ACTIVITY } from "../../data/notifications";
import { useRestaurant } from "../../lib/restaurantStore";
import { useMenuItems, useMenuCategories } from "../../lib/menuStore";
import { useAnalyticsOrders, summarize } from "../../lib/analyticsStore";
import { useLiveNotifications } from "../../lib/notificationStore";
import { REMOTE } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/authStore";

const ACT_ICON = {
  order: ShoppingBag, menu: UtensilsCrossed, customer: UserPlus, qr: QrCode, review: Star,
  follow: Heart, coupon: Gift,
};
const ACT_TINT = {
  order: ["#F6EFE6", BRAND], menu: ["#EFF6FF", "#2563EB"], customer: ["#ECFDF5", "#16A34A"],
  qr: ["#FAF5FF", "#9333EA"], review: ["#FFFBEB", "#D97706"],
  follow: ["#FFF0F7", "#E1306C"], coupon: ["#F5F3FF", "#8B5CF6"],
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RecentActivityWidget() {
  const liveNotifs = useLiveNotifications();
  const feed = REMOTE
    ? (liveNotifs || []).slice(0, 6).map((n) => ({
        id: n.id, type: n.type || "system",
        text: n.title || n.body || "Update",
        time: n.createdAt ? timeAgo(n.createdAt) : "",
      }))
    : ACTIVITY;
  return (
    <Card className="p-5">
      <SectionTitle action={<ActIcon size={16} className="text-gray-400" />}>Recent activity</SectionTitle>
      {feed.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No activity yet — new orders and reviews will show here.</p>
      ) : (
      <div className="space-y-3">
        {feed.map((a) => {
          const Icon = ACT_ICON[a.type] || ActIcon;
          const [tint, color] = ACT_TINT[a.type] || ["#F3F4F6", "#6B7280"];
          return (
            <div key={a.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: tint }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-sm text-gray-600 flex-1 min-w-0">{a.text}</p>
              <span className="text-[11px] text-gray-400 shrink-0">{a.time}</span>
            </div>
          );
        })}
      </div>
      )}
    </Card>
  );
}

const QUICK = [
  { to: "/app/menu/items", label: "Add Menu Item", icon: Plus, tint: "#F6EFE6", color: BRAND },
  { to: "/app/categories", label: "Add Category", icon: FolderPlus, tint: "#EFF6FF", color: "#2563EB" },
  { to: "/app/qr", label: "Generate QR", icon: QrCode, tint: "#FAF5FF", color: "#9333EA" },
  { to: "/app/qr", label: "Print QR", icon: Printer, tint: "#ECFDF5", color: "#16A34A" },
  { to: "/app/analytics", label: "Download Report", icon: FileDown, tint: "#FFFBEB", color: "#D97706" },
];

export function QuickActionsWidget() {
  return (
    <Card className="p-5">
      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {QUICK.map((q) => (
          <Link key={q.label} to={q.to} className="rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-2 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: q.tint }}>
              <q.icon size={18} style={{ color: q.color }} />
            </div>
            <span className="text-xs font-semibold leading-tight" style={{ color: CHARCOAL }}>{q.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function CustomerVerificationWidget() {
  const raw = useAnalyticsOrders();
  const data = raw ?? (REMOTE ? [] : null);
  const summary = data ? summarize(data, 1, Date.now()) : null;   // today
  const totalCustomers = summary ? summary.customers : 86;
  const firstTime = summary ? summary.newCustomers : 24;
  const returning = summary ? Math.max(0, totalCustomers - firstTime) : 62;
  const total = summary ? totalCustomers : firstTime + returning;
  return (
    <Card className="p-5">
      <SectionTitle action={<UserCheck size={16} className="text-gray-400" />} sub="Captured today">Customer mix</SectionTitle>
      {total === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No customers yet today — your first-time vs returning split will show here.</p>
      ) : (
      <div className="flex items-center gap-4">
        <Donut size={120} width={20} segments={[{ value: returning, color: BRAND }, { value: firstTime, color: "#2563EB" }]} />
        <div className="space-y-2.5">
          <div>
            <p className="text-2xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{total}</p>
            <p className="text-[11px] text-gray-400">total today</p>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} /><span className="text-gray-600">Returning</span><span className="font-bold ml-auto" style={{ color: CHARCOAL }}>{returning}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#2563EB" }} /><span className="text-gray-600">First-time</span><span className="font-bold ml-auto" style={{ color: CHARCOAL }}>{firstTime}</span></div>
          </div>
        </div>
      </div>
      )}
    </Card>
  );
}

const STEPS = [
  { label: "Restaurant name & logo", done: true },
  { label: "Add menu categories", done: true },
  { label: "Add at least 5 menu items", done: true },
  { label: "Generate your QR code", done: false },
  { label: "Set business hours", done: false },
];

export function ProfileCompletionWidget() {
  const settings = useRestaurant();
  const items = useMenuItems();
  const cats = useMenuCategories();
  const { user } = useAuth();
  // Real completion, recomputed live as the owner fills things in.
  const steps = REMOTE ? [
    { label: "Set your restaurant name", done: !!(user?.restaurant || settings?.name) },
    { label: "Add your contact number", done: !!(settings?.contact?.phone || "").trim() },
    { label: "Add menu categories", done: (cats?.length || 0) > 0 },
    { label: "Add at least 5 menu items", done: (items?.length || 0) >= 5 },
    { label: "Add a coupon or reward", done: !!(settings?.growth?.nextVisit?.on || settings?.growth?.google?.url) },
  ] : STEPS;
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <Card className="p-5">
      <SectionTitle action={<span className="text-sm font-extrabold" style={{ color: BRAND }}>{pct}%</span>}>Profile completion</SectionTitle>
      <ProgressBar pct={pct} className="mb-3" />
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 size={16} className={s.done ? "text-emerald-500" : "text-gray-300"} fill={s.done ? "#10B981" : "none"} color={s.done ? "#fff" : "#D1D5DB"} />
            <span className={s.done ? "text-gray-400 line-through" : "font-medium"} style={s.done ? {} : { color: CHARCOAL }}>{s.label}</span>
            {!s.done && <ChevronRight size={14} className="text-gray-300 ml-auto" />}
          </div>
        ))}
      </div>
      <Link to="/app/settings"><Button variant="outline" size="sm" className="w-full mt-3">Complete setup</Button></Link>
    </Card>
  );
}
