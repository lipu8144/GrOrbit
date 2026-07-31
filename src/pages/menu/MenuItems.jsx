import { useState, useMemo, useRef } from "react";
import { useAuth } from "../../lib/authStore";
import { uploadImage } from "../../lib/storage";
import { reportError, reportSuccess } from "../../lib/supabaseClient";
import {
  Search, Plus, SlidersHorizontal, ChevronDown, X, Edit2, Copy,
  Trash2, EyeOff, Eye, MoreVertical, Star, Sparkles, UploadCloud,
  LayoutGrid, List, ShoppingBag, CheckCircle2, PackageX, Tags,
  Smartphone, Flame, Plus as PlusSmall,
} from "lucide-react";

import { BRAND, BRAND_DARK, CHARCOAL } from "../../lib/theme";
import { CAT_EMOJI, CAT_GRADIENT } from "../../data/menu";
import { useMenuItems, useMenuCategories, saveItem as storeSave, duplicateItem as storeDup, removeItem as storeRemove, setItemStatus } from "../../lib/menuStore";

const STATUS_META = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  hidden: { label: "Hidden", cls: "bg-gray-100 text-gray-500 border border-gray-200" },
  outofstock: { label: "Out of stock", cls: "bg-rose-50 text-rose-600 border border-rose-200" },
};

// ── Tiny building blocks ──────────────────────────────────────
function VegMark({ type, size = 16 }) {
  const c = type === "veg" ? "#16A34A" : "#B91C1C";
  return (
    <span title={type === "veg" ? "Veg" : "Non-veg"} style={{ width: size, height: size, borderColor: c }}
      className="inline-flex items-center justify-center border-[1.5px] rounded-[3px] shrink-0">
      <span style={{ background: c, width: size * 0.42, height: size * 0.42 }} className="rounded-full block" />
    </span>
  );
}

function FoodThumb({ item, className = "", rounded = "rounded-xl" }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ background: CAT_GRADIENT[item.category] }}
      className={`relative overflow-hidden grid place-items-center shrink-0 ${rounded} ${className}`}>
      {!err && item.image
        ? <img src={item.image} alt={item.name} onError={() => setErr(true)} className="w-full h-full object-cover" />
        : <span className="text-2xl select-none">{CAT_EMOJI[item.category]}</span>}
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.active;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: checked ? BRAND : "#E5E7EB" }} aria-pressed={checked} aria-label={label}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

