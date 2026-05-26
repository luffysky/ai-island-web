"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Mail, Lock } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";

const AUTH_ERROR_LABELS: Record<string, string> = {
  incomplete_token: "LINE 登入回傳的 session 不完整，請重新登入一次。",
  line_admin: "LINE 登入後台連線失敗，請檢查 Supabase service role 設定。",
  line_create_user: "LINE 登入建立會員失敗，請稍後再試或改用 Email 登入。",
  line_not_configured: "LINE 登入尚未設定完成，請檢查 LINE channel 環境變數。",
  line_profile: "LINE 登入取得個人資料失敗，請重新授權一次。",
  line_exception: "LINE 登入流程發生例外，請稍後再試。",
  line_token: "LINE token 交換失敗，請檢查 LINE Callback URL 是否和目前網域完全一致。",
  no_code: "LINE 沒有回傳授權碼，請重新登入一次。",
  no_token: "LINE 登入沒有取得 access token，請重新登入一次。",
  session_failed: "登入成功但寫入網站 session 失敗，請重新登入一次。",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) {
      setError(AUTH_ERROR_LABELS[code] ?? `登入失敗：${code}`);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else {
      const res = await fetch("/api/auth/ensure-profile", {
      credentials: "include", method: "POST" });
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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center px-4 py-12">
      {/* 背景 */}
      <BackgroundBeams className="opacity-50" />
      <SparklesParticles count={12} />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-2/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-3">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-2/20 rounded-full blur-2xl" />
            <div className="relative text-6xl">🏝️</div>
            <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
            登入
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent ml-2">AI 島</span>
          </h1>
          <p className="text-sm text-fg-muted">繼續你的冒險之旅 ⚔️</p>
        </motion.div>

        {/* 卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl shadow-accent/5"
        >
          {/* OAuth */}
          <div className="space-y-2 mb-5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={googleLogin}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-black hover:shadow-lg hover:shadow-white/10 flex items-center justify-center gap-2 font-medium transition"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11.3 0 20.5-9.2 20.5-20.5 0-1.4-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.1 4.5 9.3 9 6.3 14.1z"/>
                <path fill="#4CAF50" d="M24 45.5c5.4 0 10.3-2 14-5.4l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.2 0-9.6-3.3-11.3-8l-6.6 5.1c3 6 9.3 11.4 17.9 11.4z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.5c-.5.4 7-5.1 7-14.6 0-1.4-.1-2.7-.6-4z"/>
              </svg>
              用 Google 登入
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={lineLogin}
              className="w-full px-4 py-2.5 rounded-xl bg-[#06C755] text-white hover:shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 font-medium transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 5.671 2 10.184c0 4.046 3.547 7.434 8.342 8.077.324.07.766.214.878.491.1.252.066.647.032.901l-.142.852c-.044.252-.2.985.864.537 1.064-.448 5.736-3.378 7.825-5.785C20.99 13.591 22 11.957 22 10.184 22 5.671 17.523 2 12 2zM7.992 12.572H6.001c-.282 0-.51-.229-.51-.51V8.084c0-.282.228-.51.51-.51.281 0 .51.228.51.51v3.468h1.481c.281 0 .51.229.51.51 0 .282-.229.51-.51.51zm2.001-.51c0 .282-.229.51-.51.51-.282 0-.51-.228-.51-.51V8.084c0-.282.228-.51.51-.51.281 0 .51.228.51.51v3.978zm4.665 0c0 .22-.14.413-.347.486a.51.51 0 0 1-.564-.181l-2.038-2.776v2.471c0 .282-.229.51-.51.51-.282 0-.51-.228-.51-.51V8.084c0-.22.14-.414.347-.486a.51.51 0 0 1 .564.18l2.039 2.778V8.084c0-.282.228-.51.51-.51.281 0 .509.228.509.51v3.978zm3.215-2.499c.282 0 .51.229.51.51 0 .282-.228.51-.51.51h-1.481v.971h1.481c.282 0 .51.229.51.51 0 .282-.228.51-.51.51h-1.991c-.282 0-.51-.228-.51-.51V8.084c0-.282.228-.51.51-.51h1.991c.282 0 .51.228.51.51 0 .282-.228.51-.51.51h-1.481v.971h1.481z"/>
              </svg>
              用 LINE 登入
            </motion.button>
          </div>

          {/* 分隔線 */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg-card px-3 text-fg-muted">或用 email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-9 pr-3 py-2.5 bg-bg-elevated border border-border rounded-xl focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密碼"
                className="w-full pl-9 pr-3 py-2.5 bg-bg-elevated border border-border rounded-xl focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
              />
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-accent to-accent-2 text-black rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
            >
              {loading ? "登入中..." : (<>
                登入 <ArrowRight size={14} />
              </>)}
            </motion.button>
          </form>

          {/* 註冊連結 */}
          <p className="text-center text-sm mt-5 text-fg-muted">
            還沒帳號？
            <Link href="/signup" className="text-accent hover:underline ml-1 font-medium">立即註冊</Link>
          </p>

          {/* 法律 */}
          <p className="text-center text-[10px] mt-5 pt-4 border-t border-border text-fg-muted leading-relaxed">
            登入即表示您同意 AI 島的
            <Link href="/terms" className="text-accent hover:underline mx-1">使用條款</Link>
            <Link href="/privacy" className="text-accent hover:underline mx-1">隱私權政策</Link>
            <Link href="/cookies" className="text-accent hover:underline mx-1">Cookie 政策</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
