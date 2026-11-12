/**
 * Sentry 共用設定（前端 / Node / Edge 三個 runtime 都用）。
 * 沒設 NEXT_PUBLIC_SENTRY_DSN 就完全不啟用——本機開發、預覽站不設就不會送任何東西。
 * 隱私：不送 IP/cookie（sendDefaultPii=false）、不開 Session Replay。
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN && process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
  sendDefaultPii: false,
  // 錯誤全收；效能追蹤只抽 5%（免費額度有限）
  sampleRate: 1.0,
  tracesSampleRate: 0.05,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "AbortError",
    // 部署後舊分頁載入新 chunk 失敗——重新整理就好，不是 bug
    "ChunkLoadError",
    /Loading chunk [\d]+ failed/,
  ],
  denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-extension:\/\//],
};
