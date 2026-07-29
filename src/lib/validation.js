// Password strength rules used at signup and reset.
// Requirements: 8+ chars, uppercase, lowercase, number. Symbol adds strength.
export function checkPassword(pw = "") {
  const rules = [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /[A-Z]/.test(pw), label: "an uppercase letter" },
    { ok: /[a-z]/.test(pw), label: "a lowercase letter" },
    { ok: /[0-9]/.test(pw), label: "a number" },
  ];
  const bonus = /[^A-Za-z0-9]/.test(pw) ? 1 : 0;
  const passed = rules.filter((r) => r.ok).length;
  const missing = rules.filter((r) => !r.ok).map((r) => r.label);
  return {
    ok: passed === rules.length,
    score: Math.min(4, passed - (pw.length >= 12 ? 0 : 1) + bonus + (pw.length >= 12 ? 1 : 0)),
    strength: passed < 2 ? "Weak" : passed < 4 ? "Almost there" : bonus || pw.length >= 12 ? "Strong" : "Good",
    missing,
  };
}
