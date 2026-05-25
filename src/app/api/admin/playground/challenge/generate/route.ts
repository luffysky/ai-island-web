import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/admin/playground/challenge/generate
 *   { level: 'easy'|'medium'|'hard', count: 1-6, category?, hint? }
 *   → { challenges: [{id?, level, category, title, scenario, task, starter_code, test_code, hints, solution, solution_explain, xp_award}, ...] }
 *
 * AI 依既有題目格式仿造新題、Nami 勾選後再 bulk-insert。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // rate limit：每 user 10/h（AI 出題比較貴）
  const rl = rateLimit(`gen-challenge:${user.id}`, 10, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const level = (["easy", "medium", "hard"] as const).includes(body.level) ? body.level : "easy";
  const count = Math.max(1, Math.min(6, Number(body.count) || 3));
  const category = String(body.category ?? "basic");
  const userHint = String(body.hint ?? "").slice(0, 300);

  const admin = createSupabaseAdmin();

  // 找 anthropic 或 openai
  const { data: models } = await admin
    .from("ai_models")
    .select("id, provider, model_name, is_active")
    .eq("is_active", true);
  const model = (models as any[])?.find((m) => m.provider === "anthropic")
    ?? (models as any[])?.find((m) => m.provider === "openai")
    ?? (models as any[])?.[0];
  if (!model) return NextResponse.json({ error: "no_model" }, { status: 503 });

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });

  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  // 拿 2-3 個既有題目當範例
  const { data: examples } = await admin
    .from("nami_challenges")
    .select("level, category, title, scenario, task, starter_code, test_code, hints, solution, solution_explain, xp_award")
    .eq("level", level)
    .limit(2);

  const exampleStr = ((examples as any[]) ?? []).map((e) =>
    JSON.stringify({
      level: e.level,
      category: e.category,
      title: e.title,
      scenario: e.scenario,
      task: e.task,
      starter_code: e.starter_code,
      test_code: e.test_code,
      hints: e.hints,
      solution: e.solution,
      solution_explain: e.solution_explain,
      xp_award: e.xp_award,
    }, null, 2),
  ).join("\n\n---\n\n");

  const xpDefault = level === "easy" ? 30 : level === "medium" ? 60 : 100;

  const system = `你是 Python 出題大師。專門出給已具備基礎的成人學員、業界導向、不出小學數學題。

# 出題守則
1. **${level === "easy" ? "🟢 入門" : level === "medium" ? "🟡 進階" : "🔴 業界題"}**：${
    level === "easy" ? "基礎語法 / 內建函式 / list / dict、5-10 行解法、適合 1 週經驗"
      : level === "medium" ? "pandas / 演算法 / API 整合、需 think、20-40 行解法"
      : "完整應用 / 多步驟 / 業界場景、可能含 FastAPI / sklearn / 時間序列、50-100 行解法"
  }
2. **題目仿照下面範例的格式跟難度**、不要明顯比範例難或簡單
3. **business context**：每題要有實際業界情境（電商 / 後台 / API / 數據分析）、不要純抽象算法
4. **starter_code**：只給 function 殼 + TODO 註解、絕不附答案
5. **test_code**：至少 3 個 assert、cover 正常 case + 邊界 case + 錯誤輸入（hard 5+）
6. **hints**：3 條由淺到深、第 1 條只提示方向、第 3 條接近答案
7. **solution**：完整可跑的解答、Pythonic
8. **solution_explain**：2-4 條 bullet point、講概念不講 code
9. **xp_award**：${xpDefault}

# 既有 ${level} 級題目參考（仿這個風格）
${exampleStr || "(沒有既有範例、自己抓難度)"}

# Pyodide 環境特性
- 沒有 input()、不要寫
- 標準庫齊全 (re, json, math, datetime, collections)
- 已預載 numpy / pandas / matplotlib
- 可 await micropip.install(["scikit-learn", "scipy"])
- 爬蟲用 await nami_fetch(url, as_json=True) (內建 helper、走 admin proxy)

# 任務
出 ${count} 題 **${level}** 級、類別 **${category}**${userHint ? `、額外要求：${userHint}` : ""}。

**只回一個 JSON array、不要 markdown、不要任何文字解釋**。array 內每個物件包含這些欄位：
  level, category, title (中文題名), scenario (1-2 句情境), task (要做什麼),
  starter_code, test_code, hints (3 條), solution, solution_explain (2-4 條), xp_award

絕對不要：
- 用 \`\`\`json 包
- 在 array 前後加說明文字
- 題目重複 (跟既有範例不一樣的主題)`;

  const userMsg = `請出 ${count} 題 ${level} 級 ${category} 類題目、回 JSON array。`;

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.85,
      maxTokens: 4000,
    });

    // 嘗試 parse JSON、有時 AI 還是會回 ```json...```
    let text = r.text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      // 找第一個 `[` 跟最後一個 `]`
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(text.substring(start, end + 1)); } catch {}
      }
      if (!parsed) return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 500) }, { status: 500 });
    }

    if (!Array.isArray(parsed)) return NextResponse.json({ error: "not_array", raw: text.slice(0, 500) }, { status: 500 });

    // 驗證 + 補預設值
    const challenges = parsed.map((c: any, i: number) => ({
      tempId: `gen-${Date.now()}-${i}`,
      level: c.level || level,
      category: c.category || category,
      title: String(c.title || `題目 ${i + 1}`).slice(0, 100),
      scenario: String(c.scenario || "").slice(0, 500),
      task: String(c.task || "").slice(0, 500),
      starter_code: String(c.starter_code || ""),
      test_code: String(c.test_code || ""),
      hints: Array.isArray(c.hints) ? c.hints.slice(0, 5).map((h: any) => String(h).slice(0, 300)) : [],
      solution: String(c.solution || ""),
      solution_explain: Array.isArray(c.solution_explain) ? c.solution_explain.slice(0, 6).map((s: any) => String(s).slice(0, 300)) : [],
      xp_award: typeof c.xp_award === "number" ? c.xp_award : xpDefault,
    }));

    return NextResponse.json({
      ok: true,
      challenges,
      tokens: r.tokensInput + r.tokensOutput,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
