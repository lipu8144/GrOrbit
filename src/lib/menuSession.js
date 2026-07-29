// Menu-view session: after a scan the menu is usable for a limited window,
// then the customer must re-scan the QR. This makes a link that leaked
// outside the restaurant go stale on its own, without any location checks.
//
// A real QR scan renews the session because the printed QR URL carries ?src=
// (or an explicit ?scan). Opening a stale bookmarked link after expiry shows
// the re-scan screen. Placing an order also refreshes the clock (an active
// customer is never kicked out mid-meal).
const KEY = "qm_menu_session_v1";     // { rid, startedAt }

export function startSession(rid) {
  try { localStorage.setItem(KEY, JSON.stringify({ rid, startedAt: Date.now() })); } catch {}
}
export function touchSession(rid) {   // extend on activity (e.g. placing an order)
  startSession(rid);
}
export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
}
// minutes = configured window (0/undefined disables the feature)
export function sessionExpired(rid, minutes) {
  if (!minutes || minutes <= 0) return false;
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s || s.rid !== rid) return true;          // no session for this restaurant
    return Date.now() - s.startedAt > minutes * 60 * 1000;
  } catch { return true; }
}
