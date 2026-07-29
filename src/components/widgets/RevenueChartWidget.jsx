import { useState } from "react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card } from "../ui/primitives";
import { GroupedBars } from "../ui/charts";
import { useAnalyticsOrders } from "../../lib/analyticsStore";
import { REMOTE } from "../../lib/supabaseClient";

const DATA = {
  today: [
    { l: "9a", a: 4, b: 3 }, { l: "11a", a: 9, b: 6 }, { l: "1p", a: 18, b: 12 },
    { l: "3p", a: 11, b: 8 }, { l: "5p", a: 14, b: 10 }, { l: "7p", a: 22, b: 15 }, { l: "9p", a: 17, b: 12 },
  ],
  "7d": [
    { l: "Mon", a: 28, b: 18 }, { l: "Tue", a: 35, b: 24 }, { l: "Wed", a: 31, b: 21 },
    { l: "Thu", a: 44, b: 30 }, { l: "Fri", a: 52, b: 38 }, { l: "Sat", a: 61, b: 44 }, { l: "Sun", a: 48, b: 33 },
  ],
  "30d": [
    { l: "W1", a: 210, b: 150 }, { l: "W2", a: 248, b: 176 }, { l: "W3", a: 286, b: 198 }, { l: "W4", a: 322, b: 232 },
  ],
  custom: [
    { l: "Jun 1", a: 30, b: 20 }, { l: "Jun 8", a: 42, b: 28 }, { l: "Jun 15", a: 38, b: 26 }, { l: "Jun 22", a: 55, b: 40 },
  ],
};

// Build the grouped-bars shape from real orders: a = revenue (₹00s), b = orders.
function liveData(raw, range) {
  const DAY = 86400000, now = Date.now();
  const bucket = (defs) => defs.map(({ l, from, to }) => {
    const rows = raw.filter((o) => o.placedAt >= from && o.placedAt < to);
    return { l, a: Math.round(rows.reduce((s, o) => s + o.total, 0) / 100), b: rows.length };
  });
  if (range === "today") {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const m = midnight.getTime();
    return bucket([["9a", 9], ["11a", 11], ["1p", 13], ["3p", 15], ["5p", 17], ["7p", 19], ["9p", 21]]
      .map(([l, h]) => ({ l, from: m + h * 3600000, to: m + (h + 2) * 3600000 })));
  }
  if (range === "7d") {
    return bucket([...Array(7)].map((_, i) => {
      const d = new Date(now - (6 - i) * DAY);
      return { l: d.toLocaleDateString("en-IN", { weekday: "short" }), from: new Date(d).setHours(0, 0, 0, 0), to: new Date(d).setHours(24, 0, 0, 0) };
    }));
  }
  // 30d & custom: four weekly buckets
  return bucket([...Array(4)].map((_, i) => ({ l: `W${i + 1}`, from: now - (4 - i) * 7 * DAY, to: now - (3 - i) * 7 * DAY })));
}

export default function RevenueChartWidget() {
  const [range, setRange] = useState("7d");
  const raw = useAnalyticsOrders();   // null in demo mode
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="font-bold" style={{ color: CHARCOAL }}>Revenue & orders</h2>
          <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />Revenue (₹k)</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-gray-800" />Orders</span>
          </div>
        </div>
        <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5">
          {[["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["custom", "Custom"]].map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition"
              style={range === k ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}>{l}</button>
          ))}
        </div>
      </div>
      <GroupedBars data={raw && raw.length ? liveData(raw, range) : (REMOTE ? [] : DATA[range])} colors={[BRAND, "#1F2937"]} keys={["a", "b"]} w={640} h={210} />
    </Card>
  );
}
