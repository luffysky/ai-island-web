import { Suspense } from "react";
import { CallbackHashHandler } from "./CallbackHashHandler";

export const dynamic = "force-dynamic";

/**
 * Auth Callback — silent。
 * 不論成功失敗、CallbackHashHandler 都會 window.location.replace。
 * 短暫顯示時只給一行最小提示。
 */
export default function CallbackPage() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-fg-muted">
      <Suspense>
        <CallbackHashHandler />
      </Suspense>
      登入中…
    </div>
  );
}
