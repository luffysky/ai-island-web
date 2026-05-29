import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { chapters as ALL_CHAPTERS } from "@/data/chapters";
import { CAREER_PATHS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/me/learning-plan/generate
 * body: { depth: 'lazy'|'standard'|'detail', career_path: 'frontend'|..., goal, schedule }
 *
 * 用 AI 看 user 歷史、生個人化學習計畫、存進 learning_plans 表、回 plan。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // AI gate（學習計畫生成、free 3/月、用 resume 額度池）
  const { requireAiAction } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "resume");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const depth = ["lazy", "standard", "detail"].includes(body.depth) ? body.depth : "standard";
  const careerPath = String(body.career_path ?? "fullstack");
  const goal = String(body.goal ?? "").slice(0, 500);
  const schedule = String(body.schedule ?? "weekday_30min");

  const admin = createSupabaseAdmin();

  // 取 user 歷史
  const { data: profile } = await admin.from("profiles").select("xp, level, streak_days, career_path").eq("id", user.id).maybeSingle();
  const { data: progress } = await admin.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", user.id);
  const { data: quizzes } = await admin.from("quiz_attempts").select("chapter_id, score, total_questions, perfect").eq("user_id", user.id).limit(20);

  const completedSet = new Set((progress ?? []).map((p: any) => p.lesson_id));
  const completedChapterIds = Array.from(new Set((progress ?? []).map((p: any) => p.chapter_id)));

  // 該職涯路線的章節
  const path = (CAREER_PATHS as any)[careerPath];
  const pathChapters = ALL_CHAPTERS.filter((c) => (path?.chapters ?? []).includes(c.id));
  const pathTotalLessons = pathChapters.reduce((s, c) => s + c.lessons.length, 0);
  const pathDoneLessons = pathChapters.reduce((s, c) => s + c.lessons.filter((l) => completedSet.has(l.id)).length, 0);
  const pathPct = pathTotalLessons > 0 ? Math.round((pathDoneLessons / pathTotalLessons) * 100) : 0;

  // 取 AI key（系統 default model）
  const { data: model } = await admin.from("ai_models").select("*").eq("is_default", true).eq("is_active", true).maybeSingle();
  if (!model) return NextResponse.json({ error: "no_default_model" }, { status: 503 });

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey?.enabled) return NextResponse.json({ error: "no_system_key" }, { status: 503 });
  if (Number(sysKey.used_this_month_usd ?? 0) >= Number(sysKey.monthly_budget_usd ?? 0)) {
    return NextResponse.json({ error: "budget_exceeded" }, { status: 429 });
  }
  const apiKey = decryptKey(sysKey.api_key_encrypted);

  const depthMap = {
    lazy: "懶人包模式：每週 30-60 分鐘、只跳重點、3 個月內看完該路線核心 30%",
    standard: "標準模式：每週 3-5 小時、循序漸進、6 個月內完成該路線 70%+",
    detail: "詳細模式：每週 10+ 小時、含 playground 練習、3 個月內 100% 完成 + 寫 portfolio",
  };

  const systemPrompt = `你是 AI 島的學習規劃師。任務：為使用者產出個人化學習計畫（中文回答、繁體、活潑友善但專業）。

使用者資料：
- 當前等級 Lv ${profile?.level ?? 1}、累計 XP ${profile?.xp ?? 0}、連勝 ${profile?.streak_days ?? 0} 天
- 已完成 ${progress?.length ?? 0} 個 lesson、跨 ${completedChapterIds.length} 個章節
- ${quizzes?.length ?? 0} 次 quiz 嘗試、${(quizzes ?? []).filter((q: any) => q.perfect).length} 次滿分
- 選擇職涯路線：${path?.name ?? careerPath}（含章節：${(path?.chapters ?? []).join(", ")}）
- 此路線當前解鎖 ${pathPct}%（${pathDoneLessons}/${pathTotalLessons}）
- 想達成目標：${goal || "（未填）"}
- 每週時間規劃：${schedule}
- 深度偏好：${depthMap[depth as keyof typeof depthMap]}

可用章節資源：
${pathChapters.map((c) => `Ch ${c.id} ${c.title}（${c.lessons.length} lessons、${c.difficulty}、${c.estimatedHours}h）${completedChapterIds.includes(c.id) ? "✓已開始" : ""}`).join("\n")}

請輸出 JSON 格式（不要 markdown code fence、直接 raw JSON）：
{
  "plan_md": "完整的個人化計畫 markdown（含 Why / 學習節奏 / 各週重點 / 注意事項 / 完成後能做什麼）、依 depth 控制詳盡度",
  "next_action": { "chapter_id": <number>, "lesson_id": "<string>", "reason": "<為什麼從這開始>" },
  "weekly_chapters": [
    { "week": 1, "chapter_ids": [...], "hours": <number>, "focus": "<本週主軸>" },
    ...（依 depth 規劃 4-12 週）
  ]
}
規則：
- next_action 必須是該 user 還沒完成的 lesson
- weekly_chapters 不要包含已完成 lesson 全部完成的章節
- plan_md 用第二人稱「你」、不要叫使用者「使用者」
- 若 user 是新手（progress=0）、強調從基礎開始、不要嚇人
- 若 user 已完成不少、強調延續節奏、給挑戰`;

  const userPrompt = `請依上述資料、為我生個人化學習計畫。深度：${depth}。回 JSON。`;

  try {
    const aiResp = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 3000,
    });

    let parsed: any;
    try {
      const cleanText = aiResp.text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleanText);
    } catch {
      return NextResponse.json({ error: "ai_returned_invalid_json", raw: aiResp.text.slice(0, 500) }, { status: 500 });
    }

    // 把舊的 plan 標 archived
    await admin.from("learning_plans").update({ status: "archived" }).eq("user_id", user.id).eq("status", "active");

    // 存新 plan
    const { data: saved, error: saveErr } = await admin.from("learning_plans").insert({
      user_id: user.id,
      depth,
      career_path: careerPath,
      goal,
      schedule,
      plan_md: parsed.plan_md ?? "",
      next_action: parsed.next_action ?? null,
      weekly_chapters: parsed.weekly_chapters ?? [],
      generated_by: `${model.provider}/${model.model_name}`,
    }).select("*").single();
    if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

    return NextResponse.json({ plan: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ai_error" }, { status: 500 });
  }
}
