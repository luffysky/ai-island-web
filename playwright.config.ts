import { defineConfig, devices } from "@playwright/test";

// E2E（瀏覽器點擊流程）：預設打「正式機」線上站、最真實也最簡單。
//   E2E_BASE_URL=http://localhost:3000 npm run test:e2e   # 想打本機自己開的 server
//
// ⚠️ 這跟單元測試（vitest, src/**/*.test.ts）是兩套、互不影響。E2E 只放在 e2e/。
// 刻意「不」設 webServer（不在測試前 build）：預設就是對線上跑、CI 也一樣。

const baseURL = process.env.E2E_BASE_URL || "https://ai-island-web.snowrealm.pet";

export default defineConfig({
  testDir: "./e2e",
  // 每個 test 30s、每個 expect 斷言 10s（線上站偶爾慢、給一點餘裕）
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // 線上站偶發抖動 → 失敗自動重試一次（第二次才留 trace）
  retries: 1,
  // 對線上站跑、平行度別開太高、免得被當成攻擊
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // 手機/桌面共用：截圖只在失敗時留、影片不留（省空間）
    screenshot: "only-on-failure",
    video: "off",
    // 帶個好認的 UA、方便在 server log 分辨是 E2E 流量
    userAgent: "ai-island-e2e Playwright",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // 也用 Pixel 5 跑一輪、順便涵蓋 RWD（rwd.spec 也會被這個 project 跑到）
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
