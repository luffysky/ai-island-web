import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// 防禦式解析：從模型回覆抓第一段 {...} 當 JSON
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

function clampText(s: any, max: number): string {
  const t = String(s ?? "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

const SYSTEM_PROMPT = `你是繁體中文的資深程式與寫作助教，協助老師評閱學員的作業提交。
你會拿到「作業題目說明」和「學員的作答內容」（可能是程式碼或文字）。
請客觀評估作答，給出建議分數與具體回饋。**這只是給老師參考的初稿、老師會再修改，不是最終成績。**

**只回傳一個嚴格 JSON 物件、不要任何額外說明、不要 markdown code fence。**
JSON 結構如下：
{
  "scoreSuggestion": <0 到滿分之間的整數建議分數>,
  "strengths": ["這份作答做得好的地方（1 到 4 點、繁中、具體）"],
  "issues": ["需要改進或有錯誤的地方（1 到 4 點、繁中、具體、可指出程式碼問題）"],
  "suggestedComment": "給學員的一段整體回饋（繁中、鼓勵但誠實、100 到 300 字、可用 markdown）"
}
規則：scoreSuggestion 必須是介於 0 與滿分之間的整數；忠於作答內容、不要杜撰；用鼓勵而具體的語氣。`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["owner", "admin", "teacher", "assistant"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 限流：每位老師每分鐘 15 次 AI 評分
  const rl = rateLimit(`teacher-ai-grade:${user.id}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data: sub, error } = await admin
    .from("submissions")
    .select(`
      id, content_md, attachments,
      assignment:assignments!submissions_assignment_id_fkey(title, description_md, max_score)
    `)
    .eq("id", id)
    .single();

  if (error || !sub) {
    return NextResponse.json({ error: "not_found", message: "找不到這筆提交" }, { status: 404 });
  }

  const assignment = Array.isArray((sub as any).assignment)
    ? (sub as any).assignment[0]
    : (sub as any).assignment;
  const maxScore = Number(assignment?.max_score ?? 100);
  const answer = clampText((sub as any).content_md, 8000);

  if (!answer) {
    return NextResponse.json({ error: "empty", message: "這筆提交沒有可評估的內容" }, { status: 422 });
  }

  // 附件（若有）補進 context，純文字化避免爆量
  let attachmentNote = "";
  try {
    const att = (sub as any).attachments;
    if (att && (Array.isArray(att) ? att.length : Object.keys(att).length)) {
      attachmentNote = `\n\n附件（僅供參考）：${clampText(JSON.stringify(att), 1000)}`;
    }
  } catch { /* ignore */ }

  const userPrompt = [
    `作業題目：${assignment?.title || "（未命名作業）"}`,
    `滿分：${maxScore}`,
    assignment?.description_md ? `題目說明：\n${clampText(assignment.description_md, 3000)}` : "",
    `學員作答內容（可能是程式碼或文字、可能已截斷）：\n${answer}${attachmentNote}`,
  ].filter(Boolean).join("\n\n");

  try {
    const { text, model, fellBack } = await completeForUsage("admin_assistant", {
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1500,
      temperature: 0.4,
    });

    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "parse_failed", message: "AI 回覆格式無法解析、請再試一次" },
        { status: 502 },
      );
    }

    let score = Math.round(Number(parsed.scoreSuggestion));
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(maxScore, score));

    const toList = (v: any, n: number) =>
      Array.isArray(v)
        ? v.map((x: any) => clampText(x, 300)).filter(Boolean).slice(0, n)
        : [];

    return NextResponse.json({
      ok: true,
      scoreSuggestion: score,
      maxScore,
      strengths: toList(parsed.strengths, 4),
      issues: toList(parsed.issues, 4),
      suggestedComment: clampText(parsed.suggestedComment, 2000),
      _meta: { model, fellBack },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_failed", message: e?.message ?? "AI 評分失敗、請稍後再試" },
      { status: 500 },
    );
  }
}
