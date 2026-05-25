import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";

/**
 * AI key 真實解密健檢 (public、不洩漏 key 內容、只 mask)
 *
 * AI_KEY_SECRET 改過 / Zeabur env 換新版本後、舊的 encrypted key 解不回來、
 * 但前台 UI 不會察覺 (顯示 "已啟用")、askAI 會 silent return null、bot 完全不回。
 *
 * 這個 endpoint 直接撈 ai_api_keys 跟 ai_models、實際呼叫 decryptKey 看真實狀況。
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      AI_KEY_SECRET: { set: !!process.env.AI_KEY_SECRET, length: process.env.AI_KEY_SECRET?.length ?? 0 },
    },
    models: [] as any[],
    keys: [] as any[],
    usage_models: [] as any[],
    verdict: "",
  };

  const admin = createSupabaseAdmin();

  // active models
  const { data: models, error: modelsErr } = await admin
    .from("ai_models")
    .select("provider, model_name, is_active, display_name")
    .eq("is_active", true);

  if (modelsErr) {
    result.verdict = `❌ ai_models 表查詢失敗：${modelsErr.message}`;
    return NextResponse.json(result);
  }
  result.models = (models as any[]) ?? [];

  if (result.models.length === 0) {
    result.verdict = "❌ ai_models 沒任何 is_active=true、AI 必 return null、去 /admin/ai/models 啟用 ≥1 個";
    return NextResponse.json(result);
  }

  // usage-models
  const { data: usage } = await admin.from("ai_usage_models").select("usage_key, model_name, enabled");
  result.usage_models = (usage as any[]) ?? [];

  // 對每個 active model 的 provider 查 key + 試解密
  const providers = Array.from(new Set(result.models.map((m: any) => m.provider)));
  let anyOk = false;
  for (const p of providers) {
    const { data: row } = await admin
      .from("ai_api_keys")
      .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd, updated_at")
      .eq("provider", p)
      .maybeSingle();

    const entry: any = { provider: p, has_row: !!row, enabled: (row as any)?.enabled };
    if (!row) {
      entry.status = "fail";
      entry.detail = `❌ ai_api_keys 表沒 ${p} 紀錄、askAI 必 return null`;
    } else if (!(row as any).enabled) {
      entry.status = "fail";
      entry.detail = `❌ ${p} 存在但 enabled=false、去 /admin/ai/models 開啟`;
    } else {
      try {
        const k = decryptKey((row as any).api_key_encrypted);
        entry.status = "ok";
        entry.key_prefix = k.slice(0, 6) + "***";
        entry.key_suffix = "***" + k.slice(-4);
        entry.key_length = k.length;
        entry.budget = `$${(row as any).used_this_month_usd ?? 0}/$${(row as any).monthly_budget_usd ?? "?"}`;
        entry.updated_at = (row as any).updated_at;
        entry.detail = `✅ 解密成功 ${entry.key_prefix}...${entry.key_suffix}`;
        anyOk = true;
      } catch (e: any) {
        entry.status = "fail";
        entry.detail = `❌ 解密失敗：${e?.message ?? "unknown"} — AI_KEY_SECRET 換過 / encrypted 內容壞了`;
        entry.fix = `去 /admin/ai/models → ${p} → 重新貼一次 API key (用現在的 AI_KEY_SECRET 重新加密)`;
      }
    }
    result.keys.push(entry);
  }

  if (anyOk) {
    result.verdict = "✅ 有可用 model + 可解密 key、AI 應該能回。如果 bot 還沒回 → 看別段（reply token 過期 / Auto-reply 偷 token）";
  } else {
    result.verdict = "❌ 所有 active model 對應的 ai_api_keys 都解不開、AI 必 return null。最可能：AI_KEY_SECRET 改過導致舊 encrypted 失效。修法：去 /admin/ai/models 重新貼一次各 provider 的 API key。";
  }

  return NextResponse.json(result);
}
