import { useEffect, useState } from "react";
import { sb, REMOTE, rid, hasRealTenant } from "../lib/supabaseClient";

const BRAND = "#E08A5B";
const CHARCOAL = "#1F2937";

// Post-deploy diagnostics: hit /health on the live URL to confirm the backend
// is wired — connection, tables, RPCs (i.e. which migrations are live), auth,
// and storage. Read-only and safe to leave in production.
const CHECKS = [
  { key: "connect", label: "Supabase connection", run: async () => {
      const { error } = await sb.from("restaurants").select("id", { head: true, count: "exact" });
      if (!error) return "reachable";
      const m = error.message || "";
      // Infinite RLS recursion is a REAL problem (migration 011 fixes it) and
      // it also breaks super-admin login, so surface it loudly.
      if (/infinite recursion/i.test(m)) throw new Error("RLS recursion — run migration 011");
      // A bad URL/key or offline network is a genuine connection failure.
      if (/failed to fetch|networkerror|api key|invalid.*jwt|unauthorized/i.test(m)) throw new Error(m);
      // Anything else (permission denied / policy) means the server ANSWERED —
      // the connection is fine, RLS simply refused this anonymous read.
      return "reachable (RLS active)";
  } },
  { key: "coupons", label: "Coupon RPCs (migrations 002–003)", run: async () => {
      const { error } = await sb.rpc("check_coupon", { p_code: "PING", p_phone: "0", p_restaurant: "00000000-0000-0000-0000-000000000001", p_subtotal: 100 });
      if (error && /could not find/i.test(error.message)) throw new Error("run migrations 002 & 003");
      return "installed";
  } },
  { key: "dash", label: "Dashboard functions (migration 004)", run: async () => {
      const { error } = await sb.rpc("admin_tenants");
      if (error && /could not find/i.test(error.message)) throw new Error("run migration 004");
      return "installed";
  } },
  { key: "storage", label: "Image storage bucket (migration 006)", run: async () => {
      const { error } = await sb.storage.from("menu-images").list("", { limit: 1 });
      if (error) throw new Error("run migration 006 / create bucket");
      return "ready";
  } },
  { key: "scans", label: "QR scan tracking (migration 008)", run: async () => {
      const { error } = await sb.from("qr_scans").select("id", { head: true, count: "exact" });
      if (error && /does not exist|not find|schema cache/i.test(error.message)) throw new Error("run migration 008");
      return "ready";      // RLS/permission errors mean the table EXISTS — migration ran
  } },
  { key: "cleared", label: "Order board clearing (migration 015)", run: async () => {
      const { error } = await sb.from("orders").select("cleared_at", { head: true });
      if (error && /does not exist|not find|schema cache/i.test(error.message)) throw new Error("run migration 015");
      return "ready";
  } },
  { key: "session", label: "Menu session column (migration 010)", run: async () => {
      const { error } = await sb.from("restaurants").select("menu_session_mins", { head: true });
      if (error && /does not exist|not find|schema cache/i.test(error.message)) throw new Error("run migration 010");
      return "ready";
  } },
  { key: "audit", label: "Admin users & audit (migrations 012–013)", run: async () => {
      const { error } = await sb.rpc("admin_users");
      // permission error = function EXISTS (just not a superadmin) = pass
      if (error && /could not find/i.test(error.message)) throw new Error("run migrations 012 & 013");
      return "installed";
  } },
  { key: "auth", label: "Auth service", run: async () => {
      const { error } = await sb.auth.getSession();
      if (error) throw new Error(error.message);
      return "responding";
  } },
  { key: "grants", label: "Table grants (migration 016)", run: async () => {
      // If base grants are missing, reads return "permission denied for table"
      // rather than an empty/RLS result. Probe a core table anonymously.
      const { error } = await sb.from("menu_categories").select("id", { head: true });
      if (error && /permission denied/i.test(error.message)) throw new Error("run migration 016 (grants)");
      return "granted";
  } },
];

