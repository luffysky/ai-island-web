"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * 專門在 /auth/callback 頁處理 hash-based OAuth callback
 * 此時 hash 還在 URL 上、沒被任何東西消費
 */
export function CallbackHashHandler() {
  const [status, setStatus] = useState<string>("讀取 token...");

  useEffect(() => {
    (async () => {
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

      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });

      if (error) {
        console.error("[Callback] setSession FAILED:", error);
        setStatus("登入失敗：" + error.message);
        return;
      }

      console.log("[Callback] setSession OK, user =", data.user?.email);
      setStatus("登入成功、跳轉中...");

      // 確保 profile 存在（client-side 寫）
      if (data.user) {
        try {
          const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!existing) {
            const username = (data.user.email?.split("@")[0] ?? `user${Date.now()}`).slice(0, 30);
            await supabase.from("profiles").insert({
              id: data.user.id,
              username,
              display_name: username,
              avatar_url: data.user.user_metadata?.avatar_url ?? null,
              xp: 0,
              z_coin: 100,
              hearts: 5,
            });
            console.log("[Callback] profile created");
          }
        } catch (e) {
          console.error("[Callback] profile check failed:", e);
        }
      }

      // 等 200ms 確保 cookie 真的寫到 browser、再跳
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    })();
  }, []);

  return (
    <div className="text-sm text-[var(--color-fg-muted)]">
      狀態：{status}
      <div className="mt-4 text-xs">F12 看 console 有詳細 log</div>
    </div>
  );
}