// ── Summary card ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, tint, iconColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: tint }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none" style={{ color: CHARCOAL }}>{value}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Row action menu ───────────────────────────────────────────
function RowMenu({ item, onEdit, onDuplicate, onDelete, onHide }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const actions = [
    { label: "Edit", icon: Edit2, fn: () => onEdit(item) },
    { label: "Duplicate", icon: Copy, fn: () => onDuplicate(item) },
    { label: item.status === "hidden" ? "Show on menu" : "Hide from menu", icon: item.status === "hidden" ? Eye : EyeOff, fn: () => onHide(item) },
    { label: "Delete", icon: Trash2, fn: () => onDelete(item), danger: true },
  ];
  const MENU_H = 4 * 38 + 12, MENU_W = 176;
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const openUp = r.bottom + MENU_H > window.innerHeight - 8;
      setPos({
        top: openUp ? r.top - MENU_H - 4 : r.bottom + 4,
        left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
      });
    }
    setOpen((o) => !o);
  };
  return (
    <div>
      <button ref={btnRef} onClick={toggle} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* fixed positioning escapes the table's overflow container, so the
              menu is always fully visible — even for the last / only row */}
          <div className="fixed z-40 w-44 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5" style={{ top: pos.top, left: pos.left }}>
            {actions.map(a => (
              <button key={a.label} onClick={() => { a.fn(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors ${a.danger ? "text-rose-600 hover:bg-rose-50" : "text-gray-700 hover:bg-gray-50"}`}>
                <a.icon size={15} />{a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────
const EMPTY_FORM = { name: "", desc: "", category: "Burgers", price: "", type: "veg", special: false, available: true, image: "" };

function ItemModal({ open, onClose, onSave, editing }) {
  const fileRef = useRef(null);
  const CATEGORIES = useMenuCategories().map((c) => c.name);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState("");

  // sync when opening
  const initRef = useRef(null);
  if (open && initRef.current !== (editing?.id ?? "new")) {
    initRef.current = editing?.id ?? "new";
    if (editing) {
      setForm({ name: editing.name, desc: editing.desc, category: editing.category, price: String(editing.price), type: editing.type, special: editing.special, available: editing.status !== "outofstock", image: editing.image });
      setPreview(editing.image);
    } else {
      setForm(EMPTY_FORM); setPreview("");
    }
  }
  if (!open) { if (initRef.current !== null) initRef.current = null; return null; }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // pre-validate size/type with a clear message BEFORE attempting upload
    if (!file.type.startsWith("image/")) { setUpErr("Please choose an image file (JPG, PNG, or WebP)."); reportError("That file isn't an image. Please choose a JPG, PNG, or WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setUpErr("Image must be under 5 MB."); reportError(`That image is ${(file.size / 1048576).toFixed(1)} MB — please use one under 5 MB.`); return; }
    setUpErr("");
    setPreview(URL.createObjectURL(file));   // instant local preview
    setUploading(true);
    const res = await uploadImage(file, "items");   // real, persisted URL
    setUploading(false);
    if (res.ok) { set("image", res.url); reportSuccess("Image uploaded ✓"); }
    else { setUpErr(res.error); setPreview(form.image || ""); reportError(`Image upload failed: ${res.error}`); }
  };
  const valid = form.name.trim() && form.price !== "" && Number(form.price) >= 0 && !uploading;
  const submit = () => {
    if (!valid) return;
    onSave({
      ...editing,
      name: form.name.trim(), desc: form.desc.trim(), category: form.category,
      price: Number(form.price), type: form.type, special: form.special,
      status: form.available ? (editing?.status === "hidden" ? "hidden" : "active") : "outofstock",
      image: form.image, popular: editing?.popular ?? false,
    });
  };

  const field = "w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus transition";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold" style={{ color: CHARCOAL }}>{editing ? "Edit item" : "Add new item"}</h2>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* image upload */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Food image</label>
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 grid place-items-center text-gray-400 hover:border-gray-300 transition overflow-hidden bg-gray-50 relative">
              {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                : <span className="flex flex-col items-center gap-1.5"><UploadCloud size={22} /><span className="text-xs font-medium">Click to upload</span></span>}
              {uploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="w-6 h-6 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: BRAND }} /></span>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            {upErr && <p className="text-[11px] text-rose-500 mt-1">{upErr}</p>}
            {uploading && <p className="text-[11px] text-gray-400 mt-1">Uploading image…</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Item name</label>
            <input value={form.name} maxLength={60} onChange={e => set("name", e.target.value)} placeholder="e.g. Paneer Tikka Burger" className={field} /><span className={`block text-[10px] mt-1 text-right ${(form.name||"").length >= 60 ? "text-rose-500 font-bold" : "text-gray-300"}`}>{(form.name||"").length}/60</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
            <textarea value={form.desc} maxLength={200} onChange={e => set("desc", e.target.value)} rows={2} placeholder="Short, appetizing description" className={field + " resize-none"} /><span className={`block text-[10px] mt-1 text-right ${(form.desc||"").length >= 200 ? "text-rose-500 font-bold" : "text-gray-300"}`}>{(form.desc||"").length}/200</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={field}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Price (₹)</label>
              <input type="number" min="0" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0" className={field} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Type</label>
            <div className="flex gap-2">
              {["veg", "nonveg"].map(t => (
                <button key={t} onClick={() => set("type", t)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition"
                  style={form.type === t ? { borderColor: BRAND, background: "#F6EFE6", color: CHARCOAL } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                  <VegMark type={t} /> {t === "veg" ? "Veg" : "Non-veg"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: BRAND }} />
              <span className="text-sm font-semibold" style={{ color: CHARCOAL }}>Today's Special</span>
            </div>
            <Toggle checked={form.special} onChange={v => set("special", v)} label="Today's special" />
          </div>
          <div className="flex items-center justify-between py-1 border-t border-gray-100 pt-3">
            <div>
              <span className="text-sm font-semibold block" style={{ color: CHARCOAL }}>Available</span>
              <span className="text-xs text-gray-400">Turn off to mark out of stock</span>
            </div>
            <Toggle checked={form.available} onChange={v => set("available", v)} label="Available" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3.5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={submit} disabled={!valid}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white qm-btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition">
            {editing ? "Save changes" : "Save item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter sidebar (content reused in drawer + inline) ────────
function FilterPanel({ counts, category, setCategory, status, setStatus }) {
  const CATEGORIES = useMenuCategories().map((c) => c.name);
  const Row = ({ active, onClick, children, count }) => (
    <button onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition"
      style={active ? { background: "#F6EFE6", color: CHARCOAL } : { color: "#6B7280" }}>
      <span className="flex items-center gap-2.5">{children}</span>
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
        style={active ? { background: BRAND, color: "#fff" } : { background: "#F3F4F6", color: "#9CA3AF" }}>{count}</span>
    </button>
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-3">Categories</p>
        <div className="space-y-0.5">
          <Row active={category === "All"} onClick={() => setCategory("All")} count={counts.all}><span className="w-4 text-center">∗</span>All items</Row>
          {CATEGORIES.map(c => (
            <Row key={c} active={category === c} onClick={() => setCategory(c)} count={counts.byCat[c] || 0}>
              <span className="w-4 text-center">{CAT_EMOJI[c]}</span>{c}
            </Row>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-3">Status</p>
        <div className="space-y-0.5">
          <Row active={status === "All"} onClick={() => setStatus("All")} count={counts.all}><span className="w-2 h-2 rounded-full bg-gray-300" />All</Row>
          <Row active={status === "active"} onClick={() => setStatus("active")} count={counts.byStatus.active || 0}><span className="w-2 h-2 rounded-full bg-emerald-500" />Active</Row>
          <Row active={status === "hidden"} onClick={() => setStatus("hidden")} count={counts.byStatus.hidden || 0}><span className="w-2 h-2 rounded-full bg-gray-400" />Hidden</Row>
          <Row active={status === "outofstock"} onClick={() => setStatus("outofstock")} count={counts.byStatus.outofstock || 0}><span className="w-2 h-2 rounded-full bg-rose-500" />Out of stock</Row>
        </div>
      </div>
    </div>
  );
}

// ── Customer phone preview ────────────────────────────────────
function CustomerPreview({ items, special }) {
  const { user } = useAuth();
  const CATEGORIES = useMenuCategories().map((c) => c.name);
  const [cart, setCart] = useState({});
  const [activeCat, setActiveCat] = useState("All");
  const total = Object.values(cart).reduce((a, b) => a + b, 0);
  const visible = items.filter(i => i.status === "active");
  const shown = activeCat === "All" ? visible : visible.filter(i => i.category === activeCat);
  const cats = ["All", ...CATEGORIES.filter(c => visible.some(i => i.category === c))];

  return (
    <div className="mx-auto w-[300px] rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
      <div className="h-6 bg-gray-900 flex items-center justify-center"><div className="w-20 h-1.5 rounded-full bg-gray-700" /></div>
      <div className="bg-gray-50 h-[520px] overflow-y-auto">
        {/* branding */}
        <div className="px-4 pt-4 pb-3 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center text-lg">🍽️</div>
            <div>
              <p className="font-bold text-sm leading-tight">{user?.restaurant || "Your restaurant"}</p>
              <p className="text-[11px] text-white/80">Open now</p>
            </div>
          </div>
        </div>
        {/* today's special */}
        {special && (
          <div className="mx-3 mt-3 rounded-xl overflow-hidden border border-orange-100 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 p-2.5">
              <FoodThumb item={special} className="w-14 h-14" />
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white mb-1" style={{ background: BRAND }}>
                  <Flame size={9} /> TODAY'S SPECIAL
                </span>
                <p className="text-xs font-bold truncate" style={{ color: CHARCOAL }}>{special.name}</p>
                <p className="text-[11px] text-gray-500">₹{special.price}</p>
              </div>
            </div>
          </div>
        )}
        {/* category chips */}
        <div className="flex gap-2 px-3 py-3 overflow-x-auto">
          {cats.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition"
              style={activeCat === c ? { background: CHARCOAL, color: "#fff" } : { background: "#fff", color: "#6B7280", border: "1px solid #E5E7EB" }}>
              {c}
            </button>
          ))}
        </div>
        {/* food cards */}
        <div className="px-3 pb-4 space-y-2.5">
          {shown.map(i => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-100 p-2.5 flex items-center gap-2.5 shadow-sm">
              <FoodThumb item={i} className="w-16 h-16" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><VegMark type={i.type} size={12} /><p className="text-xs font-bold truncate" style={{ color: CHARCOAL }}>{i.name}</p></div>
                <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{i.desc}</p>
                <p className="text-xs font-bold mt-1" style={{ color: CHARCOAL }}>₹{i.price}</p>
              </div>
              <button onClick={() => setCart(c => ({ ...c, [i.id]: (c[i.id] || 0) + 1 }))}
                className="w-7 h-7 grid place-items-center rounded-lg text-white shrink-0 active:scale-90 transition" style={{ background: BRAND }}>
                {cart[i.id] ? <span className="text-xs font-bold">{cart[i.id]}</span> : <PlusSmall size={15} />}
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* cart bar */}
      <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: CHARCOAL }}>
        <span className="text-xs font-medium flex items-center gap-1.5"><ShoppingBag size={14} />{total} item{total !== 1 ? "s" : ""}</span>
        <span className="text-sm font-bold flex items-center gap-1">View cart →</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function MenuItems() {
  const items = useMenuItems();
  const CATEGORIES = useMenuCategories().map((c) => c.name);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("popular");
  const [view, setView] = useState("list");
  const [modal, setModal] = useState({ open: false, editing: null });
  const [drawer, setDrawer] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const counts = useMemo(() => {
    const byCat = {}, byStatus = {};
    items.forEach(i => { byCat[i.category] = (byCat[i.category] || 0) + 1; byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    return { all: items.length, byCat, byStatus };
  }, [items]);

  const special = useMemo(() => items.find(i => i.special && i.status === "active") || items.find(i => i.special), [items]);

  const filtered = useMemo(() => {
    let r = items.filter(i =>
      (category === "All" || i.category === category) &&
      (status === "All" || i.status === status) &&
      (i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()))
    );
    const sorters = {
      popular: (a, b) => (b.popular - a.popular) || a.name.localeCompare(b.name),
      "price-low": (a, b) => a.price - b.price,
      "price-high": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...r].sort(sorters[sort]);
  }, [items, category, status, search, sort]);

  // actions
  const openAdd = () => setModal({ open: true, editing: null });
  const openEdit = (item) => setModal({ open: true, editing: item });
  const saveItem = (data) => { storeSave(data); setModal({ open: false, editing: null }); };
  const duplicate = (item) => storeDup(item);
  const remove = (item) => storeRemove(item.id);
  const hide = (item) => setItemStatus(item.id, item.status === "hidden" ? "active" : "hidden");
  const toggleAvail = (item, v) => setItemStatus(item.id, v ? "active" : "outofstock");

  const selectCls = "appearance-none bg-white border border-gray-200 rounded-xl pl-3.5 pr-9 py-2.5 text-sm font-medium text-gray-700 qm-focus cursor-pointer";

  return (
    <div className="min-h-screen bg-gray-50/70" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        .qm-focus:focus{outline:none;border-color:${BRAND};box-shadow:0 0 0 3px rgba(255,107,53,.22)}
        .qm-btn-primary{background:${BRAND}}
        .qm-btn-primary:hover:not(:disabled){background:${BRAND_DARK}}
        .line-clamp-1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
        *::-webkit-scrollbar{width:6px;height:6px}*::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:9px}
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>Menu Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Build and manage your digital menu — no tech skills needed.</p>
            </div>
            <button onClick={openAdd} className="qm-btn-primary text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 shrink-0 transition">
              <Plus size={17} /><span className="hidden sm:inline">Add new item</span><span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* search + filters row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu items..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus transition" />
            </div>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value)} className={selectCls}>
                <option value="All">All categories</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
                <option value="popular">Sort: Popular</option>
                <option value="name">Sort: Name A–Z</option>
                <option value="price-low">Sort: Price low → high</option>
                <option value="price-high">Sort: Price high → low</option>
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* view toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
              {[["list", List], ["grid", LayoutGrid]].map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)} className="w-9 h-9 grid place-items-center rounded-lg transition"
                  style={view === v ? { background: "#F6EFE6", color: BRAND } : { color: "#9CA3AF" }}><Icon size={16} /></button>
              ))}
            </div>
            {/* mobile filter + preview buttons */}
            <button onClick={() => setDrawer(true)} className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700">
              <SlidersHorizontal size={15} />Filters
            </button>
            <button onClick={() => setPreviewOpen(true)} className="xl:hidden flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-700">
              <Smartphone size={15} /><span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <StatCard icon={Tags} label="Total menu items" value={counts.all} tint="#F6EFE6" iconColor={BRAND} />
          <StatCard icon={CheckCircle2} label="Active items" value={counts.byStatus.active || 0} tint="#ECFDF5" iconColor="#16A34A" />
          <StatCard icon={PackageX} label="Out of stock" value={counts.byStatus.outofstock || 0} tint="#FFF1F2" iconColor="#E11D48" />
          <StatCard icon={LayoutGrid} label="Categories" value={CATEGORIES.length} tint="#EFF6FF" iconColor="#2563EB" />
        </div>

        {/* ── Today's Special banner ── */}
        {special && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-orange-100 relative"
            style={{ background: "linear-gradient(105deg,#FFF7F3 0%,#FFEEE6 60%,#FFE2D5 100%)" }}>
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <FoodThumb item={special} className="w-20 h-20 sm:w-24 sm:h-24 shadow-md" rounded="rounded-2xl" />
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: BRAND }}>
                  <Sparkles size={11} /> TODAY'S SPECIAL
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <VegMark type={special.type} />
                  <h3 className="text-lg sm:text-xl font-extrabold truncate" style={{ color: CHARCOAL }}>{special.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{special.desc}</p>
                <p className="text-base font-bold mt-1.5" style={{ color: BRAND }}>₹{special.price}</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs text-gray-400 flex items-center gap-1"><Eye size={13} /> Live on customer menu</span>
                <button onClick={() => openEdit(special)} className="text-sm font-semibold px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition" style={{ color: CHARCOAL }}>Edit feature</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 3-zone body ── */}
        <div className="flex gap-5 mt-5">
          {/* inline sidebar */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sticky top-5">
              <FilterPanel counts={counts} category={category} setCategory={setCategory} status={status} setStatus={setStatus} />
            </div>
          </aside>

          {/* main list / grid */}
          <main className="flex-1 min-w-0">
            {view === "list" ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                        <th className="text-left px-5 py-3">Item</th>
                        <th className="text-left px-3 py-3">Category</th>
                        <th className="text-left px-3 py-3">Type</th>
                        <th className="text-right px-3 py-3">Price</th>
                        <th className="text-left px-3 py-3">Status</th>
                        <th className="text-center px-3 py-3">Available</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(i => (
                        <tr key={i.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <FoodThumb item={i} className="w-12 h-12" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold truncate" style={{ color: CHARCOAL }}>{i.name}</p>
                                  {i.popular && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 shrink-0"><Star size={9} className="fill-amber-500 text-amber-500" />Popular</span>}
                                </div>
                                <p className="text-xs text-gray-400 truncate max-w-[260px]">{i.desc}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3"><span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">{CAT_EMOJI[i.category]} {i.category}</span></td>
                          <td className="px-3 py-3"><VegMark type={i.type} /></td>
                          <td className="px-3 py-3 text-right font-bold whitespace-nowrap" style={{ color: CHARCOAL }}>₹{i.price}</td>
                          <td className="px-3 py-3"><StatusBadge status={i.status} /></td>
                          <td className="px-3 py-3"><div className="flex justify-center"><Toggle checked={i.status !== "outofstock"} onChange={v => toggleAvail(i, v)} label="Available" /></div></td>
                          <td className="px-3 py-3"><div className="flex justify-end"><RowMenu item={i} onEdit={openEdit} onDuplicate={duplicate} onDelete={remove} onHide={hide} /></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && <EmptyState onAdd={openAdd} />}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3.5">
                {filtered.map(i => (
                  <div key={i.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex gap-3.5 hover:shadow-md transition-shadow">
                    <FoodThumb item={i} className="w-20 h-20" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0"><VegMark type={i.type} size={13} /><p className="font-bold truncate" style={{ color: CHARCOAL }}>{i.name}</p></div>
                        <RowMenu item={i} onEdit={openEdit} onDuplicate={duplicate} onDelete={remove} onHide={hide} />
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{i.desc}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {i.popular && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200"><Star size={9} className="fill-amber-500 text-amber-500" />Popular</span>}
                        <StatusBadge status={i.status} />
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-extrabold" style={{ color: CHARCOAL }}>₹{i.price}</span>
                        <Toggle checked={i.status !== "outofstock"} onChange={v => toggleAvail(i, v)} label="Available" />
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <div className="sm:col-span-2 2xl:col-span-3"><div className="bg-white rounded-2xl border border-gray-100"><EmptyState onAdd={openAdd} /></div></div>}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3 px-1">Showing {filtered.length} of {items.length} items</p>
          </main>

          {/* inline preview */}
          <aside className="hidden xl:block shrink-0">
            <div className="sticky top-5">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Smartphone size={15} className="text-gray-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer menu preview</p>
              </div>
              <CustomerPreview items={items} special={special} />
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="relative w-72 max-w-[80%] bg-white h-full shadow-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ color: CHARCOAL }}>Filters</h2>
              <button onClick={() => setDrawer(false)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <FilterPanel counts={counts} category={category} setCategory={setCategory} status={status} setStatus={setStatus} />
          </div>
        </div>
      )}

      {/* ── Mobile/tablet preview slide-over ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewOpen(false)} />
          <div className="relative bg-gray-50 h-full shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2" style={{ color: CHARCOAL }}><Smartphone size={16} />Customer preview</h2>
              <button onClick={() => setPreviewOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <CustomerPreview items={items} special={special} />
          </div>
        </div>
      )}

      <ItemModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} onSave={saveItem} />
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 grid place-items-center mx-auto mb-3"><Search className="w-6 h-6 text-gray-300" /></div>
      <p className="font-semibold" style={{ color: CHARCOAL }}>No items match your filters</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">Try clearing filters, or add your first item.</p>
      <button onClick={onAdd} className="qm-btn-primary text-white font-semibold text-sm px-4 py-2.5 rounded-xl inline-flex items-center gap-2"><Plus size={16} />Add new item</button>
    </div>
  );
}
