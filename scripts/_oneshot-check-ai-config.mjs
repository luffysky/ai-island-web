/**
 * 只回報 ai_models / ai_api_keys 配置狀態、不 echo secrets。
 * Usage: node scripts/_oneshot-check-ai-config.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

if (!env.SUPABASE_DB_URL) {
  console.error("✗ SUPABASE_DB_URL not in .env.local");
  process.exit(1);
}

const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

const out = {};

try {
  const models = await c.query(
    `SELECT id, provider, model_name, is_active FROM ai_models ORDER BY provider, id`
  );
  out.ai_models_count = models.rowCount;
  out.ai_models_active = models.rows.filter((r) => r.is_active).length;
  out.ai_models_all = models.rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    model_name: r.model_name,
    active: r.is_active,
  }));
} catch (e) {
  out.ai_models_error = e.message;
}

try {
  const keys = await c.query(
    `SELECT provider, enabled, monthly_budget_usd, used_this_month_usd,
            CASE WHEN api_key_encrypted IS NOT NULL THEN 'set' ELSE 'null' END AS key_state
       FROM ai_api_keys
      ORDER BY provider`
  );
  out.ai_api_keys = keys.rows.map((r) => ({
    provider: r.provider,
    enabled: r.enabled,
    budget_usd: Number(r.monthly_budget_usd),
    used_usd: Number(r.used_this_month_usd),
    remaining_usd: Number(r.monthly_budget_usd) - Number(r.used_this_month_usd),
    api_key: r.key_state,
  }));
} catch (e) {
  out.ai_api_keys_error = e.message;
}

try {
  const fnRes = await c.query(
    `SELECT proname FROM pg_proc WHERE proname IN ('consume_ai_quota','has_active_subscription','upsert_ai_usage','inc_system_key_usage')`
  );
  out.required_rpcs_present = fnRes.rows.map((r) => r.proname);
  out.required_rpcs_missing = ["consume_ai_quota", "has_active_subscription", "upsert_ai_usage", "inc_system_key_usage"]
    .filter((n) => !fnRes.rows.some((r) => r.proname === n));
} catch (e) {
  out.rpc_check_error = e.message;
}

console.log(JSON.stringify(out, null, 2));
await c.end();
