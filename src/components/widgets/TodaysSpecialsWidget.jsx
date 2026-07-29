import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Plus, X, GripVertical, ArrowUpRight } from "lucide-react";
import { BRAND, CHARCOAL } from "../../lib/theme";
import { Card, SectionTitle, Button } from "../ui/primitives";
import { useMenuItems } from "../../lib/menuStore";
import { REMOTE } from "../../lib/supabaseClient";
import { inr } from "../../lib/format";

// Demo-only sample data (used when running the local demo build).
const INITIAL = [
  { id: 1, name: "Paneer Tikka Burger", price: 189, emoji: "🍔" },
  { id: 2, name: "Mango Smoothie", price: 139, emoji: "🥤" },
];
const CANDIDATES = [
  { id: 3, name: "Cold Brew", price: 159, emoji: "☕" },
  { id: 4, name: "Chocolate Lava Cake", price: 179, emoji: "🍰" },
  { id: 5, name: "Margherita Pizza", price: 279, emoji: "🍕" },
];

// LIVE: read-only summary of the items the owner has actually marked as
// specials (edited on the Menu → Today's Specials page).
function LiveSpecials() {
  const items = useMenuItems();
  const specials = (items || []).filter((i) => i.special);
  return (
    <Card className="p-5">
      <SectionTitle
        sub="Featured on the customer menu"
        action={<Link to="/app/menu/specials" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}>Manage <ArrowUpRight size={13} /></Link>}
      >
        <span className="flex items-center gap-2"><Sparkles size={16} style={{ color: BRAND }} />Today's specials</span>
      </SectionTitle>
      <div className="space-y-2">
        {specials.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No specials set — mark items as specials to feature them.</p>
        ) : specials.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/50 p-2.5">
            <span className="text-xl">{s.type === "veg" ? "🟢" : s.type === "nonveg" ? "🔴" : "🍽️"}</span>
            <span className="text-sm font-bold flex-1 truncate" style={{ color: CHARCOAL }}>{s.name}</span>
            <span className="text-xs font-semibold" style={{ color: BRAND }}>{inr(s.price)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// DEMO: the original interactive sample widget.
function DemoSpecials() {
  const [specials, setSpecials] = useState(INITIAL);
  const [adding, setAdding] = useState(false);
  const remove = (id) => setSpecials((s) => s.filter((x) => x.id !== id));
  const add = (item) => { setSpecials((s) => [...s, item]); setAdding(false); };
  const available = CANDIDATES.filter((c) => !specials.find((s) => s.id === c.id));

  return (
    <Card className="p-5">
      <SectionTitle
        sub="Featured on the customer menu"
        action={<Button size="sm" variant="outline" icon={Plus} onClick={() => setAdding((a) => !a)}>Add</Button>}
      >
        <span className="flex items-center gap-2"><Sparkles size={16} style={{ color: BRAND }} />Today's specials</span>
      </SectionTitle>

      {adding && (
        <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-2 space-y-1">
          {available.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">All candidates added.</p>}
          {available.map((c) => (
            <button key={c.id} onClick={() => add(c)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-left">
              <span className="text-lg">{c.emoji}</span>
              <span className="text-sm font-medium flex-1" style={{ color: CHARCOAL }}>{c.name}</span>
              <span className="text-xs text-gray-400">₹{c.price}</span>
              <Plus size={14} style={{ color: BRAND }} />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {specials.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/50 p-2.5">
            <GripVertical size={15} className="text-gray-300 cursor-grab" />
            <span className="text-xl">{s.emoji}</span>
            <span className="text-sm font-bold flex-1" style={{ color: CHARCOAL }}>{s.name}</span>
            <span className="text-xs font-semibold" style={{ color: BRAND }}>₹{s.price}</span>
            <button onClick={() => remove(s.id)} className="w-6 h-6 grid place-items-center rounded-lg text-gray-400 hover:bg-white hover:text-rose-500 transition">
              <X size={14} />
            </button>
          </div>
        ))}
        {specials.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No specials set for today.</p>}
      </div>
    </Card>
  );
}

export default function TodaysSpecialsWidget() {
  return REMOTE ? <LiveSpecials /> : <DemoSpecials />;
}
