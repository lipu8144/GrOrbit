import { useState, useEffect } from "react";
import { Gift, Ticket, Plus, Users, Award, TrendingUp, Copy, Check, Crown } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Badge, Button, Toggle, ProgressBar, EmptyState } from "../../components/ui/primitives";
import { Donut } from "../../components/ui/charts";
import { COUPONS, LOYALTY } from "../../data/growth";
import { sb, REMOTE, rid } from "../../lib/supabaseClient";

export default function Coupons() {
  const [coupons, setCoupons] = useState(REMOTE ? [] : COUPONS);
  useEffect(() => {
    if (!REMOTE) return;
    sb.from("coupons").select("*").eq("restaurant_id", rid()).order("code")
      .then(({ data, error }) => {
        if (error) return console.error("coupons fetch:", error.message);
        setCoupons(data.map((r) => ({ id: r.id, code: r.code, desc: r.description, type: r.kind, redeemed: r.redeemed, issued: r.issued, active: r.active, expires: r.expires })));
      });
  }, []);
  const [copied, setCopied] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: "", desc: "", dtype: "percent", value: "10", max: "", minOrder: "", firstOnly: false, days: "" });
  const toggle = (id) => {
    setCoupons((c) => c.map((x) => x.id === id ? { ...x, active: !x.active } : x));
    if (REMOTE) {
      const cur = coupons.find((x) => x.id === id);
      sb.from("coupons").update({ active: !cur?.active }).eq("id", id)
        .then(({ error }) => error && console.error("coupon toggle:", error.message));
    }
  };
  const copy = (code) => { setCopied(code); setTimeout(() => setCopied(null), 1400); };
  const addCoupon = () => {
    if (!form.code.trim() || !Number(form.value)) return;
    const discount = {
      type: form.dtype,
      value: Number(form.value),
      ...(form.dtype === "percent" && Number(form.max) ? { max: Number(form.max) } : {}),
      ...(Number(form.minOrder) ? { minOrder: Number(form.minOrder) } : {}),
      ...(form.firstOnly ? { firstVisitOnly: true } : {}),
    };
    const expires = Number(form.days) ? `${form.days} days` : "Ongoing";
    const desc = form.desc.trim() ||
      (form.dtype === "percent" ? `${form.value}% off` : `₹${form.value} off`) +
      (discount.minOrder ? ` on orders above ₹${discount.minOrder}` : "");
    const entry = { id: Date.now(), code: form.code.trim().toUpperCase(), desc, type: form.firstOnly ? "First-time" : "Custom", redeemed: 0, issued: 0, active: true, expires, discount };
    setCoupons((c) => [entry, ...c]);
    if (REMOTE) {
      sb.from("coupons").insert({ restaurant_id: rid(), code: entry.code, description: desc, kind: entry.type, discount, active: true, expires })
        .then(({ error }) => error && console.error("coupon create:", error.message));
    }
    setForm({ code: "", desc: "" }); setAdding(false);
  };
  const redeemed = coupons.reduce((s, c) => s + c.redeemed, 0);
  const issued = coupons.reduce((s, c) => s + c.issued, 0);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Gift size={22} style={{ color: "#8B5CF6" }} />Coupons & Loyalty
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Bring customers back with rewards — the retention hook from the growth loop.</p>
        </div>
        <Button icon={Plus} onClick={() => setAdding(true)}><span className="hidden sm:inline">New coupon</span></Button>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdding(false)} />
          <Card className="relative w-full max-w-sm p-5">
            <p className="font-bold mb-3" style={{ color: CHARCOAL }}>New coupon</p>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Code</label>
            <input autoFocus value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3.5 py-2.5 text-sm uppercase font-mono bg-white border border-gray-200 rounded-xl qm-focus mb-3" placeholder="SUMMER20" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Discount type</label>
                <select value={form.dtype} onChange={(e) => setForm((f) => ({ ...f, dtype: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus">
                  <option value="percent">% percent off</option>
                  <option value="flat">₹ flat off</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{form.dtype === "percent" ? "Percent" : "Amount ₹"}</label>
                <input type="number" min="1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" />
              </div>
              {form.dtype === "percent" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max discount ₹ <span className="text-gray-300">(optional)</span></label>
                  <input type="number" min="0" value={form.max} onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" placeholder="e.g. 100" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Min order ₹ <span className="text-gray-300">(optional)</span></label>
                <input type="number" min="0" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" placeholder="e.g. 199" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Expires in days <span className="text-gray-300">(blank = ongoing)</span></label>
                <input type="number" min="0" value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" placeholder="30" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 mb-3 text-sm font-semibold cursor-pointer" style={{ color: CHARCOAL }}>
              <input type="checkbox" checked={form.firstOnly} onChange={(e) => setForm((f) => ({ ...f, firstOnly: e.target.checked }))} className="accent-[#E08A5B] w-4 h-4" />
              First-time visitors only
              <span className="text-[10px] font-medium text-gray-400">(phone with no prior order)</span>
            </label>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description <span className="text-gray-300">(optional — auto-written)</span></label>
            <input value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus mb-4" placeholder="20% off this summer" />
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addCoupon}>Create</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Ticket} label="Coupons redeemed" value={redeemed} delta={9} tint="#F5F3FF" color="#8B5CF6" />
        <StatCard icon={TrendingUp} label="Redemption rate" value={issued > 0 ? `${Math.round((redeemed / issued) * 100)}%` : "0%"} delta={REMOTE ? 0 : 5} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={Users} label="Loyalty members" value={REMOTE ? "—" : LOYALTY.members.toLocaleString("en-IN")} delta={REMOTE ? 0 : LOYALTY.delta} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Award} label="Points issued" value={REMOTE ? "—" : `${(LOYALTY.pointsIssued / 1000).toFixed(0)}k`} delta={REMOTE ? 0 : 12} tint="#FFFBEB" color="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* coupons list */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Your coupons</SectionTitle>
          {coupons.length === 0 ? (
            <EmptyState icon={Ticket} title="No coupons yet" body="Create your first reward to bring customers back." action={<Button icon={Plus} size="sm" onClick={() => setAdding(true)}>New coupon</Button>} />
          ) : (
            <div className="space-y-2.5">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: "#F5F3FF" }}><Ticket size={18} style={{ color: "#8B5CF6" }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-sm" style={{ color: CHARCOAL }}>{c.code}</span>
                      <button onClick={() => copy(c.code)} className="text-gray-400 hover:text-gray-600">{copied === c.code ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}</button>
                      <Badge tone="indigo">{c.type}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.desc} · expires {c.expires}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-bold" style={{ color: CHARCOAL }}>{c.redeemed}/{c.issued}</p>
                    <p className="text-[11px] text-gray-400">redeemed</p>
                  </div>
                  <Toggle checked={c.active} onChange={() => toggle(c.id)} label="Active" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* loyalty */}
        <Card className="p-5">
          <SectionTitle action={<Crown size={16} style={{ color: "#F59E0B" }} />}>Loyalty program</SectionTitle>
          <div className="flex items-center gap-4 mb-4">
            <Donut size={120} width={20} segments={LOYALTY.tiers.map((t) => ({ value: REMOTE ? 0 : t.members, color: t.color }))} />
            <div>
              <p className="text-2xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{REMOTE ? "—" : LOYALTY.members.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-gray-400">total members</p>
            </div>
          </div>
          <div className="space-y-2">
            {LOYALTY.tiers.map((t) => (
              <div key={t.name} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />
                <span className="text-gray-600 flex-1">{t.name}</span>
                <span className="font-bold" style={{ color: CHARCOAL }}>{t.members}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-gray-500">Points redeemed</span><span className="font-semibold" style={{ color: CHARCOAL }}>{REMOTE ? "—" : `${Math.round((LOYALTY.pointsRedeemed / LOYALTY.pointsIssued) * 100)}%`}</span></div>
            <ProgressBar pct={(LOYALTY.pointsRedeemed / LOYALTY.pointsIssued) * 100} color="#8B5CF6" />
          </div>
        </Card>
      </div>
    </div>
  );
}
