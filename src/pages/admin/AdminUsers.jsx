import { useState } from "react";
import { Users, Mail, ShieldCheck, KeyRound, Check, Store } from "lucide-react";
import { Card, SectionTitle, StatCard, Badge } from "../../components/ui/primitives";
import { useAdminUsers, sendPasswordReset } from "../../lib/adminStore";

const BRAND = "#E08A5B";
const CHARCOAL = "#1F2937";
const when = (t) => (t ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function AdminUsers() {
  const { rows, err } = useAdminUsers();
  const [busy, setBusy] = useState("");
  const [sent, setSent] = useState({});
  const [q, setQ] = useState("");

  const reset = async (email) => {
    setBusy(email);
    const res = await sendPasswordReset(email);
    setBusy("");
    setSent((s) => ({ ...s, [email]: res.ok ? "sent" : res.error }));
  };

  const list = (rows || []).filter(
    (u) => !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.name || "").toLowerCase().includes(q.toLowerCase())
  );
  const admins = (rows || []).filter((u) => u.role === "superadmin").length;
  const confirmed = (rows || []).filter((u) => u.confirmed).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: CHARCOAL }}>Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Every account on the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total accounts" value={String(rows?.length ?? "—")} tint="#F6EFE6" color={BRAND} />
        <StatCard icon={Check} label="Email confirmed" value={String(confirmed)} tint="#ECFDF5" color="#16A34A" />
        <StatCard icon={ShieldCheck} label="Super-admins" value={String(admins)} tint="#EFF6FF" color="#2563EB" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <SectionTitle>Accounts</SectionTitle>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…"
            className="px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 w-full sm:w-64" style={{ outlineColor: BRAND }} />
        </div>

        {err && <p className="text-sm text-rose-500 mb-3">{err}</p>}
        {!rows && <p className="text-sm text-gray-400 py-8 text-center">Loading accounts…</p>}
        {rows && list.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No accounts found.</p>}

        {list.length > 0 && (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-bold">Account</th>
                  <th className="pb-2 font-bold">Restaurant</th>
                  <th className="pb-2 font-bold">Role</th>
                  <th className="pb-2 font-bold">Joined</th>
                  <th className="pb-2 font-bold">Last sign-in</th>
                  <th className="pb-2 font-bold text-right">Support</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3">
                      <p className="font-bold" style={{ color: CHARCOAL }}>{u.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} />{u.email}
                        {!u.confirmed && <Badge tone="amber">unconfirmed</Badge>}
                      </p>
                    </td>
                    <td className="py-3 text-gray-500">
                      {u.restaurant ? <span className="flex items-center gap-1.5"><Store size={13} />{u.restaurant}</span> : "—"}
                    </td>
                    <td className="py-3">
                      <Badge tone={u.role === "superadmin" ? "blue" : "gray"}>{u.role}</Badge>
                    </td>
                    <td className="py-3 text-gray-500">{when(u.created_at)}</td>
                    <td className="py-3 text-gray-500">{when(u.last_sign_in_at)}</td>
                    <td className="py-3 text-right">
                      {sent[u.email] === "sent" ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end"><Check size={13} />Reset link sent</span>
                      ) : (
                        <button onClick={() => reset(u.email)} disabled={busy === u.email}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1.5 disabled:opacity-50" style={{ color: CHARCOAL }}>
                          <KeyRound size={12} />{busy === u.email ? "Sending…" : "Send reset link"}
                        </button>
                      )}
                      {sent[u.email] && sent[u.email] !== "sent" && <p className="text-[11px] text-rose-500 mt-1">{sent[u.email]}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          Passwords are stored as one-way encrypted hashes and cannot be viewed by anyone — including platform admins.
          To help someone who is locked out, send them a reset link; they choose a new password themselves.
        </p>
      </Card>
    </div>
  );
}
