import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { topic?, count?, difficulty? } → 生 N 個「數字/邏輯」Python 關卡草稿（純 stdout 比對）。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const rl = rateLimit(`quest-gen:${gate.userId}`, 40, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const count = Math.max(1, Math.min(6, Number(body.count) || 3));
  const topic = String(body.topic ?? "").slice(0, 200);
  const difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "easy";

  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return NextResponse.json({ error: "no_model" }, { status: 503 });
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch { return NextResponse.json({ error: "decrypt_failed" }, { status: 500 }); }

  const diffText = difficulty === "hard" ? "較難（多步驟邏輯、巢狀迴圈）" : difficulty === "medium" ? "中等（迴圈+條件）" : "簡單（單一觀念、新手可解）";
  const system = `你是「程式副本島」的 Python 關卡出題器。生一批「數字/邏輯」小關卡：學員寫 Python、用 print() 印出答案，系統把 stdout 跟 expect 逐字比對就算過關。

難度：${diffText}
${topic ? `主題方向：${topic}` : "主題自由（迴圈、條件、字串、清單、字典、數學）"}

**每一關的規則（很重要）**：
1. concept：一個明確的程式觀念（例：「for 迴圈」「字典查表」）。
2. intro：一兩句白話題目，講清楚要印出什麼（繁體中文、國中生看得懂）。
3. hint：**完整可跑的參考解答**（Python）。務必確保這段 code 跑出來的 stdout **完全等於** expect（含換行、不含多餘空白）。
4. expect：hint 跑出來的預期 stdout（多行用 \\n；結尾不要多空行）。
5. starter：給學員的起手 code（留 TODO 註解、不要寫出答案）。
6. parLines：漂亮解的行數（拿三星的門檻），通常 2~8。
7. xp：12~24；z：6~12（越難越高）。
確保每關 expect 是唯一且確定的（不要用隨機、時間、輸入）。

只回 JSON（不要 markdown fence）：{"levels":[{"title":"","concept":"","intro":"","hint":"","expect":"","starter":"","parLines":4,"xp":14,"z":7}]}
生 ${count} 關、主題不重複。`;

  try {
    const r = await callAI({
      provider: model.provider, model: model.model_name, apiKey,
      messages: [{ role: "system", content: system }, { role: "user", content: `請生 ${count} 個關卡，回 JSON。` }],
      temperature: 0.9, maxTokens: 3500,
    });
    const text = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch { /* noop */ } }
    }
    const levels = Array.isArray(parsed?.levels)
      ? parsed.levels.filter((l: any) => l?.title && l?.hint && typeof l?.expect === "string").slice(0, count)
      : [];
    if (!levels.length) return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 400) }, { status: 500 });
    return NextResponse.json({ ok: true, levels });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message }, { status: 500 });
  }
}
