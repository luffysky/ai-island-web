"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * 專門在 /auth/callback 頁處理 hash-based OAuth callback
 * 此時 hash 還在 URL 上、沒被任何東西消費
 */
export function CallbackHashHandler() {
  const [status, setStatus] = useState<string>("讀取 token...");
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowser();
      const callbackError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type") || "magiclink";

      if (callbackError) {
        setStatus(errorDescription || callbackError);
        setTimeout(() => (window.location.href = `/login?error=${encodeURIComponent(callbackError)}`), 2000);
        return;
      }

      if (code) {
        setStatus("交換登入 session...");
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[Callback] exchangeCodeForSession FAILED:", exchangeError);
          setStatus("登入失敗：" + exchangeError.message);
          return;
        }

        setStatus("建立會員資料...");
        const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus("建立會員資料失敗：" + (data.error || res.statusText));
          return;
        }

        setStatus("登入成功、跳轉中...");
        setTimeout(() => {
          window.location.href = "/";
        }, 300);
        return;
      }

      if (tokenHash) {
        setStatus("驗證登入 token...");
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as any,
        });

        if (verifyError) {
          console.error("[Callback] verifyOtp FAILED:", verifyError);
          setStatus("登入失敗：" + verifyError.message);
          setTimeout(() => (window.location.href = "/login?error=session_failed"), 2000);
          return;
        }

        setStatus("建立會員資料...");
        const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus("建立會員資料失敗：" + (data.error || res.statusText));
          return;
        }

        setStatus("登入成功、跳轉中...");
        setTimeout(() => {
          window.location.href = "/";
        }, 300);
        return;
      }

      const hash = window.location.hash;
      console.log("[Callback] hash =", hash.slice(0, 80));

      if (!hash || !hash.includes("access_token=")) {
        setStatus("沒收到 token、重新登入");
        setTimeout(() => (window.location.href = "/login?error=no_token"), 2000);
        return;
      }

      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setStatus("Token 不完整");
        setTimeout(() => (window.location.href = "/login?error=incomplete_token"), 2000);
        return;
      }

      setStatus("寫入 session...");
      console.log("[Callback] calling setSession");

      const { data, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });

      if (sessionError) {
        console.error("[Callback] setSession FAILED:", sessionError);
        setStatus("登入失敗：" + sessionError.message);
        return;
      }

      console.log("[Callback] setSession OK, user =", data.user?.email);
      setStatus("登入成功、跳轉中...");

      // 確保 profile 存在（server-side service role 寫，避免 profiles RLS 擋 insert）
      if (data.user) {
        const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("[Callback] ensure profile failed:", body);
          setStatus("建立會員資料失敗：" + (body.error || res.statusText));
          return;
        }
      }

      // 等 200ms 確保 cookie 真的寫到 browser、再跳
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    })();
  }, [searchParams]);

  return (
    <div className="text-sm text-[var(--color-fg-muted)]">
      狀態：{status}
      <div className="mt-4 text-xs">F12 看 console 有詳細 log</div>
    </div>
  );
}
