"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { trackEvent } from "@/lib/analytics";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
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
  const supabase = createSupabaseBrowser();

  // Step 1：驗證欄位 → 寄驗證碼到 email
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (username.length < 3) { setError("使用者名稱至少 3 個字"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Email 格式不正確"); return; }
    if (password.length < 8) { setError("密碼至少 8 個字"); return; }
    if (!agreed) { setError("請同意服務條款與隱私權政策"); return; }
    if (!over13) { setError("本平台限 13 歲以上使用者"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/send-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.message || "驗證碼寄送失敗"); setLoading(false); return; }
      setStep("code"); setInfo(`驗證碼已寄到 ${email}，10 分鐘內有效。`);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const resend = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/send-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).then((x) => x.json());
      if (!r.ok) setError(r.message || "重寄失敗"); else setInfo("已重新寄出驗證碼。");
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  // Step 2：驗證碼正確 → 建帳號 → 登入
  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/signup/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), password, username }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.message || "驗證失敗"); setLoading(false); return; }
      // 帳號已建立 → 登入拿 session → 建 profile
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signErr) { setError("帳號已建立，請改用登入頁登入：" + signErr.message); setLoading(false); return; }
      await fetch("/api/auth/ensure-profile", { credentials: "include", method: "POST" });
      trackEvent("sign_up", { method: "email" });
      window.location.href = "/";
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🏝️</div>
        <h1 className="text-3xl font-bold mb-2">註冊 AI 島</h1>
        <p className="text-sm text-fg-muted">開始你的全端冒險</p>
        <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-accent">
          🎁 註冊送 100 Z-coin + 5 hearts
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        {step === "form" ? (
          <form onSubmit={sendCode} className="space-y-3" autoComplete="off">
            <div>
              <label className="text-xs text-fg-muted">使用者名稱（3-30 字、之後可改）</label>
              <input type="text" required minLength={3} maxLength={30} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} placeholder="luffysky" className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            <div>
              <label className="text-xs text-fg-muted">Email</label>
              <input type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            <div>
              <label className="text-xs text-fg-muted">密碼（至少 8 字）</label>
              <div className="relative mt-1">
                <input type={showPw ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 pr-10 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? "隱藏密碼" : "顯示密碼"} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={over13} onChange={(e) => setOver13(e.target.checked)} className="mt-0.5 accent-accent" />
                <span>我已年滿 13 歲（未成年者已獲監護人同意）</span>
              </label>
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-accent" />
                <span>
                  我已閱讀並同意{" "}
                  <Link href="/terms" target="_blank" className="text-accent underline">使用條款</Link>、{" "}
                  <Link href="/privacy" target="_blank" className="text-accent underline">隱私權政策</Link>、以及{" "}
                  <Link href="/cookies" target="_blank" className="text-accent underline">Cookie 政策</Link>
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
              {loading ? "寄送中..." : "📧 寄送驗證碼"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyAndRegister} className="space-y-3" autoComplete="off">
            {info && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{info}</p>}
            <div>
              <label className="text-xs text-fg-muted">輸入信箱收到的 6 位數驗證碼</label>
              <input type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" className="w-full mt-1 px-3 py-2 text-center text-2xl tracking-[0.5em] font-bold bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
              {loading ? "驗證中..." : "🚀 完成註冊、開始冒險"}
            </button>
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <button type="button" onClick={() => { setStep("form"); setError(""); setInfo(""); }} className="hover:text-accent">← 改資料</button>
              <button type="button" onClick={resend} disabled={loading} className="hover:text-accent disabled:opacity-50">沒收到？重新寄送</button>
            </div>
          </form>
        )}

        <p className="text-center text-sm mt-4 text-fg-muted">
          已有帳號？<Link href="/login" className="text-accent hover:underline">登入</Link>
        </p>
      </div>
    </div>
  );
}
