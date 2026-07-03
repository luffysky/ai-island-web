import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/rewrite —— 編輯器 BubbleMenu 的通用 AI 文字操作。
 * body: { text: string, action: RewriteAction, targetLang?: Lang }
 * 回：{ result: string }（純文字，前端直接取代 / 插入選取範圍）。
 *
 * 認證：必須登入（401）。限流：每人每分鐘 15 次。
 * 模型：沿用 blog_writer 用途的 admin 可調模型（completeForUsage 會自動記帳 + 失敗退備援）。
 */

type RewriteAction = "rewrite" | "continue" | "polish" | "translate" | "summarize";
type Lang = "ja" | "en" | "ko" | "classical";

const LANG_LABEL: Record<Lang, string> = {
  ja: "日文",
  en: "英文",
  ko: "韓文",
  classical: "文言文",
};

const BASE_RULES =
  "你是專業的繁體中文寫作助手。只回傳處理後的文字本身、不要加任何解釋、前後綴、引號或 markdown code fence。保持與原文相近的語氣與格式（換行、清單）。";

function systemFor(action: RewriteAction, targetLang?: Lang): string {
  switch (action) {
    case "rewrite":
      return `${BASE_RULES}\n任務：改寫使用者提供的文字，讓它更清楚、更通順、用詞更精準，但保留原意與重點。`;
    case "continue":
      return `${BASE_RULES}\n任務：接續使用者提供的文字往下寫。只回傳「接續的新內容」、不要重複已有的文字。延續原本的語氣、主題與段落節奏，長度約 1～3 段。`;
    case "polish":
      return `${BASE_RULES}\n任務：潤稿。修正錯字、標點、語病與不自然的句子，讓文字更精煉流暢，但不改變原意、不擅自增刪內容重點。`;
    case "translate":
      return `${BASE_RULES}\n任務：把使用者提供的文字翻譯成「${LANG_LABEL[targetLang ?? "en"]}」。只回傳譯文、忠於原意、語氣自然道地。`;
    case "summarize":
      return `${BASE_RULES}\n任務：用繁體中文摘要使用者提供的文字，抓住主要重點、精簡扼要（約原文 1/4 長度或 3～5 個要點）。`;
    default:
      return BASE_RULES;
  }
}

const VALID_ACTIONS: RewriteAction[] = ["rewrite", "continue", "polish", "translate", "summarize"];
const VALID_LANGS: Lang[] = ["ja", "en", "ko", "classical"];

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 限流：每人每分鐘 15 次
  const rl = rateLimit(`ai-rewrite:${user.id}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const text = String(body.text ?? "").trim();
  const action = String(body.action ?? "") as RewriteAction;
  const targetLangRaw = body.targetLang ? String(body.targetLang) : undefined;
  const targetLang = VALID_LANGS.includes(targetLangRaw as Lang) ? (targetLangRaw as Lang) : undefined;

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "bad_action" }, { status: 422 });
  }
  if (!text) {
    return NextResponse.json({ error: "empty", message: "請先選取文字" }, { status: 422 });
  }
  // 保護：太長截斷（避免爆 token）
  const clipped = text.length > 8000 ? text.slice(0, 8000) : text;

  try {
    const { text: out } = await completeForUsage("blog_writer", {
      system: systemFor(action, targetLang),
      user: clipped,
      maxTokens: 1600,
      temperature: action === "polish" ? 0.4 : 0.7,
    });
    const result = (out || "")
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    if (!result) {
      return NextResponse.json({ error: "empty_result", message: "AI 沒有回覆、請再試一次" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_failed", message: e?.message ?? "AI 生成失敗" },
      { status: 500 },
    );
  }
}
