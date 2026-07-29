// Group identity for multi-order customers.
// A customer's "group tag" is derived from their PHONE — an animal emoji +
// the last 4 digits (e.g. "🦊 8842"). Because it comes from the real phone
// number, a customer can't fake it by typing a different name, and every
// order from the same phone gets the same tag automatically. Orders with no
// phone get no group tag (they're standalone).

const ANIMALS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐸", "🦉", "🐧", "🦈", "🐢", "🦋", "🐝", "🦜", "🦓", "🦒", "🐬"];

// Stable last-4 digits of the phone (identity anchor).
export function phoneLast4(phone) {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
}

// Deterministic animal from the full phone digits, so the SAME phone always
// gets the SAME animal (across sessions, devices, and the kitchen board).
export function groupTag(phone) {
  const last4 = phoneLast4(phone);
  if (!last4) return null;
  // hash the LAST 4 only, so "+91 98765 48842" and "9876548842" match
  let h = 0;
  for (let i = 0; i < last4.length; i++) h = (h * 31 + last4.charCodeAt(i)) >>> 0;
  const animal = ANIMALS[h % ANIMALS.length];
  return { animal, code: last4, label: `${animal} ${last4}` };
}

// Soft background tint per animal, for visually clustering same-customer cards.
const TINTS = ["#FEF3E7", "#EAF6EF", "#FDECEC", "#EAF0FB", "#F6EEFB", "#FEF9E7", "#EAF7F9", "#F0F4E8"];
export function groupTint(phone) {
  const last4 = phoneLast4(phone);
  if (!last4) return null;
  let h = 0;
  for (let i = 0; i < last4.length; i++) h = (h * 31 + last4.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
