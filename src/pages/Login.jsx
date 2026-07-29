import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { UtensilsCrossed, Mail, Lock, User, Store, ArrowRight, Sparkles, Shield, Phone } from "lucide-react";
import { login, signup, demoLogin, adminLogin, requestPasswordReset, getUser } from "../lib/authStore";
import { REMOTE } from "../lib/supabaseClient";
import { checkPassword } from "../lib/validation";
import { StrengthMeter } from "./ResetPassword";

const BRAND = "#E08A5B";
const BRAND_DARK = "#C97245";
const CHARCOAL = "#1F2937";
const field = "w-full pl-10 pr-3 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 transition";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const dest = loc.state?.from?.pathname || "/app";
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", restaurant: "", phone: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr(""); setInfo("");
    if (mode === "signup") {
      if (form.phone.replace(/\D/g, "").length < 10) return setErr("Please enter a valid contact number.");
      const rules = checkPassword(form.password);
      if (!rules.ok) return setErr("Password needs " + rules.missing.join(", ") + ".");
    }
    setBusy(true);
    const res = await Promise.resolve(mode === "login" ? login(form) : signup(form));
    setBusy(false);
    if (res.ok) {
      if (res.confirm) nav("/confirm-email", { state: { email: res.email } });
      else if (res.info) setInfo(res.info);
      else nav((res.role || getUser()?.role) === "superadmin" ? "/admin" : dest, { replace: true });
    }
    else setErr(res.error);
  };
  const forgot = async () => {
    setErr(""); setInfo("");
    const res = await requestPasswordReset(form.email);
    res.ok ? setInfo(res.info) : setErr(res.error);
  };
  const demo = () => { demoLogin(); nav("/app", { replace: true }); };
  const admin = () => { adminLogin(); nav("/admin", { replace: true }); };
  const onKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${BRAND}, ${BRAND_DARK})` }}>
        <Link to="/" className="relative z-10 inline-block bg-white/95 rounded-2xl px-4 py-2.5">
          <img src="/grorbit-logo.png" alt="GrOrbit" className="h-7 w-auto" />
        </Link>
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold leading-tight">Turn every table into repeat business.</h1>
          <p className="text-white/85 mt-4 max-w-sm">QR ordering, live kitchen dashboard, reviews, and customer growth — all in one place.</p>
          <div className="flex gap-6 mt-8 text-sm">
            <div><p className="text-2xl font-extrabold">2,340+</p><p className="text-white/70">reviews collected</p></div>
            <div><p className="text-2xl font-extrabold">₹8.4L</p><p className="text-white/70">revenue tracked</p></div>
            <div><p className="text-2xl font-extrabold">86%</p><p className="text-white/70">repeat rate</p></div>
          </div>
        </div>
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute right-24 top-12 w-32 h-32 rounded-full bg-white/10" />
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex lg:hidden mb-8 justify-center">
            <img src="/grorbit-icon.png" alt="GrOrbit" className="h-14 w-14 rounded-2xl shadow-sm" />
          </Link>

          <h2 className="text-2xl font-extrabold" style={{ color: CHARCOAL }}>{mode === "login" ? "Welcome back" : "Create your restaurant"}</h2>
          <p className="text-sm text-gray-500 mt-1">{mode === "login" ? "Log in to your dashboard." : "Start taking QR orders in minutes."}</p>

          <div className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={form.name} onChange={set("name")} onKeyDown={onKey} placeholder="Your name" className={field} style={{ outlineColor: BRAND }} /></div>
                <div className="relative"><Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={form.restaurant} onChange={set("restaurant")} onKeyDown={onKey} placeholder="Restaurant name" className={field} style={{ outlineColor: BRAND }} /></div>
                <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={form.phone} onChange={set("phone")} onKeyDown={onKey} inputMode="tel" placeholder="Contact number" className={field} style={{ outlineColor: BRAND }} /></div>
              </>
            )}
            <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={form.email} onChange={set("email")} onKeyDown={onKey} placeholder="Email" className={field} style={{ outlineColor: BRAND }} /></div>
            <div>
              <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="password" value={form.password} onChange={set("password")} onKeyDown={onKey} placeholder="Password" className={field} style={{ outlineColor: BRAND }} /></div>
              {mode === "signup" && <StrengthMeter pw={form.password} />}
              {mode === "login" && (
                <button onClick={forgot} className="text-[11px] font-semibold mt-1.5 hover:underline" style={{ color: BRAND }}>Forgot password?</button>
              )}
            </div>

            {err && <p className="text-xs text-rose-500">{err}</p>}
            {info && <p className="text-xs font-semibold text-emerald-600">{info}</p>}

            <button onClick={submit} disabled={busy} className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 qm-btn-primary shadow-sm disabled:opacity-60">
              {busy ? "Please wait…" : <>{mode === "login" ? "Log in" : "Create account"} <ArrowRight size={16} /></>}
            </button>
          </div>

          {!REMOTE && <button onClick={demo} className="w-full mt-3 py-3 rounded-xl font-bold text-sm border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-2" style={{ color: CHARCOAL }}>
            <Sparkles size={15} style={{ color: BRAND }} />Continue to demo
          </button>}

          <p className="text-sm text-gray-500 text-center mt-6">
            {mode === "login" ? "New to GrOrbit?" : "Already have an account?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} className="font-bold" style={{ color: BRAND }}>
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
          {!REMOTE && <><p className="text-[11px] text-gray-400 text-center mt-4">Demo: any email & password works.</p>
          <button onClick={admin} className="w-full mt-2 text-[11px] font-semibold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
            <Shield size={11} />Enter super-admin demo
          </button></>}
        </div>
      </div>
    </div>
  );
}
