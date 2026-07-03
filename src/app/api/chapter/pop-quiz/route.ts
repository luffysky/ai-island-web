import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";
import { getChapter } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 60;

// markdown/HTML → 純文字（去標籤、收斂空白、截斷）
function toPlain(s: string, max = 5000): string {
  const t = (s || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max) : t;
}

// 從模型回覆抓第一段 [...] 或 {...}
function extractJson(raw: string): any | null {
  if (!raw) return null;
  const fenced = raw.replace(/```(?:json)?/gi, "").trim();
  const s = fenced.indexOf("[");
  const e = fenced.lastIndexOf("]");
  if (s >= 0 && e > s) {
    try { return JSON.parse(fenced.slice(s, e + 1)); } catch {}
  }
  const os = fenced.indexOf("{");
  const oe = fenced.lastIndexOf("}");
  if (os >= 0 && oe > os) {
    try { return JSON.parse(fenced.slice(os, oe + 1)); } catch {}
  }
  return null;
}

const SYSTEM_PROMPT = `你是繁體中文的程式教學出題老師。根據提供的課程內容，出 3 題「隨堂考」選擇題，測驗讀者是否理解重點。
**只回傳一個嚴格 JSON 陣列、不要任何額外說明、不要 markdown code fence。**
陣列每個元素結構：
{
  "question": "題目（繁體中文、精簡）",
  "options": [
    { "label": "選項文字", "value": "A" },
    { "label": "選項文字", "value": "B" },
    { "label": "選項文字", "value": "C" },
    { "label": "選項文字", "value": "D" }
  ],
  "answer": "正確選項的 value（如 \\"B\\"）",
  "explanation": "一句話解釋為什麼（繁體中文）"
}
規則：出 3 題、每題 4 個選項、value 用 A/B/C/D、answer 必須是其中一個 value、題目忠於內容不杜撰、涵蓋不同重點。`;

// POST /api/chapter/pop-quiz { chapterId, lessonId, lessonText? }
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 每人每分鐘 6 次（AI 成本控管）
  const rl = rateLimit(`pop-quiz:${user.id}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `出題太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const chapterId = String(body?.chapterId ?? "").trim();
  const lessonId = String(body?.lessonId ?? "").trim();
  let lessonText = toPlain(String(body?.lessonText ?? ""));

  // client 沒給內文 → server 端從 DB 撈該課內容
  if (!lessonText && chapterId && lessonId) {
    try {
      const ch = await getChapter(Number(chapterId));
      const lesson = ch?.lessons?.find((l: any) => String(l.id) === lessonId);
      if (lesson) {
        lessonText = toPlain(
          [lesson.title, lesson.oneLineSummary, lesson.analogy, lesson.content].filter(Boolean).join("\n"),
        );
      }
    } catch { /* 撈不到就算了 */ }
  }

  if (!lessonText || lessonText.length < 40) {
    return NextResponse.json(
      { error: "no_content", message: "這節內容太少、無法出題" },
      { status: 422 },
    );
  }

  try {
    const { text } = await completeForUsage("chapter_quiz_gen", {
      system: SYSTEM_PROMPT,
      user: `課程內容（純文字、可能已截斷）：\n${lessonText}`,
      maxTokens: 1400,
      temperature: 0.7,
    });

    const parsed = extractJson(text);
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
    if (!arr) {
      return NextResponse.json(
        { error: "parse_failed", message: "AI 回覆格式無法解析、請再試一次" },
        { status: 502 },
      );
    }

    // 正規化 + 防呆
    const questions = arr
      .map((q: any) => {
        const options = Array.isArray(q?.options)
          ? q.options
              .map((o: any) => ({ label: String(o?.label ?? "").trim().slice(0, 300), value: String(o?.value ?? "").trim().slice(0, 60) }))
              .filter((o: any) => o.label && o.value)
              .slice(0, 6)
          : [];
        const answer = String(q?.answer ?? "").trim().slice(0, 60);
        return {
          question: String(q?.question ?? "").trim().slice(0, 500),
          options,
          answer,
          explanation: q?.explanation ? String(q.explanation).trim().slice(0, 500) : undefined,
        };
      })
      .filter((q: any) => q.question && q.options.length >= 2 && q.options.some((o: any) => o.value === q.answer))
      .slice(0, 3);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "parse_failed", message: "AI 出題失敗、請再試一次" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, questions });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_failed", message: e?.message ?? "AI 出題失敗" },
      { status: 500 },
    );
  }
}
