// 記錄 CLI 生成腳本的 Claude/AI 用量 → ai_model_usage（後台 usage 頁看得到）。
// 解決「CLI 直打 Anthropic、後台零記錄」的黑洞。model_name 標 "cli:<model>" 以區分網站用量。
// 兩種用法：
//   1) import { logCliUsage } from "./_lib/log-cli-usage.mjs"; await logCliUsage(pgClient, {model, inputTokens, outputTokens})
//   2) node scripts/_lib/log-cli-usage.mjs <model> <inTokens> <outTokens> [provider]   ← 給 Python 腳本 shell 進來
// 一律 best-effort：記錄失敗絕不影響生成流程。
import pg from "pg";
import { loadEnv } from "./ai-crypto.mjs";

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 用已連線的 pg client 記一筆 CLI 用量。pgClient 可省略（會自開自關）。 */
export async function logCliUsage(pgClient, { model, provider = "anthropic", inputTokens = 0, outputTokens = 0 } = {}) {
  if (!model) return;
  const tin = Number(inputTokens) || 0;
  const tout = Number(outputTokens) || 0;
  let ownClient = false;
  let c = pgClient;
  try {
    if (!c) {
      const env = loadEnv();
      if (!env.SUPABASE_DB_URL) return; // 沒 DB 連線就放棄（best-effort）
      c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
      await c.connect();
      ownClient = true;
    }
    // 從 ai_models 取費率（USD / 1M tokens）
    let inRate = 0, outRate = 0;
    try {
      const r = await c.query(
        "SELECT cost_input_per_1m, cost_output_per_1m FROM public.ai_models WHERE provider=$1 AND model_name=$2 LIMIT 1",
        [provider, model],
      );
      if (r.rows[0]) {
        inRate = Number(r.rows[0].cost_input_per_1m) || 0;
        outRate = Number(r.rows[0].cost_output_per_1m) || 0;
      }
    } catch { /* 取不到費率就以 0 計、至少留 token 數 */ }
    const cost = (tin / 1e6) * inRate + (tout / 1e6) * outRate;

    await c.query("SELECT public.inc_model_usage($1,$2,$3,$4,$5,$6)", [
      monthKey(), provider, `cli:${model}`, tin, tout, cost,
    ]);
  } catch (e) {
    if (process.env.CLI_USAGE_DEBUG) console.error("[log-cli-usage] 略過:", e?.message);
  } finally {
    if (ownClient && c) { try { await c.end(); } catch { /* ignore */ } }
  }
}

// 直接執行（Python 透過 subprocess 呼叫）
const isDirect = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("log-cli-usage.mjs");
if (isDirect) {
  const [model, tin, tout, provider] = process.argv.slice(2);
  await logCliUsage(null, { model, inputTokens: tin, outputTokens: tout, provider: provider || "anthropic" });
}
