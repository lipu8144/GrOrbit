// Shared formatting helpers.
export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
export const orderTotal = (o) => o.items.reduce((s, i) => s + i.price * i.qty, 0);
export const fmtClock = (ms) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
export const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
};
