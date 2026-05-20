import { Suspense } from "react";
import { CallbackHashHandler } from "./CallbackHashHandler";

export const dynamic = "force-dynamic";

/**
 * Auth Callback - 雙模式
 *
 * 1. PKCE flow: URL 是 ?code=xxx → client 換 session 並寫入 cookie
 * 2. Implicit flow: URL 是 #access_token=xxx → client component 抓 hash、setSession
 *
 * 不管哪種、最後都到 / (首頁)、已登入
 */
export default function CallbackPage() {
  return (
    <div className="max-w-md mx-auto p-8 mt-16 text-center">
      <h1 className="text-2xl font-bold mb-4">登入處理中...</h1>
      <p className="text-[var(--color-fg-muted)] mb-4">請稍候</p>
      <Suspense>
        <CallbackHashHandler />
      </Suspense>
    </div>
  );
}
