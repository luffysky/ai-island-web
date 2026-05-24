"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { devLog } from "@/lib/dev-log";

/**
 * /auth/callback 處理：
 *
 *   - PKCE code (?code=...)            → SDK auto via detectSessionInUrl
 *   - Implicit access_token (#access_token=…)
 *                                      → SDK auto via detectSessionInUrl
 *   - Magic link hash (?token_hash=…)  → 手動 verifyOtp（SDK 不自動）
 *
 * 不論成功失敗、永遠 redirect、不停在這頁。
 *
 * 重要：對 ?code 不要再呼叫 exchangeCodeForSession，
 * 因為 createBrowserClient 預設 detectSessionInUrl=true、
 * client 一建立就會自動換、再 manual 呼叫會跟 SDK 撞 code、
 * 第二次會永遠 hang（同一 code 只能用一次）。
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
      devLog.error("[Callback] failed:", reason, raw);
      go(`/login?error=${encodeURIComponent(reason)}`);
    };

    const succeed = async () => {
      if (done) return;
      done = true;
      // ensure-profile 永不擋登入：最多等 2.5s、失敗 / 慢都直接進首頁。
      // profile 沒補到也沒關係、AuthProvider 之後會 load、首次 page query
      // 沒命中就重 load 一次。
      await Promise.race([
        fetch("/api/auth/ensure-profile", { method: "POST" }).catch((e) => {
          devLog.warn("[Callback] ensure-profile fail:", e);
          return null;
        }),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
      window.location.replace("/");
    };

    // 1. Provider 端帶錯誤就直接放棄
    const callbackError = searchParams.get("error");
    if (callbackError) {
      failGeneric(callbackError, searchParams.get("error_description"));
      return;
    }

    // 2. Magic link / OTP token_hash 流程要手動 verify
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash) {
      const otpType = (searchParams.get("type") || "magiclink") as any;
      (async () => {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (error) return failGeneric("verify_failed", error);
        await succeed();
      })();
      return;
    }

    // 3. PKCE / Implicit → 等 SDK 自己換完、靠 onAuthStateChange + 首次 poll 捕捉
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (done) return;
        if (event === "SIGNED_IN" && session) {
          succeed();
        }
      }
    );

    // 首次 mount 時 SDK 可能已經換完了、抓一次 getUser 確認
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!done && data.user) succeed();
      })
      .catch(() => {});

    // 20 秒總時限。行動網路要留 buffer。前先再檢查一次 session、避免 SDK 慢但成功的誤判
    const timeout = setTimeout(async () => {
      if (done) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          devLog.warn("[Callback] timeout but session present, proceed");
          return succeed();
        }
      } catch {}
      failGeneric("callback_timeout");
    }, 20000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  return null;
}
