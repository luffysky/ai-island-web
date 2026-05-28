/** 用同一支 key、實際打 Claude Haiku 4.5 + Sonnet 4.6 messages API、看哪個會 401 */
import { readFileSync } from "node:fs";
import pg from "pg";
import crypto from "crypto";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

function getKey() {
  return crypto.createHash("sha256").update(env.AI_KEY_SECRET).digest();
}
function decryptKey(encrypted) {
  const [iv, tag, data] = encrypted.split(":").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const r = await c.query(`SELECT api_key_encrypted FROM ai_api_keys WHERE provider='anthropic'`);
const apiKey = decryptKey(r.rows[0].api_key_encrypted);
await c.end();

const models = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"];

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