// Account-level audit: traces YOUR login → profile → restaurant → tenant →
// write permission, which is the chain that decides whether saving a name,
// adding a category, or generating a QR actually works.
const ACCOUNT_CHECKS = [
  { key: "session", label: "You are signed in", run: async () => {
      const { data } = await sb.auth.getUser();
      if (!data?.user) throw new Error("not signed in — log in first");
      return data.user.email;
  } },
  { key: "profile", label: "Your profile row exists", run: async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) throw new Error("sign in first");
      const { data, error } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("no profile row — sign up fresh, or insert one manually");
      return `role: ${data.role || "owner"}`;
  } },
  { key: "restaurant", label: "Your restaurant exists", run: async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) throw new Error("sign in first");
      const { data, error } = await sb.from("restaurants").select("id, name, slug").eq("owner_id", u.user.id).limit(1);
      if (error) throw new Error(`lookup blocked: ${error.message}`);
      if (!data?.length) throw new Error("NO restaurant for this account — this breaks saving & QR codes");
      return `${data[0].name} (/r/${data[0].slug})`;
  } },
  { key: "tenant", label: "App is pointed at your restaurant", run: async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) throw new Error("sign in first");
      const { data } = await sb.from("restaurants").select("id").eq("owner_id", u.user.id).limit(1);
      if (!data?.length) throw new Error("no restaurant to point at");
      if (!hasRealTenant()) throw new Error("app is on the placeholder tenant — log out and back in");
      if (rid() !== data[0].id) throw new Error(`app is on the wrong restaurant (${rid().slice(0, 8)}…) — log out and back in`);
      return "correct";
  } },
  { key: "write", label: "You can save changes", run: async () => {
      if (!hasRealTenant()) throw new Error("no real tenant — saves would silently do nothing");
      const { data: cur, error: e1 } = await sb.from("restaurants").select("name").eq("id", rid()).maybeSingle();
      if (e1) throw new Error(`can't read your restaurant: ${e1.message}`);
      if (!cur) throw new Error("your restaurant row isn't visible to this account");
      // write the SAME name back: harmless, but proves the update matches a row
      const { data, error } = await sb.from("restaurants").update({ name: cur.name }).eq("id", rid()).select("id");
      if (error) throw new Error(`writes are blocked: ${error.message}`);
      if (!data || data.length === 0) throw new Error("update matched 0 rows — saves will silently fail");
      return "writable";
  } },
  { key: "categories", label: "Menu categories load", run: async () => {
      if (!hasRealTenant()) throw new Error("no real tenant");
      const { data, error } = await sb.from("menu_categories").select("id").eq("restaurant_id", rid());
      if (error) throw new Error(error.message);
      return `${data.length} categor${data.length === 1 ? "y" : "ies"}`;
  } },
];

export default function Health() {
  const [results, setResults] = useState({});
  const [acct, setAcct] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!REMOTE) { setDone(true); return; }
    (async () => {
      for (const c of CHECKS) {
        try { const detail = await c.run(); setResults((r) => ({ ...r, [c.key]: { ok: true, detail } })); }
        catch (e) { setResults((r) => ({ ...r, [c.key]: { ok: false, detail: e.message } })); }
      }
      for (const c of ACCOUNT_CHECKS) {
        try { const detail = await c.run(); setAcct((r) => ({ ...r, [c.key]: { ok: true, detail } })); }
        catch (e) { setAcct((r) => ({ ...r, [c.key]: { ok: false, detail: e.message } })); }
      }
      setDone(true);
    })();
  }, []);

  const passed = Object.values(results).filter((r) => r.ok).length;
  const allGood = done && REMOTE && passed === CHECKS.length;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <img src="/grorbit-icon.png" alt="" className="h-8 w-8 rounded-lg" />
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>System health</h1>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {!REMOTE ? "Running in demo mode — no backend configured." :
            allGood ? "✅ All systems live. You're ready to onboard restaurants." :
            !done ? "Running checks…" : "Some checks need attention — see below."}
        </p>

        {!REMOTE && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            No Supabase keys detected. This build is in demo mode. Set VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY in your Vercel environment variables to go live.
          </div>
        )}

        {REMOTE && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {CHECKS.map((c) => {
              const r = results[c.key];
              return (
                <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-semibold" style={{ color: CHARCOAL }}>{c.label}</span>
                  {!r ? <span className="text-xs text-gray-300">…</span> :
                    r.ok ? <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">✓ {r.detail}</span> :
                    <span className="text-xs font-bold text-rose-500 text-right">✗ {r.detail}</span>}
                </div>
              );
            })}
          </div>
        )}

        {REMOTE && (
          <>
            <h2 className="text-sm font-extrabold mt-6 mb-2" style={{ color: CHARCOAL }}>Your account</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {ACCOUNT_CHECKS.map((c) => {
                const r = acct[c.key];
                return (
                  <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-semibold" style={{ color: CHARCOAL }}>{c.label}</span>
                    {!r ? <span className="text-xs text-gray-300">…</span> :
                      r.ok ? <span className="text-xs font-bold text-emerald-600 text-right">✓ {r.detail}</span> :
                      <span className="text-xs font-bold text-rose-500 text-right max-w-[55%]">✗ {r.detail}</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {done && REMOTE && (
          <p className="text-center text-sm font-bold mt-5" style={{ color: allGood ? "#059669" : "#DC2626" }}>
            {passed}/{CHECKS.length} checks passed
          </p>
        )}
      </div>
    </div>
  );
}
