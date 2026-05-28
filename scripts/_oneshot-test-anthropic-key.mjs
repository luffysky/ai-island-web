/**
 * 從 ai_api_keys 表抓 anthropic 加密 key、本機用 AI_KEY_SECRET 解密、
 * 直接打 Anthropic /v1/models（不花 token）驗 key 真假。
 * 不印 key 值、只印 HTTP status + 失敗 hint。
 */
import pg from "pg";
import { loadEnv, loadProviderKey } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

let plainKey;
try {
  plainKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}

console.log(`Key 解密成功、長度 ${plainKey.length} 字、prefix: ${plainKey.slice(0, 10)}...`);

if (!plainKey.startsWith("sk-ant-")) {
  console.warn("⚠️  Anthropic key 通常 sk-ant- 開頭、現在不是。可能貼錯 (e.g. 貼到 OpenAI key)");
}

// 打 anthropic /v1/models 驗 key（最便宜的端點）
const res = await fetch("https://api.anthropic.com/v1/models", {
  headers: {
    "x-api-key": plainKey,
    "anthropic-version": "2023-06-01",
  },
});
const body = await res.text();
console.log(`\nAnthropic /v1/models: HTTP ${res.status}`);
console.log("Body (first 300):", body.slice(0, 300));

if (res.status === 200) {
  console.log("\n✓ key 完全 OK、可以打。LINE bot 401 不是 key 問題、檢查 Zeabur env 是否真的有重啟 / cache。");
} else if (res.status === 401) {
  console.log("\n✗ key 真的 invalid。可能：");
  console.log("  1. /admin/ai-keys 貼的 key 已被 Anthropic revoke / 過期");
  console.log("  2. 貼的時候多了空白、複製不完整、或貼到 OpenAI/Google key");
  console.log("  3. Anthropic console 看是不是 active");
  console.log("  → 去 https://console.anthropic.com/settings/keys 重新建一支、整段複製貼到 /admin/ai-keys");
}

await c.end();
