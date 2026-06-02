import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { getChapter } from "@/lib/content";
import { streamAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { requireAdmin } from "@/lib/admin-guard";

export const maxDuration = 90;

/**
 * AI 出題助手：吃 chapter 完整內容、輸出 20 題草稿 JSON。
 * Admin 收到後可校稿、再透過 /api/admin/quiz/save 存。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { chapterId } = await req.json();
  if (!chapterId) return NextResponse.json({ error: "chapter_id_required" }, { status: 400 });

  const chapter = await getChapter(Number(chapterId));
  if (!chapter) return NextResponse.json({ error: "chapter_not_found" }, { status: 404 });

  // 找 default model + 系統 key
  const admin = createSupabaseAdmin();
  const { data: model } = await admin
    .from("ai_models")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();
  if (!model) return NextResponse.json({ error: "no_default_model" }, { status: 503 });

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !sysKey.enabled) {
    return NextResponse.json({ error: "system_key_unavailable" }, { status: 503 });
  }
  const apiKey = decryptKey(sysKey.api_key_encrypted);

  // 組 prompt：把 chapter 內容塞進去、要求 20 題 JSON
  const lessonsCompact = (chapter.lessons ?? []).slice(0, 30).map((l: any) => {
    return `### ${l.number} ${l.title}\n${(l.oneLineSummary ?? "").slice(0, 100)}\n${(l.content ?? "").slice(0, 1500)}`;
  }).join("\n\n");

  const systemPrompt = `你是 AI 島的出題助手。依使用者提供的章節內容、設計 20 題綜合測驗。

規則：
1. 全部用 Traditional Chinese
2. 主要單選題（type: "single"）、可加 2-3 題 true_false
3. 難度由淺入深：前 8 題簡單概念、中 8 題理解應用、後 4 題進階思辨
4. 每題附 hint（1 行提示）與 explanation（1-2 行解釋為什麼）
5. answer 是 0-based index、options 至少 3 個、不要明顯廢答
6. 只回傳純 JSON、外面不要任何 markdown code fence 或解釋
7. JSON 結構嚴格如下：

{
  "title": "Ch## 全章測驗",
  "description": "...",
  "xp_per_correct": 5,
  "passing_score": 16,
  "questions": [
    {
      "id": "ch##-q1",
      "type": "single",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": 0,
      "hint": "...",
      "explanation": "..."
    }
  ]
}`;

  const userPrompt = `章節：Ch${String(chapter.id).padStart(2, "0")} ${chapter.title}

${chapter.subtitle ?? ""}

${chapter.description ?? ""}

## Lessons

${lessonsCompact}

請依以上內容出 20 題。回傳純 JSON、不要 markdown code fence。`;

  try {
    let raw = "";
    for await (const chunk of streamAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userPrompt },
      ],
      maxTokens: 8000,
    })) {
      if ((chunk as any).type === "text") raw += (chunk as any).text;
    }

    // 嘗試解析 JSON（容錯：去 code fence、找第一個 {）
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace > 0) cleaned = cleaned.slice(firstBrace);
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > 0 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json({
        error: "ai_returned_invalid_json",
        raw: raw.slice(0, 2000),
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true, draft: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
