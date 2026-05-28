/** 用同一支 key、實際打 Claude Haiku 4.5 + Sonnet 4.6 messages API、看哪個會 401 */
import pg from "pg";
import { loadEnv, loadProviderKey } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);

// 從 DB 抓 active anthropic models、不寫死
const mr = await c.query(`SELECT model_name FROM ai_models WHERE provider='anthropic' AND is_active=true ORDER BY model_name`);
const models = mr.rows.map((row) => row.model_name);
await c.end();
console.log(`找到 ${models.length} 個 active anthropic model：${models.join(", ")}\n`);

for (const model of models) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 10,
      messages: [{ role: "user", content: "say hi in one word" }],
    }),
  });
  const body = await res.text();
  console.log(`\n== ${model} ==`);
  console.log(`  HTTP ${res.status}`);
  console.log(`  Body first 400: ${body.slice(0, 400)}`);
}
