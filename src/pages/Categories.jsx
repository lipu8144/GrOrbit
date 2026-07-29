import { useState } from "react";
import { FolderTree, Plus, Edit2, Trash2 } from "lucide-react";
import { BRAND, CHARCOAL } from "../lib/theme";
import { Card, StatCard, Button, Toggle, EmptyState } from "../components/ui/primitives";
import { useMenuCategories, addCategory, renameCategory, toggleCategory, deleteCategory, moveCategory } from "../lib/menuStore";

const EMOJIS = ["🍔", "🍕", "☕", "🍰", "🥤", "🍱", "🌮", "🍜", "🥗", "🍦", "🍗", "🧁"];

export default function Categories() {
  const cats = useMenuCategories();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const rename = (id, name) => { if (name.trim()) renameCategory(id, name.trim()); setEditing(null); };
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍔");

  const toggle = (id) => toggleCategory(id);
  const del = (id) => deleteCategory(id);
  const move = (id, dir) => moveCategory(id, dir);
  const add = () => {
    if (!name.trim()) return;
    addCategory({ name: name.trim(), emoji });
    setName(""); setEmoji("🍔"); setAdding(false);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: CHARCOAL }}>
            <FolderTree size={22} style={{ color: BRAND }} />Categories
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize your menu. Drag to reorder how customers see them.</p>
        </div>
        <Button icon={Plus} onClick={() => setAdding((a) => !a)}>Add category</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={FolderTree} label="Total categories" value={cats.length} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={FolderTree} label="Active" value={cats.filter((c) => c.active).length} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={FolderTree} label="Total items" value={cats.reduce((s, c) => s + c.items, 0)} tint="#EFF6FF" color="#2563EB" />
      </div>

      {adding && (
        <Card className="p-4">
          <p className="text-sm font-bold mb-3" style={{ color: CHARCOAL }}>New category</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)} className="w-9 h-9 rounded-lg text-lg grid place-items-center border transition" style={emoji === e ? { borderColor: BRAND, background: "#F6EFE6" } : { borderColor: "#E5E7EB" }}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wraps" className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" />
            </div>
            <Button onClick={add}>Save</Button>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="p-3">
        {cats.length === 0 ? (
          <EmptyState icon={FolderTree} title="Create your first category" body="Categories group your dishes so customers can browse easily." action={<Button icon={Plus} size="sm" onClick={() => setAdding(true)}>Add category</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {cats.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-3 p-2.5">
                <div className="flex flex-col text-gray-300">
                  <button onClick={() => move(c.id, -1)} disabled={idx === 0} className="hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▲</button>
                  <button onClick={() => move(c.id, 1)} disabled={idx === cats.length - 1} className="hover:text-gray-500 disabled:opacity-30 text-xs leading-none">▼</button>
                </div>
                <div className="w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0" style={{ background: c.color }}>{c.emoji}</div>
                <div className="flex-1 min-w-0">
                  {editing === c.id ? (
                    <input autoFocus defaultValue={c.name} onBlur={(e) => rename(c.id, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(c.id, e.target.value); }} className="text-sm font-bold px-2 py-1 border border-gray-200 rounded-lg qm-focus w-full max-w-[200px]" style={{ color: CHARCOAL }} />
                  ) : (
                    <p className="text-sm font-bold" style={{ color: CHARCOAL }}>{c.name}</p>
                  )}
                  <p className="text-xs text-gray-400">{c.items} item{c.items !== 1 ? "s" : ""}</p>
                </div>
                <Toggle checked={c.active} onChange={() => toggle(c.id)} label="Active" />
                <button onClick={() => setEditing(editing === c.id ? null : c.id)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><Edit2 size={15} /></button>
                <button onClick={() => del(c.id)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
