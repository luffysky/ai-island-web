"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * /auth/callback 處理：
 *   - PKCE code (?code=...)            → exchangeCodeForSession
 *   - Magic link hash (#token_hash=…)  → verifyOtp
 *   - Implicit access_token (#access_token=…)
 *                                       → setSession
 *
 * 不論成功失敗、永遠 redirect、不停在這頁。
 */
export function CallbackHashHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let done = false;
    const supabase = createSupabaseBrowser();

    const go = (url: string) => {
      if (done) return;
      done = true;
      window.location.replace(url);
    };

    const failGeneric = (reason: string, raw?: unknown) => {
      console.error("[Callback] failed:", reason, raw);
      go(`/login?error=${encodeURIComponent(reason)}`);
    };

    const succeed = async () => {
      try {
        const res = await fetch("/api/auth/ensure-profile", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as any));
          return failGeneric(body.error || "ensure_profile_failed", body);
        }
      } catch (e) {
        console.error("[Callback] ensure-profile threw:", e);
        // 仍視為登入成功、profile 之後可補
      }
      go("/");
    };

    // 15 秒總時限。超時前先檢查 session 是否其實已建立、有就直接放行；
    // 沒有才算失敗。處理 exchangeCodeForSession 真的跑很慢但 session
    // 已寫入 cookie 的情況（之前 8s timeout 會在這時誤判）。
    const timeout = setTimeout(async () => {
      if (done) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          console.warn("[Callback] exchange slow but session present, proceeding");
          return succeed();
        }
      } catch {}
      failGeneric("callback_timeout");
    }, 15000);

    (async () => {
      try {
        const callbackError = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const otpType = searchParams.get("type") || "magiclink";

        if (callbackError) {
          return failGeneric(callbackError, errorDescription);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) return failGeneric("exchange_failed", error);
          return succeed();
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any,
          });
          if (error) return failGeneric("verify_failed", error);
          return succeed();
        }

        const hash = window.location.hash;
        if (hash && hash.includes("access_token=")) {
          const params = new URLSearchParams(
            hash.startsWith("#") ? hash.slice(1) : hash
          );
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (!access_token || !refresh_token) {
            return failGeneric("incomplete_token");
          }
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) return failGeneric("set_session_failed", error);
          return succeed();
        }

        return failGeneric("no_token");
      } catch (e: any) {
        return failGeneric("callback_exception", e?.message ?? String(e));
      }
    })();

    return () => clearTimeout(timeout);
  }, [searchParams]);

  return null;
}
