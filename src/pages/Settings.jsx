import { useState } from "react";
import { uploadImage } from "../lib/storage";
import { useRestaurant, updateRestaurant, updateRestaurantName, updateMenuSessionMins } from "../lib/restaurantStore";
import { useAuth, patchSession, updatePassword } from "../lib/authStore";
import { checkPassword } from "../lib/validation";
import {
  Store, Clock, ShoppingBag, CreditCard, UserCog, Phone, MapPin, Mail,
  Instagram, Facebook, MessageCircle, Star, UploadCloud, Image as ImageIcon,
  Check, Shield, Eye, EyeOff } from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, Button, Toggle } from "../components/ui/primitives";

const field = "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus transition";
const Label = ({ children }) => <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{children}</label>;

const TABS = [
  { key: "restaurant", label: "Restaurant", icon: Store },
  { key: "hours", label: "Business Hours", icon: Clock },
  { key: "ordering", label: "Ordering", icon: ShoppingBag },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "account", label: "Account", icon: UserCog },
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Settings() {
  const { user } = useAuth();
  const liveSettings = useRestaurant();
  const rSettings0 = () => liveSettings;
  const [tab, setTab] = useState("restaurant");
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.restaurant || rSettings0().name || "");
  const [contact, setContact] = useState(() => ({ phone: "", email: "", address: "", ...rSettings0().contact }));
  const [social, setSocial] = useState(() => {
    const g = rSettings0().growth || {};
    return {
      instagram: g.instagram?.url || "", facebook: g.facebook?.url || "",
      whatsapp: g.whatsapp?.number || "", google: g.google?.url || "",
    };
  });
  const ord = rSettings0().ordering || {};
  const [dinein, setDinein] = useState(ord.dinein !== false);
  const [parcel, setParcel] = useState(ord.parcel !== false);
  const [acceptingOrders, setAcceptingOrders] = useState(ord.acceptingOrders !== false);   // master open/closed
  const [autoAccept, setAutoAccept] = useState(!!ord.autoAccept);
  const [closed, setClosed] = useState(() => rSettings0().closedDays || { Sunday: true });
  const [sessionMins, setSessionMins] = useState(() => rSettings0().menuSessionMins ?? 0);
  const nv0 = rSettings0().growth?.nextVisit || {};
  const [nv, setNv] = useState({ type: nv0.type || "flat", value: nv0.value ?? 30, minOrder: nv0.minOrder ?? 199, days: nv0.days ?? 30, on: nv0.on !== false });
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ ok: false, text: "" });
  const changePw = async () => {
    const rules = checkPassword(newPw);
    if (!rules.ok) return setPwMsg({ ok: false, text: "Password needs " + rules.missing.join(", ") + "." });
    if (newPw !== confirmPw) return setPwMsg({ ok: false, text: "Passwords don't match." });
    setPwBusy(true);
    const res = await updatePassword(newPw);
    setPwBusy(false);
    if (res.ok) { setPwMsg({ ok: true, text: "Password updated." }); setNewPw(""); setConfirmPw(""); }
    else setPwMsg({ ok: false, text: res.error || "Could not update password." });
  };
  const [formKey, setFormKey] = useState(0);
  const [logo, setLogo] = useState(() => rSettings0().logoUrl || null);
  const [banner, setBanner] = useState(() => rSettings0().bannerUrl || null);
  const [imgErr, setImgErr] = useState("");
  const onFile = (setter, key) => async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgErr("");
    setter(URL.createObjectURL(f));                 // instant local preview only
    const res = await uploadImage(f, key);          // real, persistable URL
    if (res.ok) {
      setter(res.url);                              // replace blob with the real URL
      updateRestaurant({ [key]: res.url });         // persist immediately
    } else {
      setter(null);                                 // never keep a dead blob URL
      setImgErr(res.error || "Upload failed. Check your image storage is set up.");
    }
  };
  const cancel = () => { setFormKey((k) => k + 1); setLogo(null); setBanner(null); };
  const save = () => {
    const cur = rSettings0();
    const safeUrl = (u) => (u && !String(u).startsWith("blob:")) ? u : null;   // never persist a dead blob: preview
    const logoOk = safeUrl(logo), bannerOk = safeUrl(banner);
    updateRestaurant({
      contact: { ...cur.contact, ...contact },
      ...(logoOk ? { logoUrl: logoOk } : {}),
      ...(bannerOk ? { bannerUrl: bannerOk } : {}),
      ordering: { dinein, parcel, autoAccept, acceptingOrders },
      closedDays: closed,
      menuSessionMins: sessionMins,
      growth: {
        ...cur.growth,
        nextVisit: { type: nv.type, value: Number(nv.value) || 0, minOrder: Number(nv.minOrder) || 0, days: Number(nv.days) || 30, on: nv.on },
        instagram: { ...cur.growth?.instagram, url: social.instagram, on: !!social.instagram },
        facebook: { ...cur.growth?.facebook, url: social.facebook, on: !!social.facebook },
        whatsapp: { ...cur.growth?.whatsapp, number: social.whatsapp, on: !!social.whatsapp },
        google: { ...cur.growth?.google, url: social.google, on: !!social.google },
      },
    });
    updateMenuSessionMins(Number(sessionMins) || 0);
    if (name.trim() && name.trim() !== user?.restaurant) {
      updateRestaurantName(name.trim());
      patchSession({ restaurant: name.trim() });
    }
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your restaurant profile, hours, ordering and billing.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* tabs */}
        <div className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible bg-white lg:bg-transparent border lg:border-0 border-gray-100 rounded-xl p-1 lg:p-0">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition"
                style={tab === t.key ? { background: "#F6EFE6", color: BRAND } : { color: "#6B7280" }}>
                <t.icon size={17} style={{ color: tab === t.key ? BRAND : "#9CA3AF" }} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* panel */}
        <div key={formKey} className="flex-1 min-w-0 space-y-6">
          {tab === "restaurant" && (
            <>
              <Card className="p-5">
                <div className="relative mb-14">
                  <div className="h-28 rounded-2xl flex items-center justify-center relative overflow-hidden bg-cover bg-center" style={banner ? { backgroundImage: `url(${banner})` } : { background: `linear-gradient(135deg, ${BRAND}, #C97245)` }}>
                    <label className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"><ImageIcon size={14} />Change banner<input type="file" accept="image/*" className="hidden" onChange={onFile(setBanner, "bannerUrl")} /></label>
                  </div>
                  <div className="absolute -bottom-10 left-5">
                    <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md grid place-items-center text-3xl relative overflow-hidden bg-cover bg-center" style={logo ? { backgroundImage: `url(${logo})` } : {}}>{!logo && "🍽️"}
                      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg grid place-items-center text-white shadow cursor-pointer" style={{ background: BRAND }}><UploadCloud size={14} /><input type="file" accept="image/*" className="hidden" onChange={onFile(setLogo, "logoUrl")} /></label>
                      {imgErr && <p className="absolute -bottom-8 left-0 text-[11px] text-rose-500 whitespace-nowrap">{imgErr}</p>}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Label>Restaurant name</Label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your restaurant name" className={field} /></div>
                  <div><Label>Phone</Label><div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} placeholder="+91…" className={field + " pl-9"} /></div></div>
                  <div><Label>Email</Label><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} placeholder="hello@…" className={field + " pl-9"} /></div></div>
                  <div className="sm:col-span-2"><Label>Address</Label><div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-gray-400" /><textarea rows={2} value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} placeholder="Street, city, PIN" className={field + " pl-9 resize-none"} /></div></div>
                </div>
              </Card>
              <Card className="p-5">
                <p className="text-sm font-bold mb-3" style={{ color: CHARCOAL }}>Social & reviews</p>
                <div className="space-y-3">
                  {[{ icon: Instagram, l: "Instagram", c: "#E1306C", k: "instagram", ph: "instagram.com/yourpage" }, { icon: Facebook, l: "Facebook", c: "#1877F2", k: "facebook", ph: "facebook.com/yourpage" }, { icon: MessageCircle, l: "WhatsApp", c: "#25D366", k: "whatsapp", ph: "+91…" }, { icon: Star, l: "Google review link", c: "#D97706", k: "google", ph: "g.page/r/…/review" }].map((s) => (
                    <div key={s.l} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: s.c + "1A" }}><s.icon size={18} style={{ color: s.c }} /></div>
                      <div className="flex-1"><Label>{s.l}</Label><input value={social[s.k]} onChange={(e) => setSocial((v) => ({ ...v, [s.k]: e.target.value }))} placeholder={s.ph} className={field} /></div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "hours" && (
            <Card className="p-5">
              <p className="text-sm font-bold mb-3" style={{ color: CHARCOAL }}>Opening hours</p>
              <div className="space-y-2">
                {DAYS.map((d) => (
                  <div key={d} className="flex items-center gap-3 py-1.5">
                    <span className="w-24 text-sm font-semibold" style={{ color: CHARCOAL }}>{d}</span>
                    {closed[d] ? (
                      <span className="flex-1 text-sm text-gray-400">Closed</span>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <input defaultValue="11:00 AM" className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg qm-focus" />
                        <span className="text-gray-400 text-sm">to</span>
                        <input defaultValue="11:00 PM" className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg qm-focus" />
                      </div>
                    )}
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Closed</span><Toggle checked={!!closed[d]} onChange={(v) => setClosed((c) => ({ ...c, [d]: v }))} label="Closed" /></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === "ordering" && (
            <Card className="p-5 space-y-1">
              <div className="flex items-center justify-between p-3 mb-2 rounded-xl" style={{ background: acceptingOrders ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${acceptingOrders ? "#A7F3D0" : "#FECACA"}` }}>
                <div>
                  <p className="text-sm font-bold flex items-center gap-2" style={{ color: acceptingOrders ? "#047857" : "#B91C1C" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: acceptingOrders ? "#10B981" : "#EF4444" }} />
                    {acceptingOrders ? "Open — accepting orders" : "Closed — not accepting orders"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{acceptingOrders ? "Customers can scan and place orders now." : "Customers see a “closed” message and can't order until you reopen."}</p>
                </div>
                <Toggle checked={acceptingOrders} onChange={setAcceptingOrders} label="Accepting orders" />
              </div>
              {[["Dine-in orders", "Let guests order from their table.", dinein, setDinein], ["Parcel orders", "Allow takeaway / parcel orders.", parcel, setParcel], ["Auto-accept orders", "Skip manual acceptance and send straight to the kitchen.", autoAccept, setAutoAccept]].map(([t, d, val, set]) => (
                <div key={t} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div><p className="text-sm font-semibold" style={{ color: CHARCOAL }}>{t}</p><p className="text-xs text-gray-400">{d}</p></div>
                  <Toggle checked={val} onChange={set} label={t} />
                </div>
              ))}
              <div className="pt-4 mt-2 border-t border-gray-100">
                <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>Menu link expiry</p>
                <p className="text-xs text-gray-400 mb-2">How long a scanned menu stays usable before the customer must re-scan the QR. Protects against links shared outside the restaurant.</p>
                <select value={sessionMins} onChange={(e) => setSessionMins(Number(e.target.value))} className={field}>
                  <option value={0}>Never expires (always on)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
              <div className="pt-4 mt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>Next-visit reward</p>
                  <Toggle checked={nv.on} onChange={(v) => setNv((x) => ({ ...x, on: v }))} label="Next-visit reward" />
                </div>
                <p className="text-xs text-gray-400 mb-2">The personal coupon each customer gets after ordering, to bring them back.</p>
                {nv.on && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                      <select value={nv.type} onChange={(e) => setNv((v) => ({ ...v, type: e.target.value }))} className={field}>
                        <option value="flat">₹ flat off</option>
                        <option value="percent">% percent off</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">{nv.type === "percent" ? "Percent" : "Amount ₹"}</label>
                      <input type="number" min="1" value={nv.value} onChange={(e) => setNv((v) => ({ ...v, value: e.target.value }))} className={field} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Min order ₹</label>
                      <input type="number" min="0" value={nv.minOrder} onChange={(e) => setNv((v) => ({ ...v, minOrder: e.target.value }))} className={field} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Valid for (days)</label>
                      <input type="number" min="1" value={nv.days} onChange={(e) => setNv((v) => ({ ...v, days: e.target.value }))} className={field} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {tab === "billing" && (
            <Card className="p-5">
              <p className="text-sm font-bold mb-3" style={{ color: CHARCOAL }}>Tax & billing</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>GSTIN</Label><input defaultValue="06ABCDE1234F1Z5" className={field} /></div>
                <div><Label>Currency</Label><select className={field} defaultValue="INR"><option value="INR">₹ Indian Rupee (INR)</option><option>$ US Dollar (USD)</option></select></div>
                <div><Label>GST rate (%)</Label><input type="number" defaultValue="5" className={field} /></div>
                <div><Label>Service charge (%)</Label><input type="number" defaultValue="0" className={field} /></div>
              </div>
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center gap-3">
                <Shield size={20} style={{ color: BRAND }} />
                <div className="flex-1"><p className="text-sm font-semibold" style={{ color: CHARCOAL }}>GST-compliant invoices</p><p className="text-xs text-gray-400">Tax breakup is shown on every customer bill.</p></div>
              </div>
            </Card>
          )}

          {tab === "account" && (
            <Card className="p-5">
              <p className="text-sm font-bold mb-3" style={{ color: CHARCOAL }}>Account & security</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>New password</Label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" className={field + " pr-10"} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPw ? "Hide password" : "Show password"}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>Confirm new password</Label>
                  <div className="relative">
                    <input type={showPw2 ? "text" : "password"} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" className={field + " pr-10"} />
                    <button type="button" onClick={() => setShowPw2((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPw2 ? "Hide password" : "Show password"}>
                      {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              {pwMsg.text && <p className={`text-xs mt-2 ${pwMsg.ok ? "text-emerald-600" : "text-rose-500"}`}>{pwMsg.text}</p>}
              <button onClick={changePw} disabled={pwBusy} className="mt-3 px-4 py-2.5 rounded-xl text-sm font-bold text-white qm-btn-primary disabled:opacity-60">
                {pwBusy ? "Updating…" : "Update password"}
              </button>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold mb-2" style={{ color: CHARCOAL }}>Login method</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5"><Mail size={13} />Email + password <Check size={13} className="text-emerald-500" /></span>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancel}>Cancel</Button>
            <Button onClick={save}>{saved ? <><Check size={16} />Saved</> : "Save changes"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
