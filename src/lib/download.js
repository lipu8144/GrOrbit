// Small client-side helpers so export/download/share buttons do real work.

export function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  downloadText(filename, csv, "text/csv;charset=utf-8;");
}

export function downloadSVG(svgEl, filename) {
  if (!svgEl) return;
  const xml = new XMLSerializer().serializeToString(svgEl);
  downloadText(filename, '<?xml version="1.0" encoding="UTF-8"?>\n' + xml, "image/svg+xml");
}

export function downloadSvgAsPng(svgEl, filename, size = 600) {
  if (!svgEl) return;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  };
  img.src = svgUrl;
}

export function printNode(node, title = "Print") {
  if (!node) return;
  const w = window.open("", "_blank", "width=480,height=640");
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title><style>body{display:grid;place-items:center;min-height:100vh;margin:0;font-family:Inter,system-ui,sans-serif}</style></head><body>${node.outerHTML}<scr` + `ipt>window.onload=()=>{window.print();}</scr` + `ipt></body></html>`);
  w.document.close();
}

export async function shareOrCopy({ title, text, url }) {
  try {
    if (navigator.share) { await navigator.share({ title, text, url }); return "shared"; }
  } catch { /* user cancelled */ }
  try { await navigator.clipboard.writeText(url || text); return "copied"; } catch { return "failed"; }
}

export const waLink = (phone, text = "") =>
  `https://wa.me/${String(phone).replace(/[^0-9]/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

// Print-formatted customer bill. The browser's print dialog lets the customer
// "Save as PDF" on both mobile and desktop — a real file, no PDF library.
export function printBill(order, restaurantName) {
  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const when = new Date(order.placedAt || Date.now()).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const rows = (order.items || []).map((i) =>
    `<tr><td>${i.name}</td><td class="c">×${i.qty}</td><td class="r">${inr(i.price * i.qty)}</td></tr>`
  ).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${order.token}</title>
  <style>
    body{font-family:ui-monospace,Menlo,Consolas,monospace;max-width:340px;margin:24px auto;color:#1F2937;font-size:13px}
    h1{font-size:17px;text-align:center;margin:0}
    .sub{text-align:center;color:#6B7280;font-size:11px;margin:4px 0 14px}
    table{width:100%;border-collapse:collapse}
    td{padding:4px 0}
    .c{text-align:center;color:#6B7280}.r{text-align:right}
    .line{border-top:1px dashed #9CA3AF;margin:10px 0}
    .tot td{font-weight:800;font-size:15px;padding-top:8px}
    .foot{text-align:center;color:#6B7280;font-size:11px;margin-top:16px}
    @media print { body{margin:0 auto} }
  </style></head><body>
    <h1>${restaurantName || "Restaurant"}</h1>
    <p class="sub">Token ${order.token} · ${order.type === "parcel" ? "Parcel 🥡" : "Dine-in 🍽️"}<br>${when}${order.customer && order.customer !== "Guest" ? "<br>" + order.customer : ""}</p>
    <div class="line"></div>
    <table>${rows}</table>
    <div class="line"></div>
    <table>
      <tr><td>Subtotal</td><td class="r">${inr(order.subtotal)}</td></tr>
      ${order.discount ? `<tr><td>Discount${order.coupon ? ` (${order.coupon})` : ""}</td><td class="r" style="color:#059669">−${inr(order.discount)}</td></tr>` : ""}
      <tr class="tot"><td>Total</td><td class="r">${inr(order.total)}</td></tr>
      <tr><td colspan="2" style="color:#6B7280;font-size:11px">${order.payment === "paid" ? "Paid" : "Pay at counter"} · ${order.method || ""}</td></tr>
    </table>
    <p class="foot">Thank you for dining with us! 🧡<br>Powered by GrOrbit</p>
  </body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  frame.contentDocument.open(); frame.contentDocument.write(html); frame.contentDocument.close();
  frame.onload = () => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error("print bill:", e); }
    setTimeout(() => frame.remove(), 2000);
  };
}

// Print-ready QR poster — the "J" design: serif restaurant-name banner on a
// dark header, the real QR floating below it, then SCAN & ORDER + tagline.
// Opens the print dialog → Save as PDF gives a print-ready A-portrait poster.
export function printPoster({ svg, restaurantName, url }) {
  const qr = svg ? svg.outerHTML : "";
  const name = restaurantName || "Our Restaurant";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name} — QR poster</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',system-ui,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#F6EFE6; }
    .poster { width:340px; background:#fff; border:1.5px solid #E8DCCF; border-radius:22px; overflow:hidden; text-align:center; }
    .band { background:#1F2937; padding:28px 22px 44px; }
    .name { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:30px; color:#fff; letter-spacing:0.5px; line-height:1.1; }
    .rule { width:52px; height:2.5px; background:#D85A30; margin:14px auto 0; border-radius:2px; }
    .qrwrap { width:180px; height:180px; margin:-32px auto 18px; background:#fff; border:1.5px solid #E8DCCF; border-radius:18px; display:flex; align-items:center; justify-content:center; }
    .qrwrap svg { width:150px; height:150px; }
    .scan { font-size:22px; font-weight:600; letter-spacing:6px; color:#1F2937; }
    .tag { font-size:12px; font-weight:500; letter-spacing:4px; color:#A38B79; margin:8px 0 26px; }
    .foot { font-size:10px; color:#C4B8A8; letter-spacing:2px; padding-bottom:20px; }
    @media print { body { background:#fff; } .poster { border-color:#ddd; } @page { margin:12mm; } }
  </style></head><body>
    <div class="poster">
      <div class="band"><p class="name">${name}</p><div class="rule"></div></div>
      <div class="qrwrap">${qr}</div>
      <p class="scan">SCAN &amp; ORDER</p>
      <p class="tag">BROWSE • ORDER • ENJOY</p>
      <p class="foot">POWERED BY GRORBIT</p>
    </div>
  </body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  frame.contentDocument.open(); frame.contentDocument.write(html); frame.contentDocument.close();
  frame.onload = () => {
    setTimeout(() => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { console.error("poster:", e); } setTimeout(() => frame.remove(), 2000); }, 400);
  };
}
