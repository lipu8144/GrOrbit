import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, MessageSquareWarning, Bell, X, Star } from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { useLiveNotifications } from "../lib/notificationStore";

const ICON = { order: ShoppingBag, feedback: MessageSquareWarning, review: Star };
const TINT = { order: [BRAND, "#F6EFE6"], feedback: ["#DC2626", "#FEF2F2"], review: ["#D97706", "#FFFBEB"] };

// Slide-down toast at the top of the dashboard whenever a live event arrives
// (new customer order, private feedback…). Click → Notifications.
export default function Toaster() {
  const live = useLiveNotifications();
  const nav = useNavigate();
  const [toast, setToast] = useState(null);
  const lastId = useRef(live[0]?.id || null); // don't toast history on mount
  const timer = useRef(null);

  useEffect(() => {
    const newest = live[0];
    if (!newest || newest.id === lastId.current) return;
    lastId.current = newest.id;
    // Fresh events only: history arriving via refetch/tenant-switch is silent.
    if (!newest.createdAt || Date.now() - newest.createdAt > 20000) return;
    setToast(newest);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer.current);
  }, [live]);

  if (!toast) return null;
  const Icon = ICON[toast.type] || Bell;
  const [color, tint] = TINT[toast.type] || [CHARCOAL, "#F3F4F6"];

  return (
    <div className="fixed top-3 left-0 right-0 z-[80] flex justify-center px-4 pointer-events-none">
      <div
        onClick={() => { setToast(null); nav("/app/notifications"); }}
        className="pointer-events-auto qm-drop flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-xl px-4 py-3 w-full max-w-md cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: tint }}>
          <Icon size={17} style={{ color }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{toast.title}</p>
          <p className="text-xs text-gray-500 truncate">{toast.body}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setToast(null); }}
          className="w-7 h-7 grid place-items-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
