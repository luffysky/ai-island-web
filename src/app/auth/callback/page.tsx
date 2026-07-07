import { Suspense } from "react";
import { CallbackHashHandler } from "./CallbackHashHandler";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

/**
 * Auth Callback — silent。
 * 不論成功失敗、CallbackHashHandler 都會 window.location.replace。
 * 短暫顯示時給一張卡（loader + 文案 + fallback 連結）。
 */
export default async function CallbackPage() {
  const t = await getTranslations("authpages");
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Suspense>
        <CallbackHashHandler />
      </Suspense>
      <div className="text-center max-w-sm">
        <div className="inline-block relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-bg-card" />
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        </div>
        <h1 className="text-lg font-bold mb-1">{t("callbackHeading")}</h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          {t("callbackDesc")}
        </p>
        <div className="mt-6 text-xs text-fg-muted">
          {t("callbackTooLong")}
          <Link href="/login" className="text-accent hover:underline ml-1">{t("backToLogin")}</Link>
        </div>
      </div>
    </div>
  );
}
