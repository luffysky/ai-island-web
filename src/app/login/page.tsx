"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createSupabaseBrowser();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "登入成功，但建立會員資料失敗");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    }
    setLoading(false);
  };

  const googleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const lineLogin = () => {
    // LINE Login via custom OAuth flow
    // 需要在 LINE Developer Console 建立 channel
    // 設好 NEXT_PUBLIC_LINE_CHANNEL_ID + redirect URI
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!channelId) {
      setError("LINE 登入尚未設定、請聯絡管理員");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback`);
    const state = crypto.randomUUID();
    sessionStorage.setItem("line_oauth_state", state);
    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid%20email`;
    window.location.href = url;
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🏝️</div>
        <h1 className="text-3xl font-bold mb-2">登入 AI 島</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">繼續你的冒險之旅</p>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="space-y-2 mb-4">
          <button
            onClick={googleLogin}
            className="w-full px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-2 font-medium transition"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11.3 0 20.5-9.2 20.5-20.5 0-1.4-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.1 4.5 9.3 9 6.3 14.1z"/>
              <path fill="#4CAF50" d="M24 45.5c5.4 0 10.3-2 14-5.4l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-8l-6.6 5.1c3 6 9.3 11.4 17.9 11.4z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5c-.5.4 7-5.1 7-14.6 0-1.4-.1-2.7-.6-4z"/>
            </svg>
            用 Google 登入
          </button>
          <button
            onClick={lineLogin}
            className="w-full px-4 py-2 rounded-lg bg-[#06C755] text-white hover:bg-[#05a847] flex items-center justify-center gap-2 font-medium transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 5.671 2 10.184c0 4.046 3.547 7.434 8.342 8.077.324.07.766.214.878.491.1.252.066.647.032.901l-.142.852c-.044.252-.2.985.864.537 1.064-.448 5.736-3.378 7.825-5.785C20.99 13.591 22 11.957 22 10.184 22 5.671 17.523 2 12 2zM7.992 12.572H6.001c-.282 0-.51-.229-.51-.51V8.084c0-.282.228-.51.51-.51.281 0 .51.228.51.51v3.468h1.481c.281 0 .51.229.51.51 0 .282-.229.51-.51.51zm2.001-.51c0 .282-.229.51-.51.51-.282 0-.51-.228-.51-.51V8.084c0-.282.228-.51.51-.51.281 0 .51.228.51.51v3.978zm4.665 0c0 .22-.14.413-.347.486a.51.51 0 0 1-.564-.181l-2.038-2.776v2.471c0 .282-.229.51-.51.51-.282 0-.51-.228-.51-.51V8.084c0-.22.14-.414.347-.486a.51.51 0 0 1 .564.18l2.039 2.778V8.084c0-.282.228-.51.51-.51.281 0 .509.228.509.51v3.978zm3.215-2.499c.282 0 .51.229.51.51 0 .282-.228.51-.51.51h-1.481v.971h1.481c.282 0 .51.229.51.51 0 .282-.228.51-.51.51h-1.991c-.282 0-.51-.228-.51-.51V8.084c0-.282.228-.51.51-.51h1.991c.282 0 .51.228.51.51 0 .282-.228.51-.51.51h-1.481v.971h1.481z"/>
            </svg>
            用 LINE 登入
          </button>
        </div>

        <div className="text-center text-xs text-[var(--color-fg-muted)] my-4">— 或 —</div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-accent)] outline-none" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="密碼" className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-accent)] outline-none" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-[var(--color-accent)] text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-[var(--color-fg-muted)]">
          還沒帳號？<Link href="/signup" className="text-[var(--color-accent)] hover:underline">立即註冊</Link>
        </p>

        <p className="text-center text-xs mt-4 pt-4 border-t border-[var(--color-border)] text-[var(--color-fg-muted)] leading-relaxed">
          登入即表示您同意 AI 島的
          {" "}
          <Link href="/terms" className="text-[var(--color-accent)] hover:underline">使用條款</Link>
          、
          <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">隱私權政策</Link>
          、
          <Link href="/cookies" className="text-[var(--color-accent)] hover:underline">Cookie 政策</Link>
        </p>
      </div>
    </div>
  );
}
