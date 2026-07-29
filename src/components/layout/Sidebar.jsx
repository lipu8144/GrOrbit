import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, FolderTree, Users,
  QrCode, BarChart3, Bell, Settings, X, ChevronDown, TrendingUp, Store,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { REMOTE } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/authStore";
import { usePlacedOrders } from "../../lib/orderStore";
import { useLiveNotifications } from "../../lib/notificationStore";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  {
    label: "Orders", icon: ShoppingCart, children: [
      { to: "/app/orders/live", label: "Live Orders", badgeKey: "liveOrders" },
      { to: "/app/orders/history", label: "Order History" },
    ],
  },
  {
    label: "Menu", icon: UtensilsCrossed, children: [
      { to: "/app/menu/items", label: "Menu Items" },
      { to: "/app/menu/specials", label: "Today's Specials" },
    ],
  },
  { to: "/app/categories", label: "Categories", icon: FolderTree },
  { to: "/app/customers", label: "Customers", icon: Users },
  {
    label: "Growth", icon: TrendingUp, children: [
      { to: "/app/growth/reviews", label: "Reviews" },
      { to: "/app/growth/social", label: "Social" },
      { to: "/app/growth/whatsapp", label: "WhatsApp" },
      { to: "/app/growth/coupons", label: "Coupons & Loyalty" },
    ],
  },
  { to: "/app/qr", label: "QR Codes", icon: QrCode },
  { to: "/app/storefront", label: "Storefront", icon: Store },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/notifications", label: "Notifications", icon: Bell, badgeKey: "unreadNotifs" },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function LogoMark() {
  return (
    <div className="px-2">
      <img src="/grorbit-logo.png" alt="GrOrbit" className="h-7 w-auto" />
      <p className="text-[10px] text-gray-400 font-medium mt-0.5 pl-0.5 flex items-center gap-1.5">
        <RestaurantName />
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold" style={REMOTE ? { background: "#ECFDF5", color: "#059669" } : { background: "#F3F4F6", color: "#6B7280" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: REMOTE ? "#10B981" : "#9CA3AF" }} />
          {REMOTE ? "Live" : "Demo"}
        </span>
      </p>
    </div>
  );
}

function Group({ item, onNavigate, badgeFor }) {
  const loc = useLocation();
  const childActive = item.children.some((c) => loc.pathname.startsWith(c.to));
  const [open, setOpen] = useState(childActive);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={childActive ? { color: BRAND } : { color: "#6B7280" }}>
        <item.icon size={18} style={{ color: childActive ? BRAND : "#9CA3AF" }} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "#9CA3AF" }} />
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 mt-0.5">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} onClick={onNavigate}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={({ isActive }) => isActive ? { background: "#F6EFE6", color: BRAND } : { color: "#6B7280" }}>
              {({ isActive }) => (
                <>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? BRAND : "#D1D5DB" }} />
                  <span className="flex-1">{c.label}</span>
                  {badgeFor(c.badgeKey) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: isActive ? BRAND : "#D1D5DB" }}>{badgeFor(c.badgeKey)}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantName() {
  const { user } = useAuth();
  return <>{user?.restaurant || "Restaurant Dashboard"}</>;
}

export default function Sidebar({ onNavigate }) {
  const placedOrders = usePlacedOrders();
  const activeOrders = placedOrders.filter((o) => o.status === "new" || o.status === "preparing").length;
  const notifs = useLiveNotifications();
  const unread = (notifs || []).filter((n) => n.unread).length;
  const badgeFor = (key) => {
    const n = key === "liveOrders" ? activeOrders : key === "unreadNotifs" ? unread : 0;
    return n > 0 ? String(n) : null;
  };
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-16 flex items-center justify-between px-3 border-b border-gray-100 shrink-0">
        <LogoMark />
        <button onClick={onNavigate} className="lg:hidden w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) =>
          item.children ? (
            <Group key={item.label} item={item} onNavigate={onNavigate} badgeFor={badgeFor} />
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={({ isActive }) => isActive ? { background: "#F6EFE6", color: BRAND } : { color: "#6B7280" }}>
              {({ isActive }) => (
                <>
                  <item.icon size={18} style={{ color: isActive ? BRAND : "#9CA3AF" }} />
                  <span className="flex-1">{item.label}</span>
                  {badgeFor(item.badgeKey) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: isActive ? BRAND : "#D1D5DB" }}>{badgeFor(item.badgeKey)}</span>}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      <div className="p-3 shrink-0">
        <div className="rounded-2xl p-3.5 bg-gray-50 border border-gray-100">
          <p className="text-xs font-bold" style={{ color: CHARCOAL }}>GrOrbit v1</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Promotions, Staff & Reviews coming soon.</p>
        </div>
      </div>
    </div>
  );
}
