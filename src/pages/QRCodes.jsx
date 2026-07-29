import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Printer, FileText, FileCode, ScanLine, Users, Target, Eye, Smartphone } from "lucide-react";
import { BRAND, BRAND_DARK, CHARCOAL } from "../lib/theme";
import { Card, StatCard, SectionTitle, Toggle, Badge } from "../components/ui/primitives";
import { downloadSVG, downloadSvgAsPng, printNode, printPoster } from "../lib/download";
import { useRestaurant, updateRestaurant } from "../lib/restaurantStore";
import { sb, REMOTE, rid } from "../lib/supabaseClient";
import { useAuth } from "../lib/authStore";
import { useMenuCategories } from "../lib/menuStore";

// Real, scannable QR — encodes the given URL (verified with an encode→decode
// roundtrip test). Rendered as SVG so the existing PNG/SVG/print helpers work.
function RealQR({ url, size = 200 }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 1, width: size, color: { dark: "#1F2937", light: "#FFFFFF" } })
      .then((str) => alive && setSvg(str.replace("<svg ", `<svg width="${size}" height="${size}" `)))
      .catch((e) => console.error("qr:", e.message));
    return () => { alive = false; };
  }, [url, size]);
  if (!svg) return <div style={{ width: size, height: size }} className="bg-gray-50 rounded-lg animate-pulse" />;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

const TABLE_QRS = [
  { label: "Main menu", scans: 8420, seed: 3, active: true },
  { label: "Counter", scans: 642, seed: 11, active: true },
  { label: "Entrance", scans: 588, seed: 21, active: true },
  { label: "Takeaway", scans: 1240, seed: 31, active: false },
];

