import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { resolveByModelName } from "@/lib/resolve-usage-ai";
import { callAI } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// 模型下架偵測：provider 停用某模型時的錯誤特徵（如 Google 停 gemini-2.5-flash：404 not found）。
const DEAD_RE = /\b404\b|not[ _-]?found|no longer available|does not exist|deprecated|decommission|invalid[ _-]?model|unknown[ _-]?model|model_not_found/i;

/**
 * AI 模型健康檢查 — 定期測每個 active 模型，被 provider 下架的自動停用（避免像 gemini-2.5-flash 404 一直炸）。
 * 觸發：GET /api/cron/model-health（Authorization: Bearer $CRON_SECRET）；?dry=1 只報告不停用。
 * 判定：對每個 active 模型送 1 token 測試呼叫；404/not-found/deprecated → 停用；暫時性錯誤(429/5xx)不動。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("id, model_name, provider").eq("is_active", true);

  const alive: string[] = [];
  const dead: { model: string; error: string }[] = [];
  const skipped: string[] = [];

  for (const m of models ?? []) {
    const resolved = await resolveByModelName(m.model_name).catch(() => null);
    if (!resolved) { skipped.push(`${m.model_name}（無 key）`); continue; }
    try {
      await callAI({ provider: resolved.provider, model: resolved.model, apiKey: resolved.apiKey, messages: [{ role: "user", content: "hi" }], maxTokens: 1, noFallback: true });
      alive.push(m.model_name);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (DEAD_RE.test(msg)) {
        dead.push({ model: m.model_name, error: msg.slice(0, 200) });
        if (!dryRun) await admin.from("ai_models").update({ is_active: false }).eq("id", m.id);
      } else {
        skipped.push(`${m.model_name}（暫時性錯誤、保留）`);
      }
    }
  }

  if (dead.length) console.warn("[model-health] 下架模型：", dead.map((d) => d.model).join(", "));
  return NextResponse.json({ ok: true, tested: (models ?? []).length, alive: alive.length, deactivated: dryRun ? 0 : dead.length, dead, skipped });
}
