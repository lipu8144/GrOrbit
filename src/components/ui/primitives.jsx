import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, sub }) {
  return (
    <div className="flex items-start justify-between mb-3 gap-3">
      <div>
        <h2 className="text-base font-bold" style={{ color: CHARCOAL }}>{children}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, delta, tint = "#F6EFE6", color = BRAND, sub }) {
  const up = delta == null ? null : delta >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: tint }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {delta != null && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-500"}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold mt-3 leading-none" style={{ color: CHARCOAL }}>{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{label}{sub && <span className="text-gray-400"> · {sub}</span>}</p>
    </Card>
  );
}

export function Badge({ tone = "gray", children }) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
    brand: "bg-orange-50 text-orange-600 border-orange-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[tone]}`}>{children}</span>;
}

export function Button({ variant = "primary", size = "md", icon: Icon, children, className = "", ...rest }) {
  const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2.5 text-sm gap-2", lg: "px-5 py-3 text-sm gap-2" };
  const base = `inline-flex items-center justify-center font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${sizes[size]} ${className}`;
  if (variant === "primary") return <button className={`${base} text-white qm-btn-primary shadow-sm`} {...rest}>{Icon && <Icon size={16} />}{children}</button>;
  if (variant === "ghost") return <button className={`${base} text-gray-600 hover:bg-gray-100`} {...rest}>{Icon && <Icon size={16} />}{children}</button>;
  return <button className={`${base} border border-gray-200 bg-white hover:bg-gray-50`} style={{ color: CHARCOAL }} {...rest}>{Icon && <Icon size={16} />}{children}</button>;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label}
      className="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: checked ? BRAND : "#E5E7EB" }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

export function Avatar({ name, size = 36, color = BRAND }) {
  return (
    <span className="rounded-full grid place-items-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() || "?"}
    </span>
  );
}

export function ProgressBar({ pct, color = BRAND, className = "" }) {
  return (
    <div className={`h-2 rounded-full bg-gray-100 overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function EmptyState({ icon: Icon = Plus, title, body, action }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 grid place-items-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-gray-300" />
      </div>
      <p className="font-semibold" style={{ color: CHARCOAL }}>{title}</p>
      {body && <p className="text-sm text-gray-400 mt-1 mb-4 max-w-xs mx-auto">{body}</p>}
      {action}
    </div>
  );
}
