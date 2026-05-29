import pg from "pg";
import { loadEnv } from "./_lib/ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const um = await c.query("SELECT usage_key, model_name, enabled FROM ai_usage_models ORDER BY usage_key");
console.log("=== ai_usage_models ===");
console.table(um.rows);

const am = await c.query("SELECT provider, model_name, is_active, is_default FROM ai_models ORDER BY provider, model_name");
console.log("\n=== ai_models ===");
console.table(am.rows);

const ak = await c.query("SELECT provider, enabled, length(api_key_encrypted) AS enc_len, updated_at FROM ai_api_keys ORDER BY provider");
console.log("\n=== ai_api_keys ===");
console.table(ak.rows);

await c.end();
