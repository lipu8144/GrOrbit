import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Toaster from "../Toaster";
import { useAuth } from "../../lib/authStore";
import { setRid, REMOTE } from "../../lib/supabaseClient";
import { getImpersonation, stopImpersonation, canEditImpersonated, setImpersonationEdit } from "../../lib/adminStore";
import { useRestaurant } from "../../lib/restaurantStore";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function DashboardLayout() {
  // Pin this dashboard to the owner's restaurant. Without this, opening a
  // customer /r/:slug page in the same tab would switch the active tenant
  // and the dashboard would silently read/write the WRONG restaurant.
  const { user } = useAuth();
  const nav = useNavigate();
  const imp = getImpersonation();
  const settings = useRestaurant();
  const noPhone = !imp && !(settings?.contact?.phone || "").trim();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    // pin to the owner's restaurant — unless a super-admin is viewing a tenant
    if (REMOTE && !imp && user?.restaurantId) setRid(user.restaurantId);
    if (REMOTE && imp) setRid(imp.id);
  }, [user?.restaurantId, imp?.id]);
  useEffect(() => {
    const fn = () => { setBlocked(true); setTimeout(() => setBlocked(false), 2600); };
    window.addEventListener("qm-readonly", fn);
    return () => window.removeEventListener("qm-readonly", fn);
  }, []);
  // Save failures used to go only to the console, so a change that never
  // persisted still looked successful. Show them.
  const [saveErr, setSaveErr] = useState("");
  useEffect(() => {
    const fn = (e) => { setSaveErr(String(e.detail || "Something didn’t save.")); setTimeout(() => setSaveErr(""), 7000); };
    window.addEventListener("qm-error", fn);
    return () => window.removeEventListener("qm-error", fn);
  }, []);
  const [editMode, setEditMode] = useState(canEditImpersonated());
  const toggleEdit = async () => { const on = !editMode; setEditMode(on); await setImpersonationEdit(on); };
  const exitImp = () => { stopImpersonation(user?.restaurantId); nav("/admin/restaurants"); };
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-gray-100 sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-64 max-w-[80%] h-full shadow-2xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {saveErr && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[95] max-w-md w-[92%] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg flex items-start gap-2" style={{ background: "#DC2626" }}>
          <span>⚠️</span><span className="flex-1">{saveErr}</span>
          <button onClick={() => setSaveErr("")} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      <Toaster />
      {imp && (
        <div className="fixed top-0 left-0 right-0 z-[90] text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-center gap-3 flex-wrap" style={{ background: editMode ? "#DC2626" : "#2563EB" }}>
          <span>👁️ Viewing <strong>{imp.name}</strong> as super-admin — {editMode ? "EDITING ENABLED" : "read only"}</span>
          <button onClick={toggleEdit} className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">
            {editMode ? "Switch to read-only" : "Enable editing"}
          </button>
          <button onClick={exitImp} className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">Exit</button>
        </div>
      )}
      {blocked && (
        <div className="fixed top-12 left-0 right-0 z-[91] flex justify-center px-4">
          <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">Read-only — changes are disabled while viewing another restaurant</div>
        </div>
      )}
      <div className={`flex-1 min-w-0 flex flex-col ${imp ? "pt-9" : ""}`}>
        <Topbar onOpenSidebar={() => setOpen(true)} />
        <main className="flex-1 min-w-0">
          {noPhone && (
            <div className="mx-4 sm:mx-6 mt-4 rounded-xl px-4 py-3 flex items-center gap-3 text-sm" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <span>📞</span>
              <span className="flex-1" style={{ color: "#92400E" }}>Add your restaurant's contact number so we (and your customers) can reach you.</span>
              <Link to="/app/settings" className="font-bold shrink-0" style={{ color: "#B45309" }}>Add now →</Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
