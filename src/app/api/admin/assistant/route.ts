/**
 * POST /api/admin/assistant — 後台「AI 營運助手」（P3）
 *
 * 流程（AI 全程碰不到 SQL）：
 *   1. requireAdmin gate + 每人限流
 *   2. 自然語言問題 → AI「意圖分類」→ 只能吐白名單函式的 {name,args}（見 admin-metrics.ts）
 *   3. server 端過濾掉任何不在白名單的名字、clamp 參數、執行唯讀查詢
 *   4. AI 用查到的數據，用繁中做摘要 → { answer, dataUsed }
 *   5. 無匹配 → 回「我只能回答營運數據問題」+ 能力清單
 *
 * model 走 admin 可調的用途鍵 `admin_assistant`（completeForUsage、主模型失敗自動退備援），
 * 跟 blog/ai-seo 的 completeForUsage / callAI 同一套。
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { rateLimit } from "@/lib/rate-limit";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { METRICS, metricCatalog, runMetric, CAPABILITY_LIST_ZH } from "@/lib/admin-metrics";

export const runtime = "nodejs";
export const maxDuration = 60;

// 從模型回覆抓第一段 {...} 當 JSON（防 markdown fence / 前後贅字）
function extractJson(raw: string): any | null {
  if (!raw) return null;
  const fenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch {
    return null;
  }
}

function classifySystemPrompt(): string {
  const catalog = metricCatalog()
    .map((m) => {
      const argStr = m.args
        ? "，參數：" + Object.entries(m.args).map(([k, v]) => `${k}(${v})`).join("、")
        : "";
      return `- ${m.name}：${m.description}${argStr}`;
    })
    .join("\n");
  return `你是「AI 島」後台營運助手的意圖分類器。使用者會用中文問營運數據問題。
你的唯一任務：把問題對應到下面**白名單函式**中的一個或多個（用函式名 + 參數）。
**只能使用清單裡出現過的函式名。禁止自創函式、禁止回傳任何 SQL。**

可用函式：
${catalog}

**只回傳一個嚴格 JSON 物件、不要任何說明文字、不要 markdown code fence。**
結構：
{
  "calls": [ { "name": "函式名", "args": { } } ],
  "reason": "一句話說明你為什麼選這些函式"
}
規則：
- 能對應到營運數據 → calls 填一個以上白名單函式（參數用數字、沒有就給空物件 {}）。
- 完全對應不到（例如閒聊、跟營運數據無關）→ 回 { "calls": [], "reason": "無法對應" }。
- 一個問題可能要多個函式（例如「今天賺多少、幾個新用戶」→ revenueToday + newUsers）。`;
}

const SUMMARY_SYSTEM = `你是「AI 島」的後台營運分析助手。使用者問了一個營運數據問題、系統已經幫你查好真實數據（JSON）。
請用**繁體中文**、口語、精簡地回答使用者的問題。
規則：
- 直接講重點數字（金額標 NT$、AI 花費標 US$）。
- 只根據提供的數據講、**不要杜撰**沒有的數字。
- 可以做簡單解讀（例如成長 / 偏多 / 需注意），但別誇大、別亂下結論。
- 2~5 句話即可、必要時用短條列。`;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // 限流：每人每分鐘 20 次
  const rl = rateLimit(`admin-assistant:${gate.userId}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const question = String(body.question ?? "").trim().slice(0, 500);
  if (!question) {
    return NextResponse.json({ error: "empty", message: "請先輸入問題" }, { status: 422 });
  }

  // 1) 意圖分類
  let classifyText = "";
  try {
    const r = await completeForUsage("admin_assistant", {
      system: classifySystemPrompt(),
      user: question,
      maxTokens: 500,
      temperature: 0,
    });
    classifyText = r.text ?? "";
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message ?? "AI 分類失敗" }, { status: 500 });
  }

  const parsed = extractJson(classifyText);
  const rawCalls: any[] = Array.isArray(parsed?.calls) ? parsed.calls : [];

  // 2) 白名單過濾（唯一放行點；不在 METRICS 的名字一律丟掉）
  const validCalls = rawCalls
    .filter((c) => c && typeof c.name === "string" && Object.prototype.hasOwnProperty.call(METRICS, c.name))
    .map((c) => ({ name: c.name as string, args: (c.args && typeof c.args === "object") ? c.args : {} }))
    .slice(0, 5);

  // 3) 無匹配 → 回能力清單
  if (validCalls.length === 0) {
    return NextResponse.json({
      matched: false,
      answer: "我只能回答營運數據問題。你可以問我這些：\n" + CAPABILITY_LIST_ZH.map((c) => `・${c}`).join("\n"),
      capabilities: CAPABILITY_LIST_ZH,
      dataUsed: [],
    });
  }

  // 4) 執行白名單查詢（server-side、參數化）
  const dataUsed: Array<{ name: string; args: Record<string, any>; result?: any; error?: string }> = [];
  for (const call of validCalls) {
    try {
      const result = await runMetric(call.name, call.args);
      dataUsed.push({ name: call.name, args: call.args, result });
    } catch (e: any) {
      dataUsed.push({ name: call.name, args: call.args, error: e?.message ?? "query_failed" });
    }
  }

  // 5) AI 摘要
  let answer = "";
  try {
    const r = await completeForUsage("admin_assistant", {
      system: SUMMARY_SYSTEM,
      user: `使用者問題：${question}\n\n查到的數據（JSON）：\n${JSON.stringify(dataUsed, null, 2)}`,
      maxTokens: 800,
      temperature: 0.4,
    });
    answer = (r.text ?? "").trim();
  } catch (e: any) {
    // 摘要失敗也把原始數據回去、前端還能顯示數字
    return NextResponse.json({
      matched: true,
      answer: "數據查到了、但 AI 摘要暫時失敗、以下是原始數字。",
      dataUsed,
      warning: e?.message ?? "summary_failed",
    });
  }

  return NextResponse.json({ matched: true, answer, dataUsed });
}
