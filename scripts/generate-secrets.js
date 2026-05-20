#!/usr/bin/env node
/**
 * AI 島 環境變數產生器
 *
 * 用法：node scripts/generate-secrets.js
 * 或：npm run gen:secrets
 *
 * 會產生：
 *   - AI_KEY_SECRET   (32 字元、用於 API key 加密)
 *   - CRON_SECRET     (32 字元、用於 GA4 sync 認證)
 *   - ADMIN_SLUG      (12 字元、後台路徑)
 */

const crypto = require("crypto");

// 產生 hex 字串（32 chars = 16 bytes）
function hex(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

// 產生 URL-safe slug（不含 = / +）
function slug(bytes = 9) {
  return crypto.randomBytes(bytes).toString("base64url");
}

const secrets = {
  AI_KEY_SECRET: hex(16),         // 32 chars
  CRON_SECRET: hex(16),            // 32 chars
  ADMIN_SLUG: slug(9),             // ~12 chars URL-safe
  NEXT_PUBLIC_ADMIN_SLUG: null,    // 跟 ADMIN_SLUG 一樣
};
secrets.NEXT_PUBLIC_ADMIN_SLUG = secrets.ADMIN_SLUG;

console.log("\n=== AI 島 環境變數（複製到 Zeabur） ===\n");

for (const [key, value] of Object.entries(secrets)) {
  console.log(`${key}=${value}`);
}

console.log("\n=== 說明 ===");
console.log("• AI_KEY_SECRET：加密 API key 到資料庫用、變了會讓既有 key 失效");
console.log("• CRON_SECRET：GA4 自動同步認證用");
console.log("• ADMIN_SLUG：後台路徑、後台網址會變成 /<slug>/admin");
console.log("• NEXT_PUBLIC_ADMIN_SLUG：跟 ADMIN_SLUG 同值、給前端用");
console.log("\n⚠️ 這些 secret 一旦產生請存好、不要再跑一次（會洗掉舊的）");
console.log("⚠️ 不要 commit 到 git、只放在 Zeabur 後台\n");