export default function QRCodes() {
  const settings = useRestaurant();
  const cats = useMenuCategories();
  const { user } = useAuth();
  const displayName = user?.restaurant || settings.name || "Your restaurant";
  const liveSlug = user?.slug || "";
  // never fall back to the demo slug — a printed QR must point at THIS restaurant
  const slug = user?.slug || (REMOTE ? "" : "spice-junction");
  const [base, setBase] = useState(settings.publicUrl || (typeof window !== "undefined" ? window.location.origin : ""));
  const menuUrl = slug ? base.replace(/\/+$/, "") + "/r/" + slug : "";
  const slugMissing = REMOTE && !slug;
  const saveBase = () => updateRestaurant({ publicUrl: base.replace(/\/+$/, "") });
  const [active, setActive] = useState(true);
  const [tables, setTables] = useState(REMOTE ? TABLE_QRS.map((t) => ({ ...t, scans: 0 })) : TABLE_QRS);
  const [totalScans, setTotalScans] = useState(null);
  useEffect(() => {
    if (!REMOTE) return;
    sb.from("qr_scans").select("src").eq("restaurant_id", rid())
      .gte("scanned_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(5000)
      .then(({ data, error }) => {
        if (error) { console.error("scan counts:", error.message); return; }
        const bySrc = {};
        for (const r of data) bySrc[r.src] = (bySrc[r.src] || 0) + 1;
        setTotalScans(data.length);
        setTables((prev) => prev.map((t) => ({
          ...t,
          scans: t.label === "Main menu"
            ? (bySrc["direct"] || 0)
            : (bySrc[t.label.toLowerCase().replace(/\s+/g, "-")] || 0),
        })));
      });
  }, []);
  const mainRef = useRef(null);
  const tableRefs = useRef({});
  const toggleTable = (i) => setTables((t) => t.map((x, j) => j === i ? { ...x, active: !x.active } : x));
  const getSvg = (ref) => ref?.querySelector("svg");
  const addQR = () => setTables((t) => [...t, { label: `QR ${t.length + 1}`, scans: 0, seed: Math.floor(Math.random() * 90) + 5, active: true }]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-5 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: CHARCOAL }}>QR Codes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Print, share and track the QR codes customers scan to order.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={ScanLine} label="Total scans (30d)" value={totalScans === null ? (REMOTE ? "—" : "11,038") : String(totalScans)} delta={totalScans === null && !REMOTE ? 16 : 0} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Users} label="Unique visitors" value={REMOTE ? "—" : "7,284"} delta={REMOTE ? 0 : 11} tint="#EFF6FF" color="#2563EB" />
        <StatCard icon={Target} label="Scan → order rate" value={REMOTE ? "—" : "38%"} delta={REMOTE ? 0 : 6} tint="#ECFDF5" color="#16A34A" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main QR */}
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="flex items-center justify-between w-full mb-3">
            <SectionTitle>Main QR</SectionTitle>
            <div className="flex items-center gap-2">
              <Badge tone={active ? "green" : "gray"}>{active ? "Active" : "Inactive"}</Badge>
              <Toggle checked={active} onChange={setActive} label="Active" />
            </div>
          </div>
          <div className="w-full mb-4">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Your website address (QR points here)</label>
            <div className="flex gap-2">
              <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://yourdomain.com" className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl qm-focus" />
              <button onClick={saveBase} className="px-4 rounded-xl text-sm font-bold border" style={{ borderColor: BRAND, color: BRAND }}>Save</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Set this to your live domain before printing — a QR printed with a local/test address won't work for customers.</p>
          </div>
          <div ref={mainRef} className={`p-4 rounded-2xl border border-gray-100 shadow-sm bg-white transition ${active ? "" : "opacity-40 grayscale"}`}>
            <div data-testid="main-qr">{slugMissing ? <div className="w-[200px] h-[200px] grid place-items-center text-center px-4"><p className="text-xs text-gray-400">Your menu link isn’t ready yet — log out and back in to finish setting up your restaurant.</p></div> : <RealQR url={menuUrl} size={200} />}</div>
          </div>
          <p className="text-sm font-bold mt-3" style={{ color: CHARCOAL }}>{displayName}</p>
          <a href={menuUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold hover:underline break-all" style={{ color: BRAND }}>{menuUrl.replace(/^https?:\/\//, "")} ↗</a>
          <div className="grid grid-cols-4 gap-2 w-full mt-4">
            <button onClick={() => printPoster({ svg: getSvg(mainRef.current), restaurantName: user?.restaurant || settings.name, url: menuUrl })} className="col-span-3 flex items-center justify-center gap-2 py-3 mb-2 rounded-xl text-sm font-bold text-white qm-btn-primary"><FileText size={16} />Download poster (print-ready)</button>
            <button onClick={() => downloadSvgAsPng(getSvg(mainRef.current), "menu-qr.png")} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold text-white qm-btn-primary"><Download size={15} />PNG</button>
            <button onClick={() => downloadSVG(getSvg(mainRef.current), "menu-qr.svg")} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}><FileCode size={15} />SVG</button>
            <button onClick={() => printNode(getSvg(mainRef.current), "GrOrbit QR")} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}><FileText size={15} />PDF</button>
            <button onClick={() => printNode(getSvg(mainRef.current), "GrOrbit QR")} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold border border-gray-200 hover:bg-gray-50" style={{ color: CHARCOAL }}><Printer size={15} />Print</button>
          </div>
        </Card>

        {/* table QRs */}
        <Card className="p-5">
          <SectionTitle action={<button onClick={addQR} className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg text-white qm-btn-primary"><QrCode size={13} />New QR</button>}>Location QRs</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t, i) => (
              <div key={t.label} className="rounded-2xl border border-gray-100 p-3 text-center hover:shadow-md transition-shadow">
                <div ref={(el) => (tableRefs.current[i] = el)} className={`p-2 rounded-xl bg-gray-50 inline-block ${t.active ? "" : "opacity-40 grayscale"}`}><RealQR url={`${menuUrl}?src=${encodeURIComponent(t.label.toLowerCase().replace(/\s+/g, "-"))}`} size={84} /></div>
                <p className="text-sm font-bold mt-2 truncate" style={{ color: CHARCOAL }}>{t.label}</p>
                <p className="text-[11px] text-gray-400">{t.scans.toLocaleString("en-IN")} scans</p>
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => downloadSvgAsPng(tableRefs.current[i]?.querySelector("svg"), `${t.label.replace(/\s+/g, "-").toLowerCase()}-qr.png`)} className="text-[11px] font-semibold flex items-center gap-1 hover:underline" style={{ color: BRAND }}><Download size={11} />Save</button>
                  <Toggle checked={t.active} onChange={() => toggleTable(i)} label="Active" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* restaurant preview */}
        <Card className="p-5">
          <SectionTitle action={<a href={liveSlug ? `/r/${liveSlug}` : menuUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold flex items-center gap-1" style={{ color: BRAND }}><Eye size={13} />Open live</a>}><span className="flex items-center gap-1.5"><Smartphone size={15} />Customer preview</span></SectionTitle>
          <div className="mx-auto w-[230px] rounded-[1.8rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl overflow-hidden">
            <div className="h-5 flex items-center justify-center"><div className="w-16 h-1 rounded-full bg-gray-700" /></div>
            <div className="bg-gray-50 h-[360px] overflow-hidden">
              <div className="px-3 py-3 text-white" style={{ background: `linear-gradient(135deg,${BRAND},${BRAND_DARK})` }}>
                <p className="font-bold text-sm">{displayName}</p>
                <p className="text-[10px] text-white/80">Scan to order</p>
              </div>
              <div className="p-3 space-y-2">
                {(cats.length ? cats.slice(0, 4).map((c) => `${c.emoji || "🍽️"} ${c.name}`) : (REMOTE ? [] : ["🍔 Burgers", "🍕 Pizza", "☕ Coffee", "🍰 Dessert"])).map((c) => (
                  <div key={c} className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-xs font-semibold flex items-center justify-between" style={{ color: CHARCOAL }}>{c}<span className="text-gray-300">›</span></div>
                ))}
                {REMOTE && !cats.length && <p className="text-[11px] text-gray-400 text-center py-4">Add menu categories to see them here</p>}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
