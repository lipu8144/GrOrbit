import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, Check, Store, ShoppingBag, UtensilsCrossed, Users, LogOut, UserCircle, Settings as Cog } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Avatar } from "../ui/primitives";
import { NOTIFICATIONS } from "../../data/notifications";
import { useLiveNotifications } from "../../lib/notificationStore";
import { useMenuItems } from "../../lib/menuStore";
import { CUSTOMERS } from "../../data/customers";
import { SEED_ORDERS } from "../../data/orders";
import { REMOTE } from "../../lib/supabaseClient";
import { useAuth, logout as authLogout } from "../../lib/authStore";

const RESTAURANTS = ["Spice Junction", "Spice Junction — Mall Road", "The Curry Co."];

// Search index is built per-render from LIVE data (menu edits appear in
// search immediately; demo entries excluded in live mode).
const useSearchIndex = () => {
  const menuItems = useMenuItems();
  return [
    ...(REMOTE ? [] : SEED_ORDERS).map((o) => ({ type: "Order", label: `${o.token} · ${o.customer}`, to: "/app/orders/live", icon: ShoppingBag })),
    ...menuItems.map((m) => ({ type: "Menu", label: m.name, to: "/app/menu/items", icon: UtensilsCrossed })),
    ...(REMOTE ? [] : CUSTOMERS).map((c) => ({ type: "Customer", label: c.name, to: "/app/customers", icon: Users })),
  ];
};

export default function Topbar({ onOpenSidebar }) {
  const INDEX = useSearchIndex();
  const nav = useNavigate();
  const [active, setActive] = useState(REMOTE ? "" : RESTAURANTS[0]);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const live = useLiveNotifications();
  const allNotifs = [...live, ...(REMOTE ? [] : NOTIFICATIONS)];
  const unread = allNotifs.filter((n) => n.unread).length;
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return INDEX.filter((x) => x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  }, [q]);

  const go = (to) => { setQ(""); setFocused(false); setProfileOpen(false); nav(to); };
  const logout = () => { setProfileOpen(false); authLogout(); nav("/login", { replace: true }); };
  const { user } = useAuth();
  const restaurantList = REMOTE ? [user?.restaurant || "My Restaurant"] : RESTAURANTS;
  const activeName = REMOTE ? (user?.restaurant || "My Restaurant") : (active || RESTAURANTS[0]);
  useEffect(() => { if (REMOTE && user?.restaurant) setActive(user.restaurant); }, [user?.restaurant]);
  const displayName = user?.name || (REMOTE ? "Owner" : "Ravi Kumar");
  const displayEmail = user?.email || (REMOTE ? "" : "ravi@spicejunction.in");

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 sticky top-0 z-30">
      <button onClick={onOpenSidebar} className="lg:hidden w-9 h-9 shrink-0 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100">
        <Menu size={20} />
      </button>

      {/* restaurant switcher */}
      <div className="relative min-w-0">
        <button onClick={() => { setSwitchOpen((o) => !o); setNotifOpen(false); }}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition max-w-[46vw] sm:max-w-none">
          <span className="w-6 h-6 shrink-0 rounded-lg grid place-items-center text-white" style={{ background: BRAND }}><Store size={13} /></span>
          <span className="text-sm font-bold max-w-[90px] sm:max-w-none truncate" style={{ color: CHARCOAL }}>{activeName}</span>
          <ChevronDown size={15} className="text-gray-400 shrink-0" />
        </button>
        {switchOpen && (<>
          <div className="fixed inset-0 z-30" onClick={() => setSwitchOpen(false)} />
          <div className="absolute left-0 top-12 z-40 w-64 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3.5 py-1.5">Your restaurants</p>
            {restaurantList.map((r) => (
              <button key={r} onClick={() => { setActive(r); setSwitchOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <span className="truncate">{r}</span>{active === r && <Check size={15} style={{ color: BRAND }} />}
              </button>
            ))}
          </div>
        </>)}
      </div>

      {/* site search */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search orders, menu items, customers..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl qm-focus transition" />
        {focused && results.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-40 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5">
            {results.map((r, i) => (
              <button key={i} onMouseDown={() => go(r.to)} className="w-full flex items-center gap-3 px-3.5 py-2 text-sm hover:bg-gray-50 text-left">
                <r.icon size={15} className="text-gray-400" />
                <span className="flex-1 truncate" style={{ color: CHARCOAL }}>{r.label}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        {/* notifications */}
        <div className="relative">
          <button onClick={() => { setNotifOpen((o) => !o); setSwitchOpen(false); }}
            className="w-9 h-9 shrink-0 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 relative">
            <Bell size={19} />
            {unread > 0 && <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-bold text-white grid place-items-center ring-2 ring-white" style={{ background: BRAND }}>{unread}</span>}
          </button>
          {notifOpen && (<>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-12 z-40 w-80 max-w-[90vw] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
                <p className="text-sm font-bold" style={{ color: CHARCOAL }}>Notifications</p>
                <span className="text-[11px] font-semibold" style={{ color: BRAND }}>{unread} new</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {allNotifs.slice(0, 5).map((n) => (
                  <div key={n.id} className="px-3.5 py-2.5 hover:bg-gray-50 cursor-pointer flex gap-2.5" onClick={() => go("/app/notifications")}>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: BRAND }} />}
                    <div className={n.unread ? "" : "pl-4"}>
                      <p className="text-sm font-semibold leading-tight" style={{ color: CHARCOAL }}>{n.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => go("/app/notifications")} className="w-full py-2.5 text-xs font-bold border-t border-gray-100 hover:bg-gray-50" style={{ color: BRAND }}>
                View all notifications
              </button>
            </div>
          </>)}
        </div>

        {/* profile */}
        <div className="relative">
          <button onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); setSwitchOpen(false); }} className="flex items-center gap-2 pl-1 sm:pl-2 rounded-xl hover:bg-gray-100 py-1 pr-1 sm:pr-2 transition">
            <Avatar name={displayName} size={34} />
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-bold" style={{ color: CHARCOAL }}>{displayName}</p>
              <p className="text-[11px] text-gray-400">Owner</p>
            </div>
            <ChevronDown size={15} className="text-gray-400 hidden md:block" />
          </button>
          {profileOpen && (<>
            <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-12 z-40 w-60 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <Avatar name={displayName} size={40} />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{displayName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{displayEmail}</p>
                </div>
              </div>
              <div className="py-1.5">
                <button onClick={() => go("/app/settings")} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"><UserCircle size={16} className="text-gray-400" />My profile</button>
                <button onClick={() => go("/app/settings")} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"><Cog size={16} className="text-gray-400" />Settings</button>
                <button onClick={() => go("/app/notifications")} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"><Bell size={16} className="text-gray-400" />Notifications</button>
              </div>
              <div className="py-1.5 border-t border-gray-100">
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut size={16} />Log out</button>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </header>
  );
}
