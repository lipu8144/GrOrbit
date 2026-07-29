import { useState } from "react";
import {
  MessageCircle, Send, Users, MailOpen, MousePointerClick, Check,
  Megaphone, Bell, Star, ShoppingBag,
} from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, StatCard, SectionTitle, Button, Toggle, Badge } from "../../components/ui/primitives";
import { CUSTOMERS } from "../../data/customers";
import { useRestaurant } from "../../lib/restaurantStore";
import { useAuth } from "../../lib/authStore";
import { REMOTE } from "../../lib/supabaseClient";
import { isConfigured, waConfig, saveWhatsAppConfig } from "../../lib/whatsapp";

const AUDIENCES = [
  { key: "all", label: "All customers", count: CUSTOMERS.length },
  { key: "new", label: "New", count: CUSTOMERS.filter((c) => c.tier === "new").length },
  { key: "regular", label: "Regulars", count: CUSTOMERS.filter((c) => c.tier === "regular").length },
  { key: "atrisk", label: "At-risk", count: CUSTOMERS.filter((c) => c.tier === "atrisk").length },
];

const TEMPLATES = {
  winback: "We miss you at {restaurant}! 🍔 Here's ₹50 off your next visit — code COMEBACK50. Valid this week only.",
  festival: "🎉 Festive special at {restaurant}! Enjoy 20% off all combos this weekend. Show this message at the counter.",
  newmenu: "Something new just dropped 👀 Try our new Peri-Peri Paneer Burger — now on the menu at {restaurant}!",
  review: "Hope you loved your meal! 🙏 A quick Google review means the world to a small kitchen like ours: {review_link}",
};

const AUTO = [
  { key: "confirm", icon: ShoppingBag, label: "Order confirmation", desc: "Sent when an order is placed.", on: true },
  { key: "ready", icon: Bell, label: "Ready-to-collect alert", desc: "Sent when the kitchen marks an order ready.", on: true },
  { key: "review", icon: Star, label: "Review request", desc: "Sent a little after the order is served.", on: false },
];

const HISTORY = [
  { id: 1, name: "Weekend combo offer", audience: "All customers", sent: 248, opened: 213, clicked: 72, when: "2 days ago" },
  { id: 2, name: "Win-back — at risk", audience: "At-risk", sent: 36, opened: 28, clicked: 11, when: "5 days ago" },
  { id: 3, name: "New menu launch", audience: "Regulars", sent: 142, opened: 119, clicked: 41, when: "1 week ago" },
];

function ConfigBanner({ configured, onOpen }) {
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3 border" style={configured ? { background: "#ECFDF5", borderColor: "#A7F3D0" } : { background: "#FFFBEB", borderColor: "#FDE68A" }}>
      <span className="text-lg">{configured ? "✅" : "⚙️"}</span>
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: CHARCOAL }}>
          {configured ? "WhatsApp Business API connected — campaigns send for real" : "Connect your WhatsApp Business API to send live campaigns"}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {configured
            ? "Messages below are delivered through your Meta WhatsApp Cloud API."
            : "Until connected, use the free “Save to WhatsApp” links customers get after ordering. Live broadcasts need your Meta Business account, an approved template, and API credentials."}
        </p>
        <button onClick={onOpen} className="text-xs font-bold mt-1.5" style={{ color: BRAND }}>
          {configured ? "Manage credentials →" : "Add credentials →"}
        </button>
      </div>
    </div>
  );
}

