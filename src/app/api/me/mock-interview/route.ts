import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

/**
 * AI 模擬面試
 * POST { mode: "tech"|"behavior"|"system-design", role: "frontend"|"backend"|"fullstack"|"ai"|"freelance",
 *        history: [{role:"interviewer"|"candidate", content}], action: "start"|"answer"|"finish" }
 *
 * 回 { question?: string, feedback?: string, score?: { overall, breakdown[] } }
 */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[mock-interview] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

const MODE_LABEL: Record<string, string> = {
  tech: "技術面試（algorithm / coding / 概念）",
  behavior: "行為面試（STAR 模式 / 軟技能）",
  "system-design": "系統設計（架構 / scale / trade-off）",
  portfolio: "作品集 review（解釋專案決策）",
  case: "case study（給情境、看你怎麼拆解）",
};

const ROLE_LABEL: Record<string, string> = {
  frontend:       "前端工程師",
  backend:        "後端工程師",
  fullstack:      "全端工程師",
  ai:             "AI / ML 工程師",
  data:           "資料工程師 / Data Scientist",
  devops:         "DevOps / SRE",
  mobile:         "行動 App 工程師",
  designer:       "設計師（UI / UX）",
  pm:             "產品經理（PM）",
  marketing:      "行銷 / 成長駭客",
  content:        "內容創作 / 寫手",
  freelance:      "接案 / freelance（客戶溝通）",
  indie:          "Indie Hacker（一人創業）",
  founder:        "創業者（pitch / 募資）",
};

async function handle(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const mode = String(body.mode ?? "tech");
  const role = String(body.role ?? "frontend");
  const action = String(body.action ?? "start");
  const history: Array<{ role: string; content: string }> = Array.isArray(body.history) ? body.history.slice(-20) : [];

  if (!MODE_LABEL[mode] || !ROLE_LABEL[role]) {
    return NextResponse.json({ error: "invalid mode or role" }, { status: 400 });
  }

  // 只在 start 動作扣 quota（一場面試只扣 1 次、之後 answer/finish 不扣）
  if (action === "start") {
    const { requireAiAction } = await import("@/lib/ai-gate");
    const gate = await requireAiAction(user.id, "interview");
    if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });
  }

  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return NextResponse.json({ error: `no_${provider}_key` }, { status: 503 });

  const baseSystemPrompt = `你是雪鑰、現在角色扮演「${ROLE_LABEL[role]} 面試官」。
這是 ${MODE_LABEL[mode]}。

# 你的風格
- 像真實面試官、不像 AI 客服
- 一次問一題、等學員答完再 follow-up 或下一題
- 不要劇透答案、不要太快給 hint
- 中文台灣口語、語氣專業但不咄咄逼人
- 適度追問「為什麼這樣設計」「有沒考慮 X 情況」
- 每題回應 < 80 字`;

  if (action === "start" || history.length === 0) {
    const prompt = `${baseSystemPrompt}

# 任務
這是第 1 題、暖場 + 開場 + 第 1 個面試題。

格式：
1. 1 句話歡迎 + 自我介紹（一句話、不囉嗦）
2. 給第 1 題（${mode === "tech" ? "從基礎概念開始" : mode === "behavior" ? "請舉一個 X 的經驗" : "設計一個 X 系統"}）

只輸出對白、不要 [系統:] 前綴。`;
    const r = await callAI({ provider, model: modelName, apiKey, messages: [{ role: "user", content: prompt }], temperature: 0.7, maxTokens: 400 });
    return NextResponse.json({ question: r.text.trim() });
  }

  if (action === "finish") {
    // 學員按結束、雪鑰評分 + 給回饋 + 保存 session
    const transcript = history.map((h) => `${h.role === "interviewer" ? "面試官" : "學員"}: ${h.content}`).join("\n");
    const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
    const admin = createSupabaseAdmin();
    const prompt = `${baseSystemPrompt}

# 對話記錄
${transcript}

# 任務
評分這場面試、給學員具體 actionable 建議。

# 輸出（嚴格 JSON、無 markdown、無前綴）
{
  "overall_score": 0-100 整數,
  "comment": "60-100 字、雪鑰口吻、總體評語",
  "breakdown": [
    { "aspect": "技術深度", "score": 0-100, "note": "1 句話" },
    { "aspect": "溝通表達", "score": 0-100, "note": "1 句話" },
    { "aspect": "問題拆解", "score": 0-100, "note": "1 句話" },
    { "aspect": "回答完整度", "score": 0-100, "note": "1 句話" }
  ],
  "next_steps": ["3 條具體可執行的下一步、不要空話、各 < 40 字"]
}`;
    const r = await callAI({ provider, model: modelName, apiKey, messages: [{ role: "user", content: prompt }], temperature: 0.3, maxTokens: 800 });
    const text = r.text.trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ feedback: { raw: text, error: "no_json" } });
    try {
      const parsed = JSON.parse(m[0]);
      // 存 session
      const { data: saved } = await admin.from("mock_interview_sessions").insert({
        user_id: user.id,
        mode, role,
        transcript: history,
        overall_score: parsed.overall_score ?? null,
        comment: parsed.comment ?? null,
        breakdown: parsed.breakdown ?? [],
        next_steps: parsed.next_steps ?? [],
      }).select("id").single();
      return NextResponse.json({ feedback: parsed, session_id: (saved as any)?.id });
    } catch (e: any) {
      return NextResponse.json({ feedback: { raw: text, error: "parse_failed", parse_error: e?.message } });
    }
  }

  // action === "answer" → 繼續面試（雪鑰看歷史、給下一題或追問）
  const transcript = history.map((h) => ({ role: h.role === "interviewer" ? "assistant" : "user", content: h.content }));
  const r = await callAI({
    provider,
    model: modelName,
    apiKey,
    messages: [
      { role: "system", content: baseSystemPrompt },
      ...transcript as any,
      { role: "user", content: "（繼續面試、給下一題或追問、回應 < 80 字）" },
    ],
    temperature: 0.7,
    maxTokens: 300,
  });
  return NextResponse.json({ question: r.text.trim() });
}
