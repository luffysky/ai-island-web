"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { trackEvent } from "@/lib/analytics";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const t = useTranslations("authpages");
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [over13, setOver13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [ref, setRef] = useState("");
  const supabase = createSupabaseBrowser();

  // 讀網址上的邀請碼 ?ref=（用 window 讀、避免 useSearchParams 的 Suspense 需求）
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("ref");
      if (r) setRef(r.trim().toUpperCase());
    } catch {}
  }, []);

  // Step 1：驗證欄位 → 寄驗證碼到 email
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (username.length < 3) { setError(t("usernameTooShort")); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError(t("emailInvalid")); return; }
    if (password.length < 8) { setError(t("passwordTooShort")); return; }
    if (!agreed) { setError(t("mustAgree")); return; }
    if (!over13) { setError(t("mustBe13")); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/send-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.message || t("sendCodeFailed")); setLoading(false); return; }
      setStep("code"); setInfo(t("codeSent", { email }));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const resend = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/send-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).then((x) => x.json());
      if (!r.ok) setError(r.message || t("resendFailed")); else setInfo(t("codeResent"));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  // Step 2：驗證碼正確 → 建帳號 → 登入
  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), password, username, ref: ref || undefined }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.message || t("verifyFailed")); setLoading(false); return; }
      // 帳號已建立 → 登入拿 session → 建 profile
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signErr) { setError(t("accountCreatedUseLogin") + signErr.message); setLoading(false); return; }
      await fetch("/api/auth/ensure-profile", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref || undefined }),
      });
      trackEvent("sign_up", { method: "email" });
      window.location.href = "/";
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🏝️</div>
        <h1 className="text-3xl font-bold mb-2">{t("signupHeading")}</h1>
        <p className="text-sm text-fg-muted">{t("signupSubtitle")}</p>
        <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-accent">
          {t("signupBonus")}
        </div>
        {ref && (
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            {t("refPrefix")} <span className="font-mono font-bold">{ref}</span>{t("refSuffix")}
          </div>
        )}
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        {step === "form" ? (
          <form onSubmit={sendCode} className="space-y-3" autoComplete="off">
            <div>
              <label className="text-xs text-fg-muted">{t("usernameLabel")}</label>
              <input type="text" required minLength={3} maxLength={30} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} placeholder={t("usernamePlaceholder")} className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            <div>
              <label className="text-xs text-fg-muted">{t("emailLabel")}</label>
              <input type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            <div>
              <label className="text-xs text-fg-muted">{t("passwordLabelHint")}</label>
              <div className="relative mt-1">
                <input type={showPw ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 pr-10 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? t("hidePassword") : t("showPassword")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={over13} onChange={(e) => setOver13(e.target.checked)} className="mt-0.5 accent-accent" />
                <span>{t("over13Consent")}</span>
              </label>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-accent" />
                <span>
                  {t("agreePrefix")}{" "}
                  <Link href="/terms" target="_blank" className="text-accent underline">{t("termsOfService")}</Link>{t("listSep")}{" "}
                  <Link href="/privacy" target="_blank" className="text-accent underline">{t("privacyPolicy")}</Link>{t("listSepAnd")}{" "}
                  <Link href="/cookies" target="_blank" className="text-accent underline">{t("cookiePolicy")}</Link>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
              {loading ? t("sending") : t("sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyAndRegister} className="space-y-3" autoComplete="off">
            {info && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{info}</p>}
            <div>
              <label className="text-xs text-fg-muted">{t("codeLabel")}</label>
              <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" className="w-full mt-1 px-3 py-2 text-center text-2xl tracking-[0.5em] font-bold bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
              {loading ? t("verifying") : t("completeSignup")}
            </button>
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <button type="button" onClick={() => { setStep("form"); setError(""); setInfo(""); }} className="hover:text-accent">{t("editInfo")}</button>
              <button type="button" onClick={resend} disabled={loading} className="hover:text-accent disabled:opacity-50">{t("resendCode")}</button>
            </div>
          </form>
        )}

        <p className="text-center text-sm mt-4 text-fg-muted">
          {t("haveAccount")}<Link href="/login" className="text-accent hover:underline">{t("loginLink")}</Link>
        </p>
      </div>
    </div>
  );
}
