// 印出系統 AI 憑證給 Python 生成腳本用：輸出一行「MODEL\tKEY」。
// 用法（bash）：IFS=$'\t' read -r AI_MODEL AI_API_KEY < <(node scripts/_lib/print-ai-creds.mjs)
import pg from "pg";
import { loadEnv, loadProviderKey, pickModelName } from "./ai-crypto.mjs";

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const key = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = await pickModelName(c, "anthropic");
await c.end();
process.stdout.write(model + "\t" + key);
