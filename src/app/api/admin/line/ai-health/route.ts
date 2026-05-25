import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { getAdminLineUsers } from "@/lib/admin-line-users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * LINE AI 整條鏈健檢
 *
 * 跑遍 line-webhook-user 會用到的所有資源、每段給 ok / warn / fail。
 * 不發訊息、不打 LINE API、純檢查本地端設定。
 */
export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "owner"].includes((profile as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const checks: Array<{ step: string; status: "ok" | "warn" | "fail"; detail: string }> = [];

  // ── USER LINE Bot ──
  const hasUserToken = !!process.env.USER_LINE_CHANNEL_TOKEN;
  const hasUserSecret = !!process.env.USER_LINE_CHANNEL_SECRET;
  checks.push({
    step: "1. USER_LINE_CHANNEL_TOKEN",
    status: hasUserToken ? "ok" : "fail",
    detail: hasUserToken ? `已設、長度 ${process.env.USER_LINE_CHANNEL_TOKEN!.length}` : "❌ 未設、user bot reply 會直接失敗",
  });
  checks.push({
    step: "2. USER_LINE_CHANNEL_SECRET",
    status: hasUserSecret ? "ok" : "fail",
    detail: hasUserSecret ? `已設、長度 ${process.env.USER_LINE_CHANNEL_SECRET!.length}` : "❌ 未設、user webhook 驗簽必失敗",
  });

  // ── ADMIN LINE Bot ──
  const hasAdminToken = !!process.env.ADMIN_LINE_CHANNEL_TOKEN;
  const hasAdminSecret = !!process.env.ADMIN_LINE_CHANNEL_SECRET;
  const adminUsers = getAdminLineUsers();
  checks.push({
    step: "3a. ADMIN_LINE_CHANNEL_TOKEN",
    status: hasAdminToken ? "ok" : "fail",
    detail: hasAdminToken ? `已設、長度 ${process.env.ADMIN_LINE_CHANNEL_TOKEN!.length}` : "❌ 未設、admin bot reply + push 都會失敗",
  });
  checks.push({
    step: "3b. ADMIN_LINE_CHANNEL_SECRET",
    status: hasAdminSecret ? "ok" : "fail",
    detail: hasAdminSecret ? `已設` : "❌ 未設、admin webhook 驗簽必失敗",
  });
  checks.push({
    step: "3c. ADMIN_LINE_USER_ID / ADMIN_LINE_USERS",
    status: adminUsers.length > 0 ? "ok" : "fail",
    detail: adminUsers.length > 0
      ? `✅ ${adminUsers.length} 位 admin：${adminUsers.map((u) => `${u.id.slice(0, 6)}... (${u.name})`).join(", ")}`
      : "❌ 沒設 admin LINE userId、通知無法推給任何人",
  });

  // ── AI 部分 (USER + ADMIN bot 共用) ──
  const admin = createSupabaseAdmin();
  const { data: models, error: modelsErr } = await admin
    .from("ai_models")
    .select("model_name, provider, is_active")
    .eq("is_active", true);
  const activeModels = (models as any[]) ?? [];
  checks.push({
    step: "4. ai_models 有 active model",
    status: modelsErr ? "fail" : activeModels.length > 0 ? "ok" : "fail",
    detail: modelsErr
      ? `❌ DB error: ${modelsErr.message}`
      : activeModels.length === 0
      ? "❌ 0 個 is_active=true 的 model、AI 必 return null。去 /admin/ai/models 啟用至少一個"
      : `✅ ${activeModels.length} 個 active：${activeModels.map((m) => `${m.provider}/${m.model_name}`).join(", ")}`,
  });

  // 兩個 LINE bot 的 usage-models 配對
  const userUsageModel = await pickModelForUsage("line_user", activeModels).catch(() => null);
  const adminUsageModel = await pickModelForUsage("line_admin", activeModels).catch(() => null);
  checks.push({
    step: "5a. usage-models line_user 對應",
    status: userUsageModel ? "ok" : "warn",
    detail: userUsageModel
      ? `✅ ${userUsageModel.provider}/${userUsageModel.model_name}`
      : "⚠️ 沒設、會 fallback 到 anthropic → active[0]",
  });
  checks.push({
    step: "5b. usage-models line_admin 對應",
    status: adminUsageModel ? "ok" : "warn",
    detail: adminUsageModel
      ? `✅ ${adminUsageModel.provider}/${adminUsageModel.model_name}`
      : "⚠️ 沒設、會 fallback",
  });

  // 實際選用 (user bot 視角、admin bot 大同小異)
  const chosenModel = userUsageModel
    ?? activeModels.find((m) => m.provider === "anthropic")
    ?? activeModels[0];
  checks.push({
    step: "6. 實際 user bot 選用 model",
    status: chosenModel ? "ok" : "fail",
    detail: chosenModel ? `${chosenModel.provider}/${chosenModel.model_name}` : "❌ 沒任何可用 model",
  });

  // 檢查所有 active model 對應 provider 的 ai_api_keys
  const providers = Array.from(new Set(activeModels.map((m) => m.provider)));
  for (const p of providers) {
    const { data: sysKey, error: keyErr } = await admin
      .from("ai_api_keys")
      .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd")
      .eq("provider", p)
      .maybeSingle();
    if (keyErr || !sysKey) {
      checks.push({
        step: `7. ai_api_keys (${p})`,
        status: "fail",
        detail: keyErr ? `❌ DB error: ${keyErr.message}` : `❌ 沒有 ${p} key 紀錄、所有用 ${p} model 的 AI 都會 return null`,
      });
      continue;
    }
    if (!(sysKey as any).enabled) {
      checks.push({
        step: `7. ai_api_keys (${p})`,
        status: "fail",
        detail: `❌ ${p} key 存在但 enabled=false、去 /admin/ai/models 開啟`,
      });
      continue;
    }
    try {
      const apiKey = decryptKey((sysKey as any).api_key_encrypted);
      const masked = apiKey.length > 12 ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : "(too short)";
      checks.push({
        step: `7. ai_api_keys (${p})`,
        status: "ok",
        detail: `✅ enabled、解密成功 ${masked}、預算 $${(sysKey as any).used_this_month_usd ?? 0}/$${(sysKey as any).monthly_budget_usd ?? "?"}`,
      });
    } catch (e: any) {
      checks.push({
        step: `7. ai_api_keys (${p})`,
        status: "fail",
        detail: `❌ AI_KEY_SECRET 解密失敗：${e?.message ?? "unknown"}、env 變過？重新到 /admin/ai/models 貼一次 key`,
      });
    }
  }

  const summary = {
    pass: checks.filter((c) => c.status === "ok").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
  const verdict = summary.fail === 0
    ? "✅ LINE AI 鏈完整、可以正常回覆 (還要 LINE 端 Auto-reply 關掉 + 訊息者已綁定帳號)"
    : `❌ ${summary.fail} 段失敗、AI 不會回覆、看 fail step`;

  return NextResponse.json({ verdict, summary, checks });
}
