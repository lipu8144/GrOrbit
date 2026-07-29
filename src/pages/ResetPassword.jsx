import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Check, ArrowRight } from "lucide-react";
import { updatePassword } from "../lib/authStore";
import { checkPassword } from "../lib/validation";

const BRAND = "#E08A5B";
const CHARCOAL = "#1F2937";

export function StrengthMeter({ pw }) {
  if (!pw) return null;
  const { score, strength, missing } = checkPassword(pw);
  const colors = ["#EF4444", "#F59E0B", "#F59E0B", "#10B981", "#059669"];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < score ? colors[score] : "#E5E7EB" }} />
        ))}
      </div>
      <p className="text-[11px] mt-1" style={{ color: colors[score] }}>
        {strength}{missing.length > 0 && <span className="text-gray-400"> — add {missing[0]}</span>}
      </p>
    </div>
  );
}

export default function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    const rules = checkPassword(pw);
    if (!rules.ok) return setErr("Password needs " + rules.missing.join(", ") + ".");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if (res.ok) { setDone(true); setTimeout(() => nav("/login", { replace: true }), 1800); }
    else setErr(res.error);
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-6"><img src="/grorbit-icon.png" alt="GrOrbit" className="h-14 w-14 rounded-2xl shadow-sm" /></Link>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: "#ECFDF5" }}><Check size={24} className="text-emerald-600" /></div>
              <p className="font-bold" style={{ color: CHARCOAL }}>Password updated</p>
              <p className="text-sm text-gray-500 mt-1">Taking you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Set a new password</h1>
              <p className="text-sm text-gray-500 mt-1">You opened this from your reset email — choose a strong new password.</p>
              <div className="relative mt-5">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-full pl-10 pr-3 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
              </div>
              <StrengthMeter pw={pw} />
              <div className="relative mt-3">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Repeat new password" className="w-full pl-10 pr-3 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4" style={{ outlineColor: BRAND }} />
              </div>
              {err && <p className="text-xs text-rose-500 mt-2">{err}</p>}
              <button onClick={submit} disabled={busy} className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: BRAND }}>
                {busy ? "Saving…" : <>Update password <ArrowRight size={16} /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
