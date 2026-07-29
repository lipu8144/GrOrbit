import { useState, useMemo } from "react";
import { Search, Store, ChevronRight, X, Ban, CheckCircle2, ExternalLink, MapPin, Star, Eye, Phone, Mail } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, Badge, Avatar, Button, EmptyState } from "../../components/ui/primitives";
import { useTenants, setStatus, setPlan, platformStats, startImpersonation } from "../../lib/adminStore";
import { useNavigate } from "react-router-dom";
import { PLANS } from "../../data/tenants";

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const lakh = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : inr(n));
const STATUS = { active: "green", trial: "amber", suspended: "rose" };

function Drawer({ t, onClose }) {
  const nav = useNavigate();
  const viewData = async () => { await startImpersonation(t); nav("/app"); };
  if (!t) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto qm-slide">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <p className="font-bold" style={{ color: CHARCOAL }}>Restaurant</p>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={t.name} size={52} />
            <div className="flex-1"><p className="font-extrabold text-lg" style={{ color: CHARCOAL }}>{t.name}</p><p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />{t.city} · {t.owner}</p></div>
            <Badge tone={STATUS[t.status]}>{t.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[["Orders", t.orders.toLocaleString("en-IN")], ["Revenue", lakh(t.revenue)], ["Rating", `${t.rating}★`]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-gray-50 p-3 text-center"><p className="text-sm font-extrabold" style={{ color: CHARCOAL }}>{v}</p><p className="text-[11px] text-gray-400 mt-0.5">{l}</p></div>
            ))}
          </div>
          <div>
            <div className="rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Contact</p>
              {t.phone || t.email || t.ownerEmail ? (
                <div className="space-y-2">
                  {t.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold flex items-center gap-2" style={{ color: CHARCOAL }}><Phone size={14} className="text-gray-400" />{t.phone}</span>
                      <span className="flex gap-1.5">
                        <a href={`tel:${t.phone.replace(/\s/g, "")}`} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}>Call</a>
                        <a href={`https://wa.me/${t.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "#DCFCE7", color: "#15803D" }}>WhatsApp</a>
                      </span>
                    </div>
                  )}
                  {(t.email || t.ownerEmail) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2 truncate"><Mail size={14} className="text-gray-400" />{t.email || t.ownerEmail}</span>
                      <a href={`mailto:${t.email || t.ownerEmail}`} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 shrink-0" style={{ color: CHARCOAL }}>Email</a>
                    </div>
                  )}
                  {t.ownerEmail && t.email && t.ownerEmail !== t.email && (
                    <p className="text-[11px] text-gray-400">Login email: {t.ownerEmail}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-600">No contact number on file — ask the owner to add one in Settings → Restaurant.</p>
              )}
            </div>

            <button onClick={viewData} className="w-full mb-4 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: BRAND }}>
              <Eye size={16} /> View this restaurant's data
            </button>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Plan</p>
            <div className="flex gap-2">
              {Object.keys(PLANS).map((p) => (
                <button key={p} onClick={() => setPlan(t.id, p)} className="flex-1 py-2 rounded-xl text-xs font-bold border transition" style={t.plan === p ? { borderColor: BRAND, background: "#F6EFE6", color: BRAND } : { borderColor: "#E5E7EB", color: "#6B7280" }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <a href={`/r/${t.slug}`} target="_blank" rel="noreferrer" className="flex-1"><Button variant="outline" className="w-full" icon={ExternalLink}>View menu</Button></a>
            {t.status === "suspended"
              ? <Button className="flex-1" icon={CheckCircle2} onClick={() => setStatus(t.id, "active")}>Reactivate</Button>
              : <Button variant="outline" className="flex-1 text-rose-600" icon={Ban} onClick={() => setStatus(t.id, "suspended")}>Suspend</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Restaurants() {
  const tenants = useTenants();
  const s = platformStats(tenants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);

  const filtered = useMemo(() => tenants.filter((t) =>
    (filter === "all" || t.status === filter || t.plan === filter) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.city.toLowerCase().includes(search.toLowerCase()) || t.owner.toLowerCase().includes(search.toLowerCase()) || (t.phone || "").includes(search))
  ), [tenants, search, filter]);
  const selected = sel ? tenants.find((t) => t.id === sel) : null;

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Restaurants</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage every tenant on the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Store} label="Total" value={s.total} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={CheckCircle2} label="Active" value={s.active} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={Star} label="On trial" value={s.trials} tint="#FFFBEB" color="#D97706" />
        <StatCard icon={Ban} label="Suspended" value={s.suspended} tint="#FEF2F2" color="#DC2626" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2.5 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, owner..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl qm-focus" />
          </div>
          <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5 overflow-x-auto">
            {[["all", "All"], ["active", "Active"], ["trial", "Trial"], ["suspended", "Suspended"], ["Growth", "Growth"], ["Pro", "Pro"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition" style={filter === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon={Search} title="No restaurants found" body="Try a different search or filter." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 font-bold bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-3">Restaurant</th><th className="text-left px-3 py-3">Owner</th><th className="text-left px-3 py-3">Contact</th>
                  <th className="text-left px-3 py-3">Plan</th><th className="text-right px-3 py-3">Orders</th>
                  <th className="text-right px-3 py-3">Revenue</th><th className="text-left px-3 py-3">Status</th><th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setSel(t.id)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar name={t.name} size={30} /><div><p className="font-bold" style={{ color: CHARCOAL }}>{t.name}</p><p className="text-[11px] text-gray-400">{t.city}</p></div></div></td>
                    <td className="px-3 py-3 text-gray-500">{t.owner}</td>
                    <td className="px-3 py-3">
                      {t.phone ? (
                        <a href={`tel:${t.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline" style={{ color: BRAND }}>{t.phone}</a>
                      ) : <span className="text-[11px] text-amber-600 font-semibold">no number</span>}
                    </td>
                    <td className="px-3 py-3"><Badge tone={t.plan === "Pro" ? "indigo" : t.plan === "Growth" ? "brand" : "gray"}>{t.plan}</Badge></td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: CHARCOAL }}>{t.orders.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3 text-right font-bold" style={{ color: CHARCOAL }}>{lakh(t.revenue)}</td>
                    <td className="px-3 py-3"><Badge tone={STATUS[t.status]}>{t.status}</Badge></td>
                    <td className="px-3 py-3 text-right"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer t={selected} onClose={() => setSel(null)} />
    </div>
  );
}
