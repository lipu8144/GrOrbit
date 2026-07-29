// WhatsApp integration-ready layer.
//
// HONEST DESIGN NOTE: sending WhatsApp messages programmatically requires the
// restaurant's OWN Meta WhatsApp Business API credentials (phone number ID +
// access token) and Meta-APPROVED message templates. No code can bypass that —
// it is Meta's requirement, not a technical limit. This module implements the
// real WhatsApp Cloud API call, so the moment valid credentials are saved in
// Settings, campaigns actually send. Until then, isConfigured() returns false
// and the UI falls back to the free wa.me self-send flow already in the app.
import { sb, REMOTE, rid } from "./supabaseClient";

// Credentials live in restaurant settings.growth.whatsappApi = {
//   phoneNumberId, accessToken, provider }
export function waConfig(settings) {
  return settings?.growth?.whatsappApi || {};
}
export function isConfigured(settings) {
  const c = waConfig(settings);
  return !!(c.phoneNumberId && c.accessToken);
}

// Send one template message via the WhatsApp Cloud API. Real call — works
// as soon as real credentials exist. Returns {ok} or {ok:false,error}.
export async function sendWhatsAppTemplate({ settings, toPhone, templateName, languageCode = "en", components = [] }) {
  const c = waConfig(settings);
  if (!c.phoneNumberId || !c.accessToken) {
    return { ok: false, error: "WhatsApp API not configured — add credentials in Settings." };
  }
  const to = (toPhone || "").replace(/\D/g, "");
  if (to.length < 10) return { ok: false, error: "Invalid recipient number." };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${c.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: languageCode }, components },
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Free fallback that always works: opens WhatsApp with a prewritten message,
// sent from the customer's / owner's own app. No API, no cost, no approval.
export function waFallbackLink(toPhone, text) {
  const num = (toPhone || "").replace(/\D/g, "");
  const msg = encodeURIComponent(text || "");
  return num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

// Persist API credentials into restaurant settings (owner action).
export async function saveWhatsAppConfig(settings, cfg) {
  const next = {
    ...settings,
    growth: { ...settings.growth, whatsappApi: { ...waConfig(settings), ...cfg } },
  };
  if (REMOTE) {
    const { error } = await sb.from("restaurants").update({ settings: next }).eq("id", rid());
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, settings: next };
}
