import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
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

/** 拿當週 ISO week 字串 ('2026-W22') */
function currentWeekISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * GET /api/me/challenge — 拿本週題目 + 你的 submission（如有）+ leaderboard
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const week = currentWeekISO();

  // 用 week_iso 做 seed 確定 1 題（同週全 user 同一題）
  // 從 medium 難度題庫挑（避免太簡單 / 太難）
  const seed = Math.abs(week.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const { count: total } = await admin.from("leetcode_problems")
    .select("id", { count: "exact", head: true }).eq("difficulty", "medium").eq("active", true).eq("is_premium", false);
  const offset = total ? (seed % total) : 0;
  const { data: problem } = await admin.from("leetcode_problems")
    .select("id, number, slug, title, difficulty, tags, url")
    .eq("difficulty", "medium").eq("active", true).eq("is_premium", false)
    .order("number", { ascending: true })
    .range(offset, offset)
    .maybeSingle();

  if (!problem) return NextResponse.json({ error: "no_problem_available" }, { status: 503 });

  const { data: mine } = await admin.from("challenge_submissions")
    .select("id, language, code, score, comment, submitted_at")
    .eq("user_id", user.id).eq("week_iso", week).maybeSingle();

  // leaderboard
  const { data: top } = await admin.from("challenge_submissions")
    .select("user_id, score, language, submitted_at, profiles!challenge_submissions_user_id_fkey(username, display_name)")
    .eq("week_iso", week)
    .not("score", "is", null)
    .order("score", { ascending: false })
    .order("submitted_at", { ascending: true })
    .limit(10);

  const lb = ((top ?? []) as any[]).map((r: any, i: number) => ({
    rank: i + 1,
    name: r.profiles?.display_name || r.profiles?.username || `user-${r.user_id.slice(0, 6)}`,
    score: r.score,
    language: r.language,
  }));

  return NextResponse.json({ ok: true, week, problem, mine, leaderboard: lb });
}

/**
 * POST /api/me/challenge — 提交 code、AI 評分
 */
export async function POST(req: NextRequest) {
  try {
    return await submit(req);
  } catch (e: any) {
    console.error("[me/challenge] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

async function submit(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // AI gate（challenge 評分用 AI、free 月 3 次）
  const { requireAiAction } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "challenge");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const language = ["python", "javascript", "typescript", "go", "rust", "java", "cpp"].includes(body.language) ? body.language : "python";
  const code = String(body.code ?? "").trim();
  if (!code || code.length < 20) return NextResponse.json({ error: "code 太短、至少 20 字" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const week = currentWeekISO();

  // 拿本週題目
  const seed = Math.abs(week.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const { count: total } = await admin.from("leetcode_problems")
    .select("id", { count: "exact", head: true }).eq("difficulty", "medium").eq("active", true).eq("is_premium", false);
  const offset = total ? (seed % total) : 0;
  const { data: problem } = await admin.from("leetcode_problems")
    .select("id, number, title, difficulty, tags, url")
    .eq("difficulty", "medium").eq("active", true).eq("is_premium", false)
    .order("number", { ascending: true })
    .range(offset, offset)
    .maybeSingle();

  if (!problem) return NextResponse.json({ error: "no_problem" }, { status: 503 });

  // AI 評分
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);

  let score = 50;
  let comment = "（AI 不可用、預設 50 分）";

  if (apiKey) {
    try {
      const prompt = `你是雪鑰、AI 島週賽評審。學員提交一段 ${language} code 解 LeetCode 題目。

# 題目
${(problem as any).title} (#${(problem as any).number})、難度: ${(problem as any).difficulty}
網址: ${(problem as any).url}
標籤: ${((problem as any).tags ?? []).join(", ")}

# 學員 code
\`\`\`${language}
${code.slice(0, 2000)}
\`\`\`

# 評分標準
- 0-30: 完全沒解 / 思路錯
- 30-50: 部分對、有明顯 bug 或漏 case
- 50-70: 基本對、但時間 / 空間複雜度可優化
- 70-85: 解法正確 + 效率好、命名 / 註解可加強
- 85-95: 解法漂亮 + 邊界處理完整
- 95-100: 教科書級 / 最優解

# 輸出（嚴格 JSON、無 markdown）
{ "score": 0-100 整數, "comment": "60-100 字、繁中口語、講優點 + 改進建議" }`;

      const r = await callAI({
        provider, model: modelName, apiKey,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 400,
      });
      const text = r.text.trim();
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (typeof parsed.score === "number") score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        if (typeof parsed.comment === "string") comment = parsed.comment.slice(0, 500);
      }
    } catch (e: any) {
      comment = `AI fail: ${e?.message?.slice(0, 100)}`;
    }
  }

  const { data: saved, error: upErr } = await admin.from("challenge_submissions").upsert({
    user_id: user.id,
    week_iso: week,
    problem_id: (problem as any).id,
    language,
    code,
    score,
    comment,
  }, { onConflict: "user_id,week_iso" }).select("*").single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, submission: saved, score, comment, ai: !!apiKey });
}
