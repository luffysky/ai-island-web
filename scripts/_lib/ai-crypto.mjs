/**
 * 共用 helper：scripts / oneshot 都從這抓 plain API key + active model name
 * 不要在每個 oneshot 都複製貼 decrypt 邏輯 / hardcode model name
 *
 * 用法：
 *   import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";
 *   const env = loadEnv();
 *   const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
 *   await c.connect();
 *   const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
 *   const model = await pickModelName(c, "anthropic");
 */
import { readFileSync } from "node:fs";
import crypto from "crypto";

/** 從 .env.local 讀 KEY=VALUE 形式設定 */
export function loadEnv(path = ".env.local") {
  return Object.fromEntries(
    readFileSync(path, "utf8").split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
  );
}

/** 跟 src/lib/ai-crypto.ts 邏輯一致（aes-256-gcm + sha256(secret) 衍生 key） */
export function decryptKey(encrypted, aiKeySecret) {
  if (!aiKeySecret || aiKeySecret.length < 32) {
    throw new Error("AI_KEY_SECRET 缺或不足 32 字");
  }
  const key = crypto.createHash("sha256").update(aiKeySecret).digest();
  const [iv, tag, data] = encrypted.split(":").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

/**
 * 從 ai_api_keys 表抓 enabled provider 的 plain key
 * @param {import("pg").Client} pgClient
 * @param {string} provider
 * @param {string} aiKeySecret
 * @returns {Promise<string>} plain API key
 */
export async function loadProviderKey(pgClient, provider, aiKeySecret) {
  const r = await pgClient.query(
    `SELECT api_key_encrypted, enabled FROM ai_api_keys WHERE provider=$1 LIMIT 1`,
    [provider]
  );
  if (r.rowCount === 0) throw new Error(`ai_api_keys 沒 ${provider} row`);
  if (!r.rows[0].enabled) throw new Error(`ai_api_keys ${provider} disabled`);
  try {
    return decryptKey(r.rows[0].api_key_encrypted, aiKeySecret);
  } catch (e) {
    throw new Error(`decrypt ${provider} key 失敗（AI_KEY_SECRET 跟 DB 加密時用的不一致？）：${e.message}`);
  }
}

/**
 * 從 ai_models 表抓 active provider 第一個 model name
 * 優先抓 ai_usage_models 內某 usage_key 指定的（如果有設）
 */
export async function pickModelName(pgClient, provider, usageKey = null) {
  if (usageKey) {
    const r = await pgClient.query(
      `SELECT model_name FROM ai_usage_models WHERE usage_key=$1 AND enabled=true LIMIT 1`,
      [usageKey]
    );
    if (r.rowCount > 0) return r.rows[0].model_name;
  }
  const r2 = await pgClient.query(
    `SELECT model_name FROM ai_models WHERE provider=$1 AND is_active=true ORDER BY id LIMIT 1`,
    [provider]
  );
  if (r2.rowCount === 0) throw new Error(`ai_models 沒 active ${provider} model`);
  return r2.rows[0].model_name;
}
