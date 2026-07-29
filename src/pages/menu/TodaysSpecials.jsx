import { useState } from "react";
import { Sparkles, Plus, X, Smartphone, Flame } from "lucide-react";
import { BRAND, BRAND_DARK, CHARCOAL } from "../../lib/theme";
import { Card, SectionTitle, Button, EmptyState } from "../../components/ui/primitives";
import { CAT_EMOJI, CAT_GRADIENT } from "../../data/menu";
import { useMenuItems } from "../../lib/menuStore";
import { useRestaurant, updateRestaurant } from "../../lib/restaurantStore";
import { useAuth } from "../../lib/authStore";

function Thumb({ item, className }) {
  return (
    <div style={{ background: CAT_GRADIENT[item.category] }} className={`rounded-xl grid place-items-center text-2xl shrink-0 ${className}`}>
      {CAT_EMOJI[item.category]}
    </div>
  );
}

export default function TodaysSpecials() {
  const settings = useRestaurant();
  const { user } = useAuth();
  const specials = settings.specials || [];
  const setSpecials = (fn) => updateRestaurant({ specials: typeof fn === "function" ? fn(specials) : fn });
  const [picker, setPicker] = useState(false);

  const MENU_ITEMS = useMenuItems();
  const items = MENU_ITEMS.filter((m) => specials.includes(m.id));
  const candidates = MENU_ITEMS.filter((m) => !specials.includes(m.id) && m.status === "active");
  const remove = (id) => setSpecials((s) => s.filter((x) => x !== id));
  const add = (id) => { setSpecials((s) => [...s, id]); setPicker(false); };
  const move = (id, dir) => setSpecials((s) => {
    const i = s.indexOf(id), j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const c = [...s];[c[i], c[j]] = [c[j], c[i]]; return c;
  });

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <Sparkles size={22} style={{ color: BRAND }} />Today's Specials
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Feature dishes at the top of your customer menu.</p>
        </div>
        <Button icon={Plus} onClick={() => setPicker((p) => !p)}>Add special</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* management list */}
        <div className="lg:col-span-2 space-y-4">
          {picker && (
            <Card className="p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-2">Choose an item</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {candidates.map((c) => (
                  <button key={c.id} onClick={() => add(c.id)} className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-left transition">
                    <Thumb item={c} className="w-10 h-10 text-lg" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{c.name}</p><p className="text-xs text-gray-400">₹{c.price}</p></div>
                    <Plus size={15} style={{ color: BRAND }} />
                  </button>
                ))}
                {candidates.length === 0 && <p className="text-sm text-gray-400 col-span-2 px-1 py-3">No more active items to feature.</p>}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle action={<span className="text-xs text-gray-400">{items.length} featured</span>}>Featured today</SectionTitle>
            {items.length === 0 ? (
              <EmptyState icon={Sparkles} title="No specials yet" body="Add a dish to spotlight it on your customer menu." action={<Button icon={Plus} size="sm" onClick={() => setPicker(true)}>Add special</Button>} />
            ) : (
              <div className="space-y-2.5">
                {items.map((it, idx) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                    <div className="flex flex-col">
                      <button onClick={() => move(it.id, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▲</button>
                      <button onClick={() => move(it.id, 1)} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▼</button>
                    </div>
                    <Thumb item={it} className="w-14 h-14" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: CHARCOAL }}>{it.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{it.desc}</p>
                    </div>
                    <span className="text-sm font-extrabold" style={{ color: BRAND }}>₹{it.price}</span>
                    <button onClick={() => remove(it.id)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-white hover:text-rose-500 transition"><X size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* customer preview */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><Smartphone size={13} />Customer preview</p>
          <div className="mx-auto w-[280px] rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
            <div className="h-6 flex items-center justify-center"><div className="w-20 h-1.5 rounded-full bg-gray-700" /></div>
            <div className="bg-gray-50 h-[460px] overflow-y-auto">
              <div className="px-4 py-3 text-white flex items-center gap-2.5" style={{ background: `linear-gradient(135deg,${BRAND},${BRAND_DARK})` }}>
                <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center">🍽️</div>
                <div><p className="font-bold text-sm leading-tight">{user?.restaurant || settings.name || "Your restaurant"}</p><p className="text-[10px] text-white/80">Order online</p></div>
              </div>
              <div className="p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1"><Flame size={11} style={{ color: BRAND }} />Today's specials</p>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="bg-white rounded-xl border border-orange-100 p-2 flex items-center gap-2 shadow-sm">
                      <Thumb item={it} className="w-12 h-12 text-lg" />
                      <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate" style={{ color: CHARCOAL }}>{it.name}</p><p className="text-[11px] text-gray-500">₹{it.price}</p></div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: BRAND }}>SPECIAL</span>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No specials to show.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
