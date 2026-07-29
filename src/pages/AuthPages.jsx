import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { MailCheck, ArrowRight } from "lucide-react";
import { sb, REMOTE } from "../lib/supabaseClient";

const BRAND = "#E08A5B";
const CHARCOAL = "#1F2937";

// Shown right after signup: "we sent you a link".
export function ConfirmEmail() {
  const loc = useLocation();
  const email = loc.state?.email || "your inbox";
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gray-50" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm text-center">
        <Link to="/"><img src="/grorbit-icon.png" alt="GrOrbit" className="h-14 w-14 rounded-2xl shadow-sm mx-auto mb-6" /></Link>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7">
          <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: "#F6EFE6" }}>
            <MailCheck size={26} style={{ color: BRAND }} />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: CHARCOAL }}>Confirm your email</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            We've sent a confirmation link to<br />
            <span className="font-bold text-gray-700">{email}</span>.<br />
            Click it and you'll land straight in your restaurant dashboard.
          </p>
          <p className="text-[11px] text-gray-400 mt-4">Can't find it? Check spam, or sign up again to resend.</p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold" style={{ color: BRAND }}>
            Back to login <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// The confirmation link lands here. supabase-js picks the session out of the
// URL automatically; we wait for it, mirror it (which also creates/loads the
// owner's restaurant), then continue into the dashboard.
export function AuthCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Confirming your email…");

  useEffect(() => {
    if (!REMOTE) { nav("/login", { replace: true }); return; }
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      const { data } = await sb.auth.getSession();
      if (data?.session?.user) {
        clearInterval(iv);
        setStatus("Setting up your restaurant…");
        const { mirror } = await import("../lib/authStore");
        await mirror(data.session.user);
        nav("/app", { replace: true });
      } else if (tries > 12) {
        clearInterval(iv);
        setStatus("Link expired or already used — please log in.");
        setTimeout(() => nav("/login", { replace: true }), 1800);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [nav]);

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 animate-spin mx-auto" style={{ borderTopColor: BRAND }} />
        <p className="text-sm font-semibold text-gray-500 mt-4">{status}</p>
      </div>
    </div>
  );
}
