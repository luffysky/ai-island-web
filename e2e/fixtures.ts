import { test as base, expect } from "@playwright/test";

// 全站 E2E 一律固定「繁體中文」locale。
//
// 為什麼：本站 i18n 沒 cookie 時會「依 IP 地區」決定預設語言（TW→zh、其他→en，見 src/i18n/request.ts）。
// GitHub Actions 的 runner 在美國 → 被判成英文 → 所有斷言中文字（「所有章節」「最難」「免費」「討論區」…）
// 的測試全部 not found 而失敗（這不是網站壞、是測試沒固定語言）。
// LOCALE cookie 優先於地區判斷，故在每個 context 先種 LOCALE=zh，讓測試不受 runner 所在地影響。
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    let host = "ai-island-web.snowrealm.pet";
    try { if (baseURL) host = new URL(baseURL).hostname; } catch { /* 用預設 host */ }
    await context.addCookies([{ name: "LOCALE", value: "zh", domain: host, path: "/" }]);
    await use(context);
  },
});

export { expect };
