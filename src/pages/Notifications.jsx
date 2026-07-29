import { useState } from "react";
import {
  Bell, ShoppingBag, AlertTriangle, Star, UtensilsCrossed, QrCode,
  UserCheck, Settings as Cog, Check, CheckCheck, MessageSquareWarning, Phone,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, Button, EmptyState } from "../components/ui/primitives";
import { NOTIFICATIONS } from "../data/notifications";
import { REMOTE } from "../lib/supabaseClient";
import { useLiveNotifications, markRead as liveMarkRead, markAllRead as liveMarkAll } from "../lib/notificationStore";

const META = {
  order: { icon: ShoppingBag, tint: "#F6EFE6", color: BRAND },
  stock: { icon: AlertTriangle, tint: "#FFFBEB", color: "#D97706" },
  review: { icon: Star, tint: "#FEF9C3", color: "#CA8A04" },
  feedback: { icon: MessageSquareWarning, tint: "#FEF2F2", color: "#DC2626" },
  menu: { icon: UtensilsCrossed, tint: "#EFF6FF", color: "#2563EB" },
  qr: { icon: QrCode, tint: "#FAF5FF", color: "#9333EA" },
  customer: { icon: UserCheck, tint: "#ECFDF5", color: "#16A34A" },
  system: { icon: Cog, tint: "#F3F4F6", color: "#6B7280" },
};
const TABS = [["all", "All"], ["order", "Orders"], ["feedback", "Feedback"], ["stock", "Alerts"], ["review", "Reviews"]];

export default function Notifications() {
  const live = useLiveNotifications();
  const [seen, setSeen] = useState(REMOTE ? [] : NOTIFICATIONS);
  const [tab, setTab] = useState("all");

  // merge live (app-generated) + seed notifications
  const all = [...live, ...seen];
  const filtered = all.filter((n) => tab === "all" || n.type === tab || (tab === "stock" && n.type === "system"));
  const unread = all.filter((n) => n.unread).length;

  const markAll = () => { liveMarkAll(); setSeen((l) => l.map((n) => ({ ...n, unread: false }))); };
  const markOne = (n) => {
    // live notifications (remote UUIDs or demo "n_" ids) are in the store;
    // seed items live only in local `seen` state.
    const isLive = live.some((x) => x.id === n.id);
    if (isLive) liveMarkRead(n.id);
    else setSeen((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Bell size={22} style={{ color: BRAND }} />Notifications
            {unread > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BRAND }}>{unread} new</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Orders, alerts, menu changes and more.</p>
        </div>
        <Button variant="outline" icon={CheckCheck} onClick={markAll}>Mark all read</Button>
      </div>

      <div className="flex bg-white border border-gray-200 rounded-xl p-0.5 w-fit overflow-x-auto">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={tab === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" body="No notifications in this category." />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((n) => {
              const m = META[n.type] || META.system;
              return (
                <div key={n.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/60 transition-colors" style={{ background: n.unread ? "#FFFCFA" : "" }}>
                  <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: m.tint }}><m.icon size={18} style={{ color: m.color }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: CHARCOAL }}>{n.title}</p>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND }} />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                    {n.type === "feedback" && (n.customer || n.phone) && (
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                        <span className="font-semibold text-gray-500">{n.customer}</span>
                        {n.phone && <span className="flex items-center gap-0.5"><Phone size={10} />{n.phone}</span>}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                  </div>
                  {n.unread && (
                    <button onClick={() => markOne(n)} className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 shrink-0" style={{ color: BRAND }}>
                      <Check size={12} />Read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
