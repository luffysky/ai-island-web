import { Suspense } from "react";
import { CallbackHashHandler } from "./CallbackHashHandler";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Auth Callback — silent。
 * 不論成功失敗、CallbackHashHandler 都會 window.location.replace。
 * 短暫顯示時給一張卡（loader + 文案 + fallback 連結）。
 */
export default function CallbackPage() {
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
        <h1 className="text-lg font-bold mb-1">正在帶您回首頁…</h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          AI 島正在確認您的登入身份、通常只需要 1-2 秒。
        </p>
        <div className="mt-6 text-xs text-fg-muted">
          太久沒有反應？
          <Link href="/login" className="text-accent hover:underline ml-1">回登入頁</Link>
        </div>
      </div>
    </div>
  );
}
