"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [over13, setOver13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createSupabaseBrowser();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (username.length < 3) { setError("使用者名稱至少 3 個字"); setLoading(false); return; }
    if (password.length < 8) { setError("密碼至少 8 個字"); setLoading(false); return; }
    if (!agreed) { setError("請同意服務條款與隱私權政策"); setLoading(false); return; }
    if (!over13) { setError("本平台限 13 歲以上使用者"); setLoading(false); return; }

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          username,
          agreed_terms_at: new Date().toISOString(),
        }
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }

    if (data.session) {
      const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "註冊成功，但建立會員資料失敗");
        setLoading(false);
        return;
      }
    }

    window.location.href = "/";
    setLoading(false);
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
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-fg-muted">使用者名稱（3-30 字、之後可改）</label>
            <input type="text" required minLength={3} maxLength={30} value={username} onChange={e => setUsername(e.target.value)} placeholder="luffysky" className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
          </div>
          <div>
            <label className="text-xs text-fg-muted">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
          </div>
          <div>
            <label className="text-xs text-fg-muted">密碼（至少 8 字）</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none" />
          </div>

          {/* 法規必要的同意 checkbox */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={over13}
                onChange={(e) => setOver13(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>我已年滿 13 歲（未成年者已獲監護人同意）</span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <span>
                我已閱讀並同意{" "}
                <Link href="/terms" target="_blank" className="text-accent underline">使用條款</Link>、
                {" "}
                <Link href="/privacy" target="_blank" className="text-accent underline">隱私權政策</Link>、
                以及{" "}
                <Link href="/cookies" target="_blank" className="text-accent underline">Cookie 政策</Link>
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
            {loading ? "建立帳號中..." : "🚀 開始冒險"}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-fg-muted">
          已有帳號？<Link href="/login" className="text-accent hover:underline">登入</Link>
        </p>
      </div>
    </div>
  );
}
