import { useState } from "react";
import {
  Store, Clock, Phone, Mail, MapPin, Plus, Trash2, Check, ExternalLink,
  Sparkles, Gift, Instagram, Facebook, MessageCircle, Star, Tag,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, SectionTitle, Button, Toggle } from "../components/ui/primitives";
import { useRestaurant, updateRestaurant } from "../lib/restaurantStore";
import { useMenuItems } from "../lib/menuStore";
import { useAuth } from "../lib/authStore";

const field = "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus transition";
const Label = ({ children }) => <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{children}</label>;

export default function Storefront() {
  const { user } = useAuth();
  const saved = useRestaurant();
  const [s, setS] = useState(saved);
  const [flash, setFlash] = useState(false);

  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  const setContact = (patch) => setS((p) => ({ ...p, contact: { ...p.contact, ...patch } }));
  const setGrowth = (key, patch) => setS((p) => ({ ...p, growth: { ...p.growth, [key]: { ...p.growth[key], ...patch } } }));
  const save = () => { updateRestaurant(s); setFlash(true); setTimeout(() => setFlash(false), 1600); };

  // offers
  const addOffer = () => set({ offers: [...s.offers, { id: Date.now(), emoji: "🎉", title: "New offer", text: "Describe your offer", active: true }] });
  const setOffer = (id, patch) => set({ offers: s.offers.map((o) => o.id === id ? { ...o, ...patch } : o) });
  const delOffer = (id) => set({ offers: s.offers.filter((o) => o.id !== id) });

  // specials
  const toggleSpecial = (id) => set({ specials: s.specials.includes(id) ? s.specials.filter((x) => x !== id) : [...s.specials, id] });
  const activeItems = useMenuItems().filter((m) => m.status === "active");

  const EMOJIS = ["🎉", "🍕", "🍔", "☕", "🍰", "🥤", "🔥", "⭐", "💸", "🎁"];

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Store size={22} style={{ color: BRAND }} />Storefront
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Everything customers see when they scan your QR — managed here.</p>
        </div>
        <a href={user?.slug ? `/r/${user.slug}` : "#"} target="_blank" rel="noreferrer" className="text-sm font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50" style={{ color: CHARCOAL }}><ExternalLink size={15} />Preview</a>
      </div>

      {/* offers */}
      <Card className="p-5">
        <SectionTitle sub="Shown as banners at the top of the menu" action={<Button size="sm" variant="outline" icon={Plus} onClick={addOffer}>Add offer</Button>}>
          <span className="flex items-center gap-2"><Tag size={16} style={{ color: BRAND }} />Offers & promo posts</span>
        </SectionTitle>
        <div className="space-y-3">
          {s.offers.length === 0 && <p className="text-sm text-gray-400">No offers yet. Add one to feature it at the top of the menu.</p>}
          {s.offers.map((o) => (
            <div key={o.id} className="flex items-start gap-2.5 rounded-xl border border-gray-100 p-3">
              <select value={o.emoji} onChange={(e) => setOffer(o.id, { emoji: e.target.value })} className="text-xl bg-transparent">
                {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <div className="flex-1 space-y-2">
                <input value={o.title} onChange={(e) => setOffer(o.id, { title: e.target.value })} className={field} placeholder="Offer title" />
                <input value={o.text} onChange={(e) => setOffer(o.id, { text: e.target.value })} className={field} placeholder="Offer details" />
              </div>
              <div className="flex flex-col items-center gap-2 pt-1">
                <Toggle checked={o.active} onChange={(v) => setOffer(o.id, { active: v })} label="Active" />
                <button onClick={() => delOffer(o.id)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* specials */}
      <Card className="p-5">
        <SectionTitle sub="Featured at the top of the customer menu">
          <span className="flex items-center gap-2"><Sparkles size={16} style={{ color: BRAND }} />Today's specials</span>
        </SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {activeItems.map((m) => {
            const on = s.specials.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggleSpecial(m.id)} className="flex items-center gap-2.5 p-2 rounded-xl border text-left transition" style={on ? { borderColor: BRAND, background: "#FFF7F3" } : { borderColor: "#E5E7EB" }}>
                <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">{m.image && <img src={m.image} alt="" className="w-full h-full object-cover" />}</div>
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: CHARCOAL }}>{m.name}</span>
                {on && <Check size={16} style={{ color: BRAND }} />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* prep time */}
      <Card className="p-5">
        <SectionTitle><span className="flex items-center gap-2"><Clock size={16} style={{ color: BRAND }} />Preparation time</span></SectionTitle>
        <div className="flex items-center gap-3">
          <input type="number" min="1" value={s.prepTimeMins} onChange={(e) => set({ prepTimeMins: +e.target.value || 0 })} className="w-24 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl qm-focus" />
          <span className="text-sm text-gray-500">minutes — shown to customers as “~{s.prepTimeMins} min”.</span>
        </div>
      </Card>

      {/* about + contact */}
      <Card className="p-5">
        <SectionTitle>About & contact</SectionTitle>
        <Label>About us</Label>
        <textarea rows={3} value={s.about} onChange={(e) => set({ about: e.target.value })} className={field + " resize-none mb-4"} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Phone</Label><div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={s.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} className={field + " pl-9"} /></div></div>
          <div><Label>Email</Label><div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={s.contact.email} onChange={(e) => setContact({ email: e.target.value })} className={field + " pl-9"} /></div></div>
          <div className="sm:col-span-2"><Label>Address</Label><div className="relative"><MapPin size={15} className="absolute left-3 top-3 text-gray-400" /><textarea rows={2} value={s.contact.address} onChange={(e) => setContact({ address: e.target.value })} className={field + " pl-9 resize-none"} /></div></div>
          <div className="sm:col-span-2"><Label>Opening hours</Label><input value={s.contact.hours} onChange={(e) => setContact({ hours: e.target.value })} className={field} /></div>
        </div>
      </Card>

      {/* post-order growth */}
      <Card className="p-5">
        <SectionTitle sub="Shown after the meal is served, on the review screen">
          <span className="flex items-center gap-2"><Star size={16} style={{ color: BRAND }} />After-order prompts</span>
        </SectionTitle>
        <div className="space-y-3">
          {[
            { key: "google", icon: Star, color: "#F59E0B", label: "Google review link", field: "url", ph: "https://g.page/..." },
            { key: "instagram", icon: Instagram, color: "#E1306C", label: "Instagram URL", field: "url", ph: "https://instagram.com/..." },
            { key: "facebook", icon: Facebook, color: "#1877F2", label: "Facebook URL", field: "url", ph: "https://facebook.com/..." },
            { key: "whatsapp", icon: MessageCircle, color: "#25D366", label: "WhatsApp number", field: "number", ph: "+91…" },
          ].map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: row.color + "1A" }}><row.icon size={16} style={{ color: row.color }} /></div>
              <div className="flex-1"><Label>{row.label}</Label><input value={s.growth[row.key][row.field]} onChange={(e) => setGrowth(row.key, { [row.field]: e.target.value })} className={field} placeholder={row.ph} /></div>
              <div className="pt-5"><Toggle checked={s.growth[row.key].on} onChange={(v) => setGrowth(row.key, { on: v })} label={row.label} /></div>
            </div>
          ))}
          {/* coupon */}
          <div className="rounded-xl border border-gray-100 p-3.5 bg-gray-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: CHARCOAL }}><Gift size={15} style={{ color: "#8B5CF6" }} />Next-visit coupon</span>
              <Toggle checked={s.growth.coupon.on} onChange={(v) => setGrowth("coupon", { on: v })} label="Coupon" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Code</Label><input value={s.growth.coupon.code} onChange={(e) => setGrowth("coupon", { code: e.target.value })} className={field + " font-mono"} /></div>
              <div><Label>Description</Label><input value={s.growth.coupon.desc} onChange={(e) => setGrowth("coupon", { desc: e.target.value })} className={field} /></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 sticky bottom-4">
        <Button onClick={save} className="shadow-lg">{flash ? <><Check size={16} />Saved & live</> : "Save changes"}</Button>
      </div>
    </div>
  );
}