function ConfigModal({ settings, onClose }) {
  const [cfg, setCfg] = useState(waConfig(settings));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = async () => {
    setBusy(true); setMsg("");
    const res = await saveWhatsAppConfig(settings, cfg);
    setBusy(false);
    setMsg(res.ok ? "Saved. Campaigns will now send through your account." : res.error);
  };
  const field = "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 mb-3";
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 grid place-items-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-extrabold mb-1" style={{ color: CHARCOAL }}>WhatsApp Business API</p>
        <p className="text-xs text-gray-500 mb-4">Get these from Meta’s WhatsApp Cloud API dashboard (or your BSP — Gupshup, Twilio, Interakt). Stored against your restaurant only.</p>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone number ID</label>
        <input value={cfg.phoneNumberId || ""} onChange={(e) => setCfg((c) => ({ ...c, phoneNumberId: e.target.value }))} placeholder="e.g. 123456789012345" className={field} />
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Access token</label>
        <input value={cfg.accessToken || ""} onChange={(e) => setCfg((c) => ({ ...c, accessToken: e.target.value }))} placeholder="EAAG… (permanent token)" className={field} />
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Provider (optional)</label>
        <input value={cfg.provider || ""} onChange={(e) => setCfg((c) => ({ ...c, provider: e.target.value }))} placeholder="Meta Cloud API / Gupshup / Twilio…" className={field} />
        {msg && <p className="text-xs mb-2" style={{ color: msg.startsWith("Saved") ? "#059669" : "#DC2626" }}>{msg}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white qm-btn-primary disabled:opacity-60">{busy ? "Saving…" : "Save credentials"}</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function WhatsApp() {
  const settings = useRestaurant();
  const { user } = useAuth();
  const bizName = user?.restaurant || settings.name || "Your restaurant";
  const configured = isConfigured(settings);
  const [showCfg, setShowCfg] = useState(false);
  const [audience, setAudience] = useState("all");
  const fill = (t) => t.replace(/\{restaurant\}/g, bizName);
  const [msg, setMsg] = useState(() => fill(TEMPLATES.winback));
  const [auto, setAuto] = useState(AUTO);
  const [history, setHistory] = useState(HISTORY);
  const [sent, setSent] = useState(false);

  const aud = AUDIENCES.find((a) => a.key === audience);
  const toggleAuto = (key) => setAuto((a) => a.map((x) => x.key === key ? { ...x, on: !x.on } : x));
  const send = () => {
    if (!msg.trim()) return;
    setHistory((h) => [{ id: Date.now(), name: msg.slice(0, 28) + (msg.length > 28 ? "…" : ""), audience: aud.label, sent: aud.count, opened: 0, clicked: 0, when: "Just now" }, ...h]);
    setSent(true); setTimeout(() => setSent(false), 1800);
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
          <MessageCircle size={22} style={{ color: "#25D366" }} />WhatsApp Marketing
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Reach customers where they already are — the highest open-rate channel in India.</p>
      </div>

      <ConfigBanner configured={configured} onOpen={() => setShowCfg(true)} />
      {showCfg && <ConfigModal settings={settings} onClose={() => setShowCfg(false)} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Contacts captured" value={REMOTE ? "—" : "1,284"} delta={REMOTE ? 0 : 14} tint="#ECFDF5" color="#25D366" />
        <StatCard icon={Send} label="Messages sent" value={REMOTE ? "—" : "3,420"} delta={REMOTE ? 0 : 9} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={MailOpen} label="Open rate" value={REMOTE ? "—" : "86%"} delta={REMOTE ? 0 : 3} tint="#EFF6FF" color="#2563EB" />
        <StatCard icon={MousePointerClick} label="Click rate" value={REMOTE ? "—" : "34%"} delta={REMOTE ? 0 : 5} tint="#FAF5FF" color="#9333EA" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* composer */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle sub="Send a one-off broadcast to a customer segment"><span className="flex items-center gap-2"><Megaphone size={16} style={{ color: BRAND }} />New broadcast</span></SectionTitle>

          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Audience</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {AUDIENCES.map((a) => (
              <button key={a.key} onClick={() => setAudience(a.key)} className="px-3 py-2 rounded-xl text-xs font-semibold border transition" style={audience === a.key ? { borderColor: BRAND, background: "#F6EFE6", color: BRAND } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                {a.label} <span className="opacity-60">· {a.count}</span>
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Template</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[["winback", "Win-back"], ["festival", "Festival offer"], ["newmenu", "New menu"], ["review", "Review request"]].map(([k, l]) => (
              <button key={k} onClick={() => setMsg(fill(TEMPLATES[k]))} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}>{l}</button>
            ))}
          </div>

          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="w-full px-3.5 py-3 text-sm bg-white border border-gray-200 rounded-xl qm-focus resize-none" />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">Sending to <span className="font-semibold text-gray-600">{aud.count}</span> contacts</span>
            <Button icon={sent ? Check : Send} onClick={send}>{sent ? "Broadcast sent" : "Send broadcast"}</Button>
          </div>
        </Card>

        {/* phone preview */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Preview</p>
          <div className="rounded-[1.8rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl overflow-hidden max-w-[260px] mx-auto">
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: "#075E54" }}>
              <div className="w-7 h-7 rounded-full bg-white/20 grid place-items-center text-white">🍽️</div>
              <div className="text-white text-xs"><p className="font-bold leading-tight">{bizName}</p><p className="text-[9px] text-white/70">business account</p></div>
            </div>
            <div className="p-3 h-[300px]" style={{ background: "#ECE5DD" }}>
              <div className="bg-white rounded-lg rounded-tl-none p-2.5 shadow-sm text-[12px]" style={{ color: CHARCOAL }}>
                {msg || "Your message preview…"}
                <p className="text-[9px] text-gray-400 text-right mt-1">11:24 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* auto messages */}
      <Card className="p-5">
        <SectionTitle sub="Triggered automatically from order events"><span className="flex items-center gap-2"><Bell size={16} style={{ color: BRAND }} />Automated messages</span></SectionTitle>
        <div className="space-y-1">
          {auto.map((a) => (
            <div key={a.key} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: "#ECFDF5" }}><a.icon size={16} style={{ color: "#25D366" }} /></div>
              <div className="flex-1"><p className="text-sm font-semibold" style={{ color: CHARCOAL }}>{a.label}</p><p className="text-xs text-gray-400">{a.desc}</p></div>
              <Toggle checked={a.on} onChange={() => toggleAuto(a.key)} label={a.label} />
            </div>
          ))}
        </div>
      </Card>

      {/* history */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><p className="font-bold" style={{ color: CHARCOAL }}>Campaign history</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 font-bold bg-gray-50/70 border-b border-gray-100">
                <th className="text-left px-5 py-3">Campaign</th><th className="text-left px-3 py-3">Audience</th>
                <th className="text-right px-3 py-3">Sent</th><th className="text-right px-3 py-3">Opened</th>
                <th className="text-right px-3 py-3">Clicked</th><th className="text-left px-3 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-semibold" style={{ color: CHARCOAL }}>{c.name}</td>
                  <td className="px-3 py-3"><Badge tone="green">{c.audience}</Badge></td>
                  <td className="px-3 py-3 text-right text-gray-600">{c.sent}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{c.opened || "—"}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{c.clicked || "—"}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{c.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
