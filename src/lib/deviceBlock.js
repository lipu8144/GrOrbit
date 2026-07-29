// Soft device block using browser storage. Honest limits: clearing site data
// or incognito resets it — it's a speed bump for casual abusers, not a wall.
// Real enforcement stays server-side (phone limits + staff Accept).
const KEY = "qm_block_until_v1";

export function blockFor(hours = 24) {
  try { localStorage.setItem(KEY, String(Date.now() + hours * 3600 * 1000)); } catch {}
}
export function blockedUntil() {
  try { const t = Number(localStorage.getItem(KEY)); return t > Date.now() ? t : 0; } catch { return 0; }
}
export function isBlocked() { return blockedUntil() > 0; }
export function blockRemaining() {
  const ms = blockedUntil() - Date.now();
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3600000), m = Math.ceil((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
export function clearBlock() { try { localStorage.removeItem(KEY); } catch {} }
