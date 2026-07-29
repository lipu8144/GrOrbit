import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, Store, CreditCard, BarChart3, Menu, X, Shield, LogOut, ExternalLink, Users } from "lucide-react";
import { useAuth, logout as authLogout } from "../../lib/authStore";
import { Avatar } from "../../components/ui/primitives";

const BRAND = "#E08A5B";
const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/restaurants", label: "Restaurants", icon: Store },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function SidebarInner({ onNavigate }) {
  return (
    <div className="h-full flex flex-col" style={{ background: "#111827" }}>
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{ background: BRAND }}><Shield size={18} /></div>
        <div className="leading-none"><p className="font-extrabold text-[15px] text-white">GrOrbit</p><p className="text-[10px] text-gray-400 font-medium">Platform Admin</p></div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={({ isActive }) => isActive ? { background: BRAND, color: "#fff" } : { color: "#9CA3AF" }}>
            <n.icon size={18} />{n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <Link to="/app" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5">
          <ExternalLink size={16} />Restaurant view
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { user } = useAuth();
  const logout = () => { authLogout(); nav("/login", { replace: true }); };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarInner />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-64 h-full"><SidebarInner onNavigate={() => setOpen(false)} /></div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: BRAND }} />
            <span className="text-sm font-bold" style={{ color: "#1F2937" }}>Platform Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{user?.name || "Admin"}</p>
              <p className="text-[11px] text-gray-400">{user?.email}</p>
            </div>
            <Avatar name={user?.name || "Admin"} size={34} color="#111827" />
            <button onClick={logout} className="w-9 h-9 grid place-items-center rounded-lg text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition" title="Log out"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
